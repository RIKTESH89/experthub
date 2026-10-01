const embed=jest.fn();jest.mock("@/lib/vector/embeddings",()=>({...jest.requireActual("@/lib/vector/embeddings"),generateEmbedding:embed}));
import prisma from "@/lib/prisma";
import {syncPostSource,syncKnowledgeItem,removeKnowledgeItem,removePostSource} from "@/lib/knowledge/lifecycle";
import {rebuildEvidenceSource,retrieveEvidenceTrace} from "@/lib/graph/evidence-store";
import {resolveRetrievalScope,type RetrievalScope} from "@/lib/knowledge/access";
import {runChatEngine} from "@/lib/ai/chat-engine";
const owner="synthetic-exp12-owner",expert="synthetic-exp12",ns="synthetic-exp12-ns";
async function post(id="post",content="I prefer a monolith because operations cost matters.",premium=false){await prisma.post.create({data:{id,authorId:owner,title:"Synthetic",content,status:"PUBLISHED",isRagEnabled:true,isPremiumOnly:premium}});await syncPostSource(id);return prisma.knowledgeItem.findFirstOrThrow({where:{sourceId:id}});}
async function scope(viewer?:string){return resolveRetrievalScope(expert,ns,owner,viewer);}
async function trace(s?:RetrievalScope){s=s||await scope();return retrieveEvidenceTrace(s,s.allowedVectorIds.map(vectorId=>({content:"synthetic",score:1,metadata:{vectorId,expertProfileId:expert}})));}
async function edges(){return prisma.$queryRaw<{id:string;weight:number}[]>`SELECT "id",weight FROM "EvidenceEdge" ORDER BY "id"`;}
beforeEach(async()=>{
 const db=await prisma.$queryRaw<{name:string}[]>`SELECT current_database() AS name`;if(db[0].name!=="experthub_phase0_test")throw Error("Unsafe DB");
 await prisma.$executeRawUnsafe('TRUNCATE "KnowledgeLifecycleJob", "VectorChunk", "User" CASCADE');
 await prisma.user.create({data:{id:owner,email:"exp12@example.invalid",role:"EXPERT",expertProfile:{create:{id:expert,displayName:"Synthetic Ada",specialty:[],vectorNamespace:ns}}}});
 embed.mockReset().mockResolvedValue(Array.from({length:1536},(_,i)=>i===0?1:0));
 global.fetch=async()=>{throw Error("External calls forbidden");};
});
afterAll(async()=>{await prisma.$disconnect();});
test("same revision rebuilt twice has identical revision/assertion/span/edge identities and weight",async()=>{
 const item=await post();const before=await trace();const e=await edges();expect(before).toHaveLength(1);
 await rebuildEvidenceSource(expert,item.id);await rebuildEvidenceSource(expert,item.id);
 expect(await trace()).toEqual(before);expect(await edges()).toEqual(e);expect(e[0].weight).toBe(1);
 expect(await prisma.evidenceRevision.count()).toBe(1);expect(await prisma.evidenceAssertion.count()).toBe(1);
});
test("two supports retract independently; last delete makes assertion unavailable while preserving audit",async()=>{
 const first=await post("first"),second=await post("second");expect((await edges())[0].weight).toBe(2);expect((await trace())[0].weight).toBe(2);
 await removeKnowledgeItem(expert,first.id);expect((await edges())[0].weight).toBe(1);expect(await trace()).toHaveLength(1);
 await removeKnowledgeItem(expert,second.id);expect(await trace()).toEqual([]);expect(await edges()).toEqual([]);
 expect(await prisma.evidenceRevision.count()).toBe(2);expect(await prisma.evidenceSupport.count()).toBe(2);expect(await prisma.evidenceRevision.count({where:{retiredAt:{not:null}}})).toBe(2);
});
test("multiple spans in one revision do not inflate edge/support weights",async()=>{
 await post("post","I prefer services.\nI prefer services.");expect(await trace()).toHaveLength(2);expect((await trace()).map(t=>t.weight)).toEqual([1,1]);expect((await edges())[0].weight).toBe(1);
});
test("post author/uploader and quoted speaker are distinct; quote is not owner endorsement",async()=>{
 await post("quote",'Ben said: "I prefer services."');const [t]=await trace();expect(t).toMatchObject({authorId:owner,uploaderId:owner,speakerId:"quoted:Ben",endorsedByOwner:false,speakerRole:"quoted"});expect(t.text).toBe('Ben said: "I prefer services."');
});
test("manual third-party/unknown attribution remains separate with declared publication basis",async()=>{
 for(const [id,authorId] of ([["third","third-party"],["unknown",null]] as [string,string|null][])){
  await prisma.knowledgeItem.create({data:{id,expertProfileId:expert,title:"Text",content:"I prefer services.",sourceType:"manual",metadata:{audience:"public",...(authorId?{authorId}:{}),publishedAt:"2025-01-01T00:00:00Z"},vectorIds:[]}});await syncKnowledgeItem(expert,id);
 }
 const t=await trace();expect(t.find(t=>t.itemId==="third")).toMatchObject({authorId:"third-party",uploaderId:owner,subject:"third-party",endorsedByOwner:false,publicationTimeBasis:"source-declared"});expect(t.find(t=>t.itemId==="unknown")).toMatchObject({authorId:null,subject:"unknown:unknown-speaker",kind:"unknown",endorsedByOwner:false});
});
test("edit excludes superseded assertions immediately and keeps historical snapshots",async()=>{
 const item=await post();const old=(await trace())[0];const staleScope=await scope();await prisma.post.update({where:{id:"post"},data:{content:"I recommend a reversible trial."}});
 expect(await trace(staleScope)).toEqual([]);await syncPostSource("post");const [current]=await trace();expect(current.predicate).toBe("recommend");expect(current.revisionId).not.toBe(old.revisionId);expect(current.sourceVersion).toBe(2);
 expect((await prisma.evidenceRevision.findUniqueOrThrow({where:{id:old.revisionId}})).retiredAt).not.toBeNull();expect(await prisma.evidenceSpan.count()).toBe(2);expect(await rebuildEvidenceSource("foreign",item.id)).toBeNull();
});
test("premium derivatives never affect public trace or weights; stale entitlement fails closed",async()=>{
 await post("public");await post("paid",undefined,true);expect((await edges())[0].weight).toBe(2);expect((await trace())[0].weight).toBe(1);
 await prisma.user.create({data:{id:"visitor",email:"visitor@example.invalid"}});await prisma.expertSubscription.create({data:{subscriberId:"visitor",expertProfileId:expert,status:"ACTIVE",tier:"PREMIUM",price:0}});
 const entitled=await scope("visitor");expect(await trace(entitled)).toHaveLength(2);await prisma.expertSubscription.update({where:{subscriberId_expertProfileId:{subscriberId:"visitor",expertProfileId:expert}},data:{tier:"STANDARD"}});expect(await trace(entitled)).toHaveLength(1);expect((await trace(entitled))[0].weight).toBe(1);
});
test("unpublish/hide/RAG disable/delete revoke trace even with previously allowed chunk IDs",async()=>{
 await post();const stale=await scope();await prisma.post.update({where:{id:"post"},data:{status:"DRAFT"}});expect(await trace(stale)).toEqual([]);await syncPostSource("post");expect(await trace()).toEqual([]);expect(await trace(await scope(owner))).toHaveLength(1);
 await prisma.post.update({where:{id:"post"},data:{status:"PUBLISHED",isHidden:true}});expect(await trace(stale)).toEqual([]);
 await prisma.post.update({where:{id:"post"},data:{isRagEnabled:false}});await syncPostSource("post");expect(await trace(stale)).toEqual([]);expect(await prisma.evidenceRevision.count()).toBe(2);
 await prisma.post.delete({where:{id:"post"}});await removePostSource("post",owner);expect(await trace()).toEqual([]);
});
test("snapshot immutability, transactional rollback and nullable unknown publication time",async()=>{
 await post();const r=await prisma.evidenceRevision.findFirstOrThrow();expect(r.publishedAt).toBeNull();expect(r.publicationTimeBasis).toBe("unavailable");expect(r.ingestedAt).toBeInstanceOf(Date);
 await expect(prisma.evidenceRevision.update({where:{id:r.id},data:{content:"tamper"}})).rejects.toThrow("immutable");
 await expect(prisma.$transaction(async tx=>{await tx.evidenceRevision.update({where:{id:r.id},data:{retiredAt:new Date()}});throw Error("rollback");})).rejects.toThrow("rollback");expect((await prisma.evidenceRevision.findUniqueOrThrow({where:{id:r.id}})).retiredAt).toBeNull();
});
test("actual chat engine receives allowed assertion/span context and returns citation trace without provider calls",async()=>{
 await post();let wire:any;global.fetch=jest.fn(async(url,options)=>{if(url!=="https://api.openai.com/v1/chat/completions")throw Error("External call forbidden");wire=JSON.parse(String(options?.body));return new Response('data: [DONE]\n\n');});
 // Retrieval embedding is mocked; one candidate skips reranking. Fake chat fetch never reaches network.
 const result=await runChatEngine({expertId:owner,query:"monolith",chatHistory:[]});expect(result.evidenceTrace).toHaveLength(1);expect(result.sources[0].metadata.evidenceTrace).toEqual(result.evidenceTrace);expect(wire.messages[0].content).toContain(result.evidenceTrace[0].revisionId);expect(wire.messages[0].content).toContain("owner endorsement true");expect(global.fetch).toHaveBeenCalledTimes(1);
 const {writeFileSync}=await import("fs");writeFileSync("audit/exp12/answer-trace.json",JSON.stringify({synthetic:true,modelResponse:"in-process fake; no network",query:"monolith",evidenceTrace:result.evidenceTrace,sources:result.sources,systemPrompt:wire.messages[0].content},null,2)+"\n");
});
test("foreign tenant or forged owner flag cannot retrieve restricted assertions",async()=>{
 await post("paid",undefined,true);const ownerScope=await scope(owner);expect(await trace({...ownerScope,viewerId:undefined,isOwner:true})).toEqual([]);expect(await trace({...ownerScope,expertProfileId:"foreign"})).toEqual([]);
});

