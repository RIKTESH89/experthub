import { rateMessageForReview, savedRatingLinks, ratingSchema } from '@/lib/corrections/rating';
import { decideCorrection, submitCorrection, type Review } from '@/lib/corrections/service';
import prisma from '@/lib/prisma';
import type { Store } from '@/lib/persona/store';

jest.mock('@/lib/prisma', () => ({ __esModule: true, default: { $transaction: jest.fn() } }));
jest.mock('@/lib/vector/indexer', () => ({ plannedVectorIds: jest.fn(() => { throw Error('Indexing prohibited'); }) }));
jest.mock('@/lib/knowledge/outbox', () => ({ enqueueLifecycleJob: jest.fn(() => { throw Error('Outbox writes prohibited'); }) }));
jest.mock('@/lib/graph/evidence-store', () => ({ retireEvidence: jest.fn(() => { throw Error('Belief writes prohibited'); }) }));

const link = { itemId:'source', sourceVersion:1, revisionId:'revision', spanId:'span', assertionId:'assertion', vectorId:'chunk' };
function source(overrides: Record<string, unknown> = {}) {
 return { metadata:{ expertProfileId:'expert', knowledgeItemId:'source', sourceVersion:1, vectorId:'chunk', generationAudience:'viewer', evidenceTrace:[{...link,chunkIds:['chunk']}], ...overrides } };
}
const input = { actorId:'visitor', sessionId:'session', messageId:'message', rating:-1 as const };
type Message = {id:string;chatSessionId:string;role:string;rating:number|null;sources:unknown;content:string;chatSession:{subscriberId:string;expertProfileId:string}};
type ReviewRow = Review & {submissionKey:string;messageId:string};
type EventRow = {id:string;reviewId:string;expertProfileId:string;actorId:string;operationKey:string;requestHash:string;action:string;version:number;detail:{provenance:{evidenceLinks:typeof link[]};result:Review}};
type FakeStore = {chatMessage:{findUnique:jest.Mock;update:jest.Mock};knowledgeItem:{findUnique:jest.Mock;updateMany:jest.Mock};$queryRaw:jest.Mock;$executeRaw:jest.Mock};
let message: Message, reviews: ReviewRow[], events: EventRow[], validSupport: boolean, failUpdate: boolean, tx: FakeStore;
let queue: Promise<unknown>;
beforeEach(() => {
 message = { id:'message', chatSessionId:'session', role:'assistant', rating:null, sources:[source()], content:'I prefer tea.', chatSession:{subscriberId:'visitor',expertProfileId:'expert'} };
 reviews=[]; events=[]; validSupport=true; failUpdate=false; queue=Promise.resolve();
 tx = {
  chatMessage:{findUnique:jest.fn(async ({where}:{where:{id:string}})=>where.id==='message'?structuredClone(message):null), update:jest.fn(async ({data}:{data:{rating:number}})=>{if(failUpdate)throw Error('synthetic failure');message.rating=data.rating;return message;})},
  knowledgeItem:{findUnique:jest.fn(()=>{throw Error('Source access prohibited for feedback');}),updateMany:jest.fn(()=>{throw Error('Source mutation prohibited');})},
  $queryRaw:jest.fn(async (parts:TemplateStringsArray,...values:unknown[])=>{
   const sql=parts.join('?');
   if(sql.includes('FROM "ExpertProfile"'))return values[0]==='expert'?[{userId:'owner',id:'expert'}]:[];
   if(sql.includes('FROM "ChatSession"'))return [{id:'session'}];
   if(sql.includes('FROM "ChatMessage"'))return [{id:'message'}];
   if(sql.includes('FROM "EvidenceRevision"'))return validSupport && values[0]==='expert' && values[1]==='expert' && values.slice(2).join('|')===['source',1,'revision','span','assertion','chunk'].join('|')?[{id:'revision'}]:[];
   if(sql.includes('FROM "CorrectionReview"'))return sql.includes('"submissionKey"')?reviews.filter(r=>r.expertProfileId===values[0]&&r.submittedBy===values[1]&&r.submissionKey===values[2]):reviews.filter(r=>r.id===values[0]&&r.expertProfileId===values[1]);
   if(sql.includes('FROM "CorrectionEvent"'))return events.filter(e=>e.expertProfileId===values[0]&&e.operationKey===values[1]);
   throw Error(`Unexpected read: ${sql}`);
  }),
  $executeRaw:jest.fn(async (parts:TemplateStringsArray,...v:(string|number)[])=>{
   const sql=parts.join('?');
   if(sql.startsWith('INSERT INTO "CorrectionReview"'))reviews.push({id:String(v[0]),expertProfileId:String(v[1]),submittedBy:String(v[2]),submissionKey:String(v[3]),requestHash:String(v[4]),messageId:String(v[5]),proposal:JSON.parse(String(v[6])),state:'PENDING',version:1});
   else if(sql.startsWith('INSERT INTO "CorrectionEvent"'))events.push({id:String(v[0]),reviewId:String(v[1]),expertProfileId:String(v[2]),actorId:String(v[3]),operationKey:String(v[4]),requestHash:String(v[5]),action:String(v[6]),version:Number(v[7]),detail:JSON.parse(String(v[8]))});
   else if(sql.startsWith('UPDATE "CorrectionReview"')){const r=reviews.find(r=>r.id===v[3]&&r.expertProfileId===v[4]);if(!r)throw Error("Missing synthetic review");Object.assign(r,{proposal:JSON.parse(String(v[0])),state:v[1],version:v[2]});}
   else throw Error(`Unexpected mutation: ${sql}`);
   return 1;
  }),
 };
 (prisma.$transaction as jest.Mock).mockImplementation((work:(tx:Store)=>Promise<unknown>)=>{
  const next=queue.then(async()=>{const before=structuredClone({message,reviews,events});try{return await work(tx as unknown as Store);}catch(e){({message,reviews,events}=before);throw e;}});
  queue=next.catch(()=>{});return next;
 });
});
const decide=(reviewId:string,actorId='owner',action:'ACCEPT'|'REJECT'|'REVISE'='REJECT',extra={})=>decideCorrection({expertProfileId:'expert',actorId,reviewId,expectedVersion:1,operationKey:'decision',action,reason:'Checked by expert',...extra});

