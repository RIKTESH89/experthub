const transaction=jest.fn(), retire=jest.fn(), enqueue=jest.fn();
jest.mock("@/lib/prisma",()=>({__esModule:true,default:{$transaction:transaction}}));
jest.mock("@/lib/graph/evidence-store",()=>({retireEvidence:retire}));
jest.mock("@/lib/knowledge/outbox",()=>({enqueueLifecycleJob:enqueue}));
jest.mock("@/lib/vector/indexer",()=>({plannedVectorIds:()=>["next-vector"]}));
import { decideCorrection } from "@/lib/corrections/service";
let tx:any, item:any, post:any, review:any, events:any[];
const input={expertProfileId:"expert",actorId:"owner",reviewId:"review",expectedVersion:1,operationKey:"accept",action:"ACCEPT" as const,reason:"Expert checked"};
beforeEach(()=>{
 item={id:"item",expertProfileId:"expert",sourceType:"post",sourceId:"post",sourceVersion:1,title:"Advice",content:"Old statement",metadata:{status:"PUBLISHED"},expertProfile:{vectorNamespace:"ns"}};
 post={id:"post",authorId:"owner",title:item.title,content:item.content,isRagEnabled:true,status:"PUBLISHED",isPremiumOnly:true,isHidden:false};
 review={id:"review",expertProfileId:"expert",submittedBy:"owner",state:"PENDING",version:1,proposal:{feedback:"Corrected",itemId:"item",sourceVersion:1,title:"Advice",content:"Approved statement"}};events=[];
 tx={$queryRaw:jest.fn(async(parts:TemplateStringsArray)=>{const sql=parts.join("?");if(sql.includes('SELECT "userId"'))return [{userId:"owner"}];if(sql.includes('FROM "CorrectionEvent"'))return events;if(sql.includes('FROM "CorrectionReview"'))return [review];return [];}),$executeRaw:jest.fn(async(parts:TemplateStringsArray,...v:any[])=>{if(parts.join('').startsWith('INSERT INTO "CorrectionEvent"'))events.push({requestHash:v[5],detail:JSON.parse(v[8])});return 1;}),knowledgeItem:{findUnique:jest.fn(async()=>item),updateMany:jest.fn(async()=>({count:1}))},post:{findUnique:jest.fn(async()=>post),update:jest.fn(async()=>post)}};
 transaction.mockImplementation(async(fn:any)=>fn(tx));
});
test("expert acceptance updates authoritative post and projection, retires evidence and records provenance",async()=>{
 expect(await decideCorrection(input)).toMatchObject({state:"ACCEPTED",version:2});
 expect(tx.post.update).toHaveBeenCalledWith({where:{id:"post"},data:{title:"Advice",content:"Approved statement"}});
 expect(tx.knowledgeItem.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:{id:"item",expertProfileId:"expert",sourceVersion:1},data:expect.objectContaining({sourceVersion:{increment:1},isIndexed:false})}));
 expect(retire).toHaveBeenCalledWith(tx,"expert","item");expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({kind:"INDEX",sourceVersion:2,itemId:"item"}),tx);
 expect(events[0].detail.sourceChange).toMatchObject({sourceType:"post",sourceId:"post",before:{content:"Old statement",metadata:{status:"PUBLISHED"}}});
 await decideCorrection(input);expect(tx.post.update).toHaveBeenCalledTimes(1);
});
test.each(["foreign","edited","revoked","stale","import"])("refuses %s source before writes",async mode=>{
 if(mode==="foreign")post.authorId="foreign";
 if(mode==="edited")post.content="Newer unreviewed edit";
 if(mode==="revoked")post.isRagEnabled=false;
 if(mode==="stale")item.sourceVersion=2;
 if(mode==="import")item.sourceType="document";
 await expect(decideCorrection(input)).rejects.toMatchObject({status:409});
 expect(tx.post.update).not.toHaveBeenCalled();expect(tx.knowledgeItem.updateMany).not.toHaveBeenCalled();expect(retire).not.toHaveBeenCalled();expect(enqueue).not.toHaveBeenCalled();
});