test("additive evidence-only rollback SQL executes transactionally and restores evidence on rollback",async()=>{
 await post();const original=await trace();
 const {readFileSync}=await import("fs");const rollback=readFileSync("audit/exp12/rollback.sql","utf8");
 await expect(prisma.$transaction(async tx=>{
  for(const sql of rollback.replace(/--[^\n]*/g,"").split(";").map(s=>s.trim()).filter(Boolean))await tx.$executeRawUnsafe(sql);
  const absent=await tx.$queryRaw<{relation:string|null}[]>`SELECT to_regclass('"EvidenceRevision"')::text AS relation`;expect(absent[0].relation).toBeNull();
  expect(await tx.knowledgeItem.count()).toBe(1);expect(await tx.post.count()).toBe(1);throw Error("rollback proof");
 })).rejects.toThrow("rollback proof");expect(await trace()).toEqual(original);
});
test("concurrent owner rebuilds serialize and do not duplicate revision supports",async()=>{
 const item=await post();await Promise.all([rebuildEvidenceSource(expert,item.id),rebuildEvidenceSource(expert,item.id)]);expect(await prisma.evidenceRevision.count()).toBe(1);expect(await prisma.evidenceSupport.count()).toBe(1);expect((await edges())[0].weight).toBe(1);
});

test("unresolved identical quoted names remain source-local, not merged person identities",async()=>{
 await post("quote-one",'Ben said: "I prefer services."');await post("quote-two",'Ben said: "I prefer services."');const t=await trace();expect(t).toHaveLength(2);expect(new Set(t.map(t=>t.subject)).size).toBe(2);expect(t.every(t=>!t.endorsedByOwner && t.weight===1)).toBe(true);
});