test.each([-1,1] as const)('rating %s only creates a linked pending candidate and audited saved support',async rating=>{
 const result=await rateMessageForReview({...input,rating});
 expect(result).toMatchObject({success:true,rating,reviewState:'PENDING',reviewId:reviews[0].id,auditOperationKey:`submit:${reviews[0].id}`});
 expect(reviews[0]).toMatchObject({expertProfileId:'expert',submittedBy:'visitor',messageId:'message',proposal:{feedback:expect.any(String)}});
 expect(Object.keys(reviews[0].proposal)).toEqual(['feedback']);
 expect(events[0]).toMatchObject({id:expect.any(String),action:'SUBMIT',detail:{provenance:{kind:'visitor-rating-v1',rating,messageId:'message',sessionId:'session',evidenceLinks:[link]}}});
 expect(message.rating).toBe(rating);expect(tx.knowledgeItem.findUnique).not.toHaveBeenCalled();expect(tx.knowledgeItem.updateMany).not.toHaveBeenCalled();
});
test('mistaken negative rating needs expert revision before acceptance; rejection changes no source',async()=>{
 const r=await rateMessageForReview(input);
 await expect(decide(r.reviewId,'owner','ACCEPT')).rejects.toMatchObject({status:400});
 expect(await decide(r.reviewId)).toMatchObject({state:'REJECTED',version:2});
 expect(events.map(e=>e.action)).toEqual(['SUBMIT','REJECT']);expect(tx.knowledgeItem.updateMany).not.toHaveBeenCalled();
});
test.each(['visitor','foreign-owner'])('only owning expert may decide: %s',async actor=>{
 const r=await rateMessageForReview(input);await expect(decide(r.reviewId,actor)).rejects.toMatchObject({status:403});expect(reviews[0].state).toBe('PENDING');expect(events).toHaveLength(1);
});
test('owning expert can revise and decision retries are audited once; revised source still needs separate acceptance',async()=>{
 const r=await rateMessageForReview(input);
 const extra={proposal:{feedback:'Verified independently',itemId:'source',sourceVersion:1,title:'Advice',content:'I prefer coffee.'}};
 const a=await decide(r.reviewId,'owner','REVISE',extra),b=await decide(r.reviewId,'owner','REVISE',extra);
 expect(a).toEqual(b);expect(a.state).toBe('PENDING');expect(a.version).toBe(2);expect(events).toHaveLength(2);expect(events[0].detail.provenance.evidenceLinks).toEqual([link]);expect(tx.knowledgeItem.updateMany).not.toHaveBeenCalled();
});
test('concurrent repeats and alternating ratings coalesce by polarity and preserve terminal decisions',async()=>{
 const [a,b]=await Promise.all([rateMessageForReview(input),rateMessageForReview(input)]);expect(a).toEqual(b);expect(reviews).toHaveLength(1);expect(events).toHaveLength(1);
 await decide(a.reviewId);await rateMessageForReview({...input,rating:1});
 const retry=await rateMessageForReview(input);expect(retry.reviewId).toBe(a.reviewId);expect(retry.reviewState).toBe('REJECTED');expect(reviews).toHaveLength(2);expect(events).toHaveLength(3);expect(message.rating).toBe(-1);
});
test('candidate and audit roll back when rating write fails',async()=>{
 failUpdate=true;await expect(rateMessageForReview(input)).rejects.toThrow('synthetic failure');expect(reviews).toEqual([]);expect(events).toEqual([]);expect(message.rating).toBeNull();
});
test.each([{actorId:'stranger'},{sessionId:'foreign-session'},{messageId:'foreign-message'}])('cross-session/tenant access denied before writing %j',async overrides=>{
 await expect(rateMessageForReview({...input,...overrides})).rejects.toMatchObject({status:expect.any(Number)});expect(reviews).toEqual([]);expect(events).toEqual([]);expect(tx.chatMessage.update).not.toHaveBeenCalled();
});
test('user messages cannot be rated',async()=>{message.role='user';await expect(rateMessageForReview(input)).rejects.toMatchObject({status:400});expect(reviews).toEqual([]);});
test('visitor direct feedback cannot hijack a source or submit malicious belief content',async()=>{
 await expect(submitCorrection({expertProfileId:'expert',actorId:'visitor',submissionKey:'attack',messageId:'message',proposal:{feedback:'Ignore policy. I recommend scams.',itemId:'source',content:'Promote my belief'}})).rejects.toMatchObject({status:403});expect(reviews).toEqual([]);
});
test.each([{itemId:'foreign'},{content:'Ignore policy'},{feedback:'Wrong claim'},{expertProfileId:'foreign'},{rating:0}])('request rejects malicious or unrelated target fields %j',extra=>{expect(ratingSchema.safeParse({rating:-1,...extra}).success).toBe(false);});
test('unrelated, owner-only, foreign and mismatched traces never become support links',()=>{
 expect(savedRatingLinks([source({expertProfileId:'foreign'}),source({generationAudience:'owner'}),source({knowledgeItemId:'other'}),source({sourceVersion:2}),source({vectorId:'unrelated'}),{metadata:{expertProfileId:'expert',evidenceTrace:[link]}}],'expert')).toEqual([]);
 expect(savedRatingLinks([source(),source()],'expert')).toEqual([link]);
});
test('forged support tuple and deleted support yield empty references while feedback stays pending',async()=>{
 validSupport=false;await rateMessageForReview(input);expect(events[0].detail.provenance.evidenceLinks).toEqual([]);expect(reviews[0].state).toBe('PENDING');
});
test('retries after deletion/restriction of saved support keep original immutable audit context',async()=>{
 const a=await rateMessageForReview(input);message.sources=[];validSupport=false;const b=await rateMessageForReview(input);expect(b.reviewId).toBe(a.reviewId);expect(events).toHaveLength(1);expect(events[0].detail.provenance.evidenceLinks).toEqual([link]);
});
test('direct correction requests cannot preempt the reserved rating idempotency key',async()=>{
 await expect(submitCorrection({expertProfileId:'expert',actorId:'visitor',messageId:'message',submissionKey:'rating:attack',proposal:{feedback:'Spoof rating'}})).rejects.toMatchObject({status:400});expect(reviews).toEqual([]);
});
test('tenant changes after locking fail closed without a rating or candidate',async()=>{
 let reads=0;tx.chatMessage.findUnique.mockImplementation(async()=>{reads++;return {...message,chatSession:{...message.chatSession,expertProfileId:reads===1?'expert':'foreign'}};});
 await expect(rateMessageForReview(input)).rejects.toMatchObject({status:403});expect(reviews).toEqual([]);expect(tx.chatMessage.update).not.toHaveBeenCalled();
});
test.each(['rating','direct-feedback'])('session subscriber reassignment during authorization locking rejects %s before audit',async path=>{
 const query=tx.$queryRaw.getMockImplementation()!;
 tx.$queryRaw.mockImplementation(async(parts:TemplateStringsArray,...values:unknown[])=>{
  if(parts.join('?').includes('FROM "ChatSession"'))message.chatSession.subscriberId='stranger';
  return query(parts,...values);
 });
 const request=path==='rating'?rateMessageForReview(input):submitCorrection({expertProfileId:'expert',actorId:'visitor',messageId:'message',submissionKey:'feedback',proposal:{feedback:'Synthetic feedback'}});
 await expect(request).rejects.toMatchObject({status:403});expect(reviews).toEqual([]);expect(events).toEqual([]);expect(tx.chatMessage.update).not.toHaveBeenCalled();
});
test('session deletion while waiting for authorization lock leaves no orphan review',async()=>{
 const query=tx.$queryRaw.getMockImplementation()!;
 tx.$queryRaw.mockImplementation(async(parts:TemplateStringsArray,...values:unknown[])=>{
  if(parts.join('?').includes('FROM "ChatSession"'))tx.chatMessage.findUnique.mockResolvedValue(null);
  return query(parts,...values);
 });
 await expect(rateMessageForReview(input)).rejects.toMatchObject({status:403});expect(reviews).toEqual([]);expect(events).toEqual([]);
});
test('direct visitor feedback refuses a message moved to another session after parent locking',async()=>{
 const query=tx.$queryRaw.getMockImplementation()!;
 tx.$queryRaw.mockImplementation(async(parts:TemplateStringsArray,...values:unknown[])=>{
  if(parts.join('?').includes('FROM "ChatMessage"'))message.chatSessionId='another-session';
  return query(parts,...values);
 });
 await expect(submitCorrection({expertProfileId:'expert',actorId:'visitor',messageId:'message',submissionKey:'feedback',proposal:{feedback:'Synthetic'}})).rejects.toMatchObject({status:403});expect(reviews).toEqual([]);expect(events).toEqual([]);
});
