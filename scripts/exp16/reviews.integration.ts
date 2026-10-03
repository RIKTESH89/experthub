import prisma from "@/lib/prisma";
import { submitCorrection, decideCorrection } from "@/lib/corrections/service";
import { releasePersona, currentSourcePins } from "@/lib/persona/store";
import { publishEvidence } from "@/lib/graph/evidence-store";
import { manifestHash, scopeForRelease, canonical } from "@/lib/persona/manifest";
// Providers are prohibited. Planned IDs alone remain the real deterministic implementation.
jest.mock("@/lib/vector/embeddings",()=>({EMBEDDING_MODEL:"synthetic",generateEmbedding:()=>{throw Error("Provider prohibited");}}));
const expertProfileId="exp16-expert", actorId="exp16-owner";
const base={expertProfileId,actorId};
let sequence=0;
const key=()=>`op-${++sequence}`;
async function source(id="source") {
 return prisma.knowledgeItem.create({data:{id,expertProfileId,title:"Advice",content:"I prefer tea.",sourceType:"manual",sourceVersion:1,indexedVersion:1,isIndexed:true,vectorIds:[`${expertProfileId}:${id}:v1:chunk_0`],metadata:{authorId:actorId,audience:"public"}},include:{expertProfile:true}});
}
async function publish(id="source") { await prisma.$transaction(async tx=>{const item=await tx.knowledgeItem.findUniqueOrThrow({where:{id}});await publishEvidence(tx,item,actorId);}); }
async function submit(id="source") {return submitCorrection({...base,submissionKey:key(),proposal:{feedback:"Correct this",itemId:id,sourceVersion:1,title:"Advice",content:"I prefer coffee."}});}
async function accept(review:any,overrides={}) {return decideCorrection({...base,reviewId:review.id,expectedVersion:review.version,operationKey:key(),action:"ACCEPT",reason:"Expert reviewed",...overrides});}
beforeAll(async()=>{
 await prisma.user.create({data:{id:actorId,email:"exp16-owner@example.test",name:"Synthetic Owner",role:"EXPERT"}});
 await prisma.user.create({data:{id:"exp16-visitor",email:"exp16-visitor@example.test",name:"Synthetic Visitor",role:"SUBSCRIBER"}});
 await prisma.expertProfile.create({data:{id:expertProfileId,userId:actorId,displayName:"Synthetic Expert",specialty:[],vectorNamespace:"exp16-synthetic"}});
});
beforeEach(async()=>{
 await prisma.$executeRaw`DELETE FROM "PersonaReleaseHead" WHERE "expertProfileId"=${expertProfileId}`;
 await prisma.$executeRaw`DELETE FROM "PersonaRelease" WHERE "expertProfileId"=${expertProfileId}`;
 await prisma.$executeRaw`DELETE FROM "CorrectionReview" WHERE "expertProfileId"=${expertProfileId}`;
 await prisma.knowledgeLifecycleJob.deleteMany({where:{expertProfileId}});
 await prisma.knowledgeItem.deleteMany({where:{expertProfileId}});
 await prisma.$executeRaw`DELETE FROM "EvidenceRevision" WHERE "expertProfileId"=${expertProfileId}`;
 await source();await publish();
});
afterAll(async()=>{await prisma.user.deleteMany({where:{id:{in:[actorId,"exp16-visitor"]}}});await prisma.$disconnect();});
test("stable hash sorts keys and live scope intersection never grants historical permission",async()=>{
 expect(manifestHash({b:1,a:2})).toBe(manifestHash({a:2,b:1}));
 const release=await releasePersona({...base,operationKey:key(),expectedHead:null});
 const pins=await currentSourcePins(prisma,expertProfileId);
 const scope={expertProfileId,namespace:"exp16-synthetic",isOwner:false,allowedVectorIds:[]};
 expect(scopeForRelease(scope,release.manifest,pins).allowedVectorIds).toEqual([]);
 const allowed={...scope,allowedVectorIds:pins[0].vectorIds};
 expect(scopeForRelease(allowed,release.manifest,pins).allowedVectorIds).toEqual(pins[0].vectorIds);
 expect(scopeForRelease(allowed,release.manifest,[]).allowedVectorIds).toEqual([]);
 expect(scopeForRelease({...allowed,expertProfileId:"foreign"},release.manifest,pins).allowedVectorIds).toEqual([]);
});
test("accept atomically retires evidence and queues only changed source; concurrent retry is idempotent",async()=>{
 await source("other");await publish("other");const review=await submit();
 const input={...base,reviewId:review.id,expectedVersion:1,operationKey:key(),action:"ACCEPT" as const,reason:"Verified"};
 const results=await Promise.all([decideCorrection(input),decideCorrection(input)]);
 expect(results[0]).toEqual(results[1]);
 expect(await prisma.knowledgeItem.findUnique({where:{id:"source"}})).toMatchObject({sourceVersion:2,isIndexed:false,content:"I prefer coffee."});
 expect(await prisma.knowledgeItem.findUnique({where:{id:"other"}})).toMatchObject({sourceVersion:1,isIndexed:true});
 expect(await prisma.knowledgeLifecycleJob.count({where:{expertProfileId}})).toBe(1);
 expect(await prisma.$queryRaw`SELECT "id" FROM "EvidenceRevision" WHERE "itemId"='source' AND "retiredAt" IS NULL`).toEqual([]);
 expect(await prisma.$queryRaw`SELECT "id" FROM "EvidenceRevision" WHERE "itemId"='other' AND "retiredAt" IS NULL`).toHaveLength(1);
 await expect(decideCorrection({...input,reason:"changed"})).rejects.toMatchObject({status:409});
});
test("competing owner decisions yield exactly one terminal result",async()=>{
 const review=await submit();const results=await Promise.allSettled([accept(review),decideCorrection({...base,reviewId:review.id,expectedVersion:1,operationKey:key(),action:"REJECT",reason:"Rejected"})]);
 expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
 expect(results.filter(r=>r.status==="rejected")).toHaveLength(1);
});
test("source CAS prevents stale correction after edit and after deletion",async()=>{
 const review=await submit();await prisma.knowledgeItem.update({where:{id:"source"},data:{sourceVersion:2}});
 await expect(accept(review)).rejects.toMatchObject({status:409});
 await prisma.knowledgeItem.delete({where:{id:"source"}});
 await expect(accept(review)).rejects.toMatchObject({status:409});
 expect(await prisma.knowledgeLifecycleJob.count({where:{expertProfileId}})).toBe(0);
});
test("visitor feedback cannot modify beliefs, targets, or somebody else's chat",async()=>{
 const chat=await prisma.chatSession.create({data:{subscriberId:"exp16-visitor",expertProfileId}});
 const message=await prisma.chatMessage.create({data:{chatSessionId:chat.id,role:"assistant",content:"Synthetic response"}});
 const input={expertProfileId,actorId:"exp16-visitor",submissionKey:key(),messageId:message.id,proposal:{feedback:"I disagree"}};
 const review=await submitCorrection(input);expect(review.state).toBe("PENDING");
 expect(await prisma.knowledgeItem.findUnique({where:{id:"source"}})).toMatchObject({sourceVersion:1,content:"I prefer tea."});
 await expect(submitCorrection({...input,submissionKey:key(),proposal:{feedback:"Hijack",itemId:"source"}})).rejects.toMatchObject({status:403});
 await expect(accept(review,{actorId:"exp16-visitor"})).rejects.toMatchObject({status:403});
 await expect(submitCorrection({...input,actorId:"stranger",submissionKey:key()})).rejects.toMatchObject({status:403});
 await expect(accept(review)).rejects.toMatchObject({status:400});
 const revised=await decideCorrection({...base,reviewId:review.id,expectedVersion:1,operationKey:key(),action:"REVISE",reason:"Source-backed correction",proposal:{feedback:"Expert verified",itemId:"source",sourceVersion:1,title:"Advice",content:"I prefer coffee."}});
 expect(revised.version).toBe(2);expect((await accept(revised)).state).toBe("ACCEPTED");
});
test("submission retry and reject are audited without source mutation",async()=>{
 const input={...base,submissionKey:key(),proposal:{feedback:"review"}};
 const [a,b]=await Promise.all([submitCorrection(input),submitCorrection(input)]);expect(a).toEqual(b);
 await expect(submitCorrection({...input,proposal:{feedback:"changed"}})).rejects.toMatchObject({status:409});
 await decideCorrection({...base,reviewId:a.id,expectedVersion:1,operationKey:key(),action:"REJECT",reason:"Unsupported"});
 expect(await prisma.$queryRaw`SELECT "action" FROM "CorrectionEvent" WHERE "reviewId"=${a.id} ORDER BY "version"`).toEqual([{action:"SUBMIT"},{action:"REJECT"}]);
 expect(await prisma.knowledgeItem.findUnique({where:{id:"source"}})).toMatchObject({sourceVersion:1});
});
test("rollback restores config as a new audited release without changing sources",async()=>{
 const a=await releasePersona({...base,operationKey:key(),expectedHead:null});
 await prisma.expertProfile.update({where:{id:expertProfileId},data:{twinOpinions:"Synthetic changed"}});
 const b=await releasePersona({...base,operationKey:key(),expectedHead:a.id});
 const input={...base,operationKey:key(),expectedHead:b.id,rollbackTo:a.id};
 const [c,d]=await Promise.all([releasePersona(input),releasePersona(input)]);expect(c).toEqual(d);
 expect(c.manifest.config).toEqual(a.manifest.config);expect(c.manifest.rollbackOf).toBe(a.id);
 expect(c.manifest.sources).toEqual(a.manifest.sources);expect(c.id).not.toBe(a.id);
 await expect(releasePersona({...base,operationKey:key(),expectedHead:b.id})).rejects.toMatchObject({status:409});
});
test.each(["delete","restrict","edit","retire"])("rollback fails closed after %s",async change=>{
 const a=await releasePersona({...base,operationKey:key(),expectedHead:null});
 if(change==="delete")await prisma.knowledgeItem.delete({where:{id:"source"}});
 if(change==="restrict")await prisma.knowledgeItem.update({where:{id:"source"},data:{metadata:{authorId:actorId,audience:"private"}}});
 if(change==="edit")await prisma.knowledgeItem.update({where:{id:"source"},data:{sourceVersion:2,content:"Changed"}});
 if(change==="retire")await prisma.$executeRaw`UPDATE "EvidenceRevision" SET "retiredAt"=CURRENT_TIMESTAMP WHERE "itemId"='source'`;
 await expect(releasePersona({...base,operationKey:key(),expectedHead:a.id,rollbackTo:a.id})).rejects.toMatchObject({status:409});
});
test("foreign owner cannot release and pending/unsupported source cannot publish",async()=>{
 await expect(releasePersona({...base,actorId:"exp16-visitor",operationKey:key(),expectedHead:null})).rejects.toMatchObject({status:403});
 await prisma.knowledgeItem.update({where:{id:"source"},data:{isIndexed:false}});
 await expect(releasePersona({...base,operationKey:key(),expectedHead:null})).rejects.toMatchObject({status:409});
});
test("release and correction events reject in-place updates",async()=>{
 const review=await submit();const a=await releasePersona({...base,operationKey:key(),expectedHead:null});
 await expect(prisma.$executeRaw`UPDATE "PersonaRelease" SET "manifestHash"='bad' WHERE "id"=${a.id}`).rejects.toThrow("append-only");
 await expect(prisma.$executeRaw`UPDATE "CorrectionEvent" SET "action"='REJECT' WHERE "reviewId"=${review.id}`).rejects.toThrow("append-only");
 expect(canonical(a.manifest)).toContain("persona-release-v1");
});
test("concurrent releases cannot both replace the same expected head",async()=>{
 const results=await Promise.allSettled([releasePersona({...base,operationKey:key(),expectedHead:null}),releasePersona({...base,operationKey:key(),expectedHead:null})]);
 expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
 expect(results.filter(r=>r.status==="rejected")).toHaveLength(1);
});
test("unsupported imported sources block a reproducibility claim",async()=>{
 await prisma.knowledgeItem.create({data:{id:"unsupported",expertProfileId,title:"Imported",content:"Synthetic",sourceType:"document",isIndexed:true,sourceVersion:1,indexedVersion:1,vectorIds:[]}});
 await expect(releasePersona({...base,operationKey:key(),expectedHead:null})).rejects.toMatchObject({status:409});
});
test("rollback restores personality profile and records actual persona prompts",async()=>{
 await prisma.expertProfile.update({where:{id:expertProfileId},data:{personalityProfile:{tone:"Synthetic warm"}}});
 const a=await releasePersona({...base,operationKey:key(),expectedHead:null});
 expect(a.manifest.renderedPersona.owner).toContain("Synthetic warm");expect(a.manifest.renderedPersona.visitor).not.toContain("Synthetic warm");
 await prisma.expertProfile.update({where:{id:expertProfileId},data:{personalityProfile:{tone:"Synthetic formal"}}});
 const b=await releasePersona({...base,operationKey:key(),expectedHead:a.id,rollbackTo:a.id});
 expect(b.manifest.config.personalityProfile).toEqual({tone:"Synthetic warm"});
 expect((await prisma.expertProfile.findUniqueOrThrow({where:{id:expertProfileId}})).personalityProfile).toEqual({tone:"Synthetic warm"});
});
test("additive DDL rollback leaves base sources and evidence intact",async()=>{
 await prisma.$transaction(async tx=>{
  const before=await tx.knowledgeItem.count({where:{expertProfileId}});
  await tx.$executeRawUnsafe('DROP TABLE "PersonaReleaseHead", "PersonaRelease", "CorrectionEvent", "CorrectionReview"');
  await tx.$executeRawUnsafe('DROP FUNCTION exp16_append_only()');
  expect(await tx.knowledgeItem.count({where:{expertProfileId}})).toBe(before);
  expect(await currentSourcePins(tx,expertProfileId)).toHaveLength(1);
  throw new Error("INTENTIONAL_EXP16_ROLLBACK");
 }).catch(e=>{if(e.message!=="INTENTIONAL_EXP16_ROLLBACK")throw e;});
 expect(await submit()).toMatchObject({state:"PENDING"});
});
