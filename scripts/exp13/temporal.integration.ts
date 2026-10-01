const embed=jest.fn();jest.mock("@/lib/vector/embeddings",()=>({...jest.requireActual("@/lib/vector/embeddings"),generateEmbedding:embed}));
import prisma from "@/lib/prisma";
import {syncPostSource,removeKnowledgeItem} from "@/lib/knowledge/lifecycle";
import {rebuildEvidenceSource} from "@/lib/graph/evidence-store";
import {resolveRetrievalScope,type RetrievalScope} from "@/lib/knowledge/access";
import {retrieveTemporalEvidence} from "@/lib/graph/temporal/retriever";
import {type TemporalQuery} from "@/lib/graph/temporal/timeline";
import {runChatEngine} from "@/lib/ai/chat-engine";
const owner="synthetic-exp13-owner",expert="synthetic-exp13",ns="synthetic-exp13-ns";
const reviewCases:{name:string;views:unknown[];reviewQuestions:string[]}[]=[];
const prefix="In software architecture, For small teams, ";
async function post(id:string,content:string,premium=false){await prisma.post.create({data:{id,authorId:owner,title:"Synthetic professional source",content,status:"PUBLISHED",isRagEnabled:true,isPremiumOnly:premium}});await syncPostSource(id);return prisma.knowledgeItem.findFirstOrThrow({where:{sourceId:id}});}
async function scope(viewer?:string){return resolveRetrievalScope(expert,ns,owner,viewer);}
async function read(query:TemporalQuery={mode:"current",now:new Date("2026-06-01")},s?:RetrievalScope){s=s||await scope();return retrieveTemporalEvidence(s,s.allowedVectorIds.map(vectorId=>({content:"synthetic",score:1,metadata:{vectorId,expertProfileId:expert}})),query);}
beforeEach(async()=>{
 const db=await prisma.$queryRaw<{name:string}[]>`SELECT current_database() AS name`;if(db[0].name!=="experthub_phase0_test")throw Error("Unsafe DB");
 await prisma.$executeRawUnsafe('TRUNCATE "KnowledgeLifecycleJob", "VectorChunk", "User" CASCADE');
 await prisma.user.create({data:{id:owner,email:"exp13@example.invalid",role:"EXPERT",expertProfile:{create:{id:expert,displayName:"Synthetic Ada",specialty:[],vectorNamespace:ns}}}});
 embed.mockReset().mockResolvedValue(Array.from({length:1536},(_,i)=>i===0?1:0));global.fetch=async()=>{throw Error("External calls forbidden");};
});
afterAll(async()=>{const {writeFileSync}=await import("fs");writeFileSync("audit/exp13/review-cases.json",JSON.stringify({synthetic:true,status:"PENDING human review; automated tests are not human review",reviewCases},null,2)+"\n");await prisma.$disconnect();});
test("dated contradictory stance periods distinguish current/as-of; ingestion never becomes validity",async()=>{
 await post("old","From 2024-01-01 until 2025-01-01, "+prefix+"I prefer monolith.");await post("new","From 2025-01-01, "+prefix+"I do not prefer monolith.");
 const past=await read({mode:"as-of",validAt:new Date("2024-06-01")}),current=await read();expect(past.stances).toHaveLength(1);expect(past.stances[0].polarity).toBe("positive");expect(current.stances).toHaveLength(1);expect(current.stances[0].polarity).toBe("negative");expect(current.stances[0].recordedAt).toEqual(current.stances[0].ingestedAt);expect(current.stances[0].validFrom).toEqual(new Date("2025-01-01"));
 reviewCases.push({name:"Dated contradiction periods",views:[past,current],reviewQuestions:["Do the source-declared periods justify the different current/as-of stances?","Is recorded time kept separate from valid time, without inventing an original publication date?"]});
 expect((await read({mode:"as-of",validAt:new Date("2024-06-01"),knownAt:new Date("2025-01-01")})).stances).toEqual([]);
});
test("undated contradiction and different-choice disagreement remain unresolved with both supports",async()=>{
 await post("positive",prefix+"I prefer monolith.");await post("negative",prefix+"I do not prefer monolith.");let r=await read();expect(r.stances).toHaveLength(2);expect(r.relations[0]).toMatchObject({type:"contradiction",kind:"inferred"});expect(r.relations[0].uncertainty).toContain("valid-time-unknown");
 await post("different",prefix+"I prefer services.");r=await read();expect(r.stances).toHaveLength(3);expect(r.relations.some(r=>r.type==="unresolved-disagreement")).toBe(true);
 reviewCases.push({name:"Undated contradiction and unresolved choices",views:[r],reviewQuestions:["Should both source-backed views remain unresolved rather than newest-wins?","Is the positive/negative contradiction distinguished from possibly compatible different preferences?"]});
});
test("source-backed decision reason/constraints/alternatives/tradeoffs/exceptions; reason-missing stays null",async()=>{
 await post("decision",prefix+"I chose monolith because operations capacity is limited; constraints: two engineers; alternatives: services; tradeoff: release independence; exceptions: services when independent deployment is essential.");
 await post("missing","In software architecture, For reversible trials, I recommend a pilot.");const r=await read();expect(r.stances.find(s=>s.context==="small teams")).toMatchObject({documentedReasons:"operations capacity is limited",constraints:"two engineers",alternatives:"services",tradeoffs:"release independence",exceptions:"services when independent deployment is essential",decisionType:"documented-choice"});expect(r.stances.find(s=>s.context==="reversible trials")?.documentedReasons).toBeNull();expect(r.relations).toEqual([]);
 reviewCases.push({name:"Decision case and missing reason",views:[r],reviewQuestions:["Are situation, action, reasons, constraints, alternatives, tradeoffs and exceptions copied correctly from the spans?","Does the other case correctly leave its undocumented reason unknown?","Is the exception scoped to the documented constraint rather than global?"]});
});
test("quoted/third-party/visitor disagreement is not expert stance; topic cooccurrence creates no attribute",async()=>{
 await post("author",prefix+"I prefer monolith.");await post("quote",'Ben said: "'+prefix+'I do not prefer monolith."');await post("description","Ben prefers services.");await post("visitor",'Visitor claimed: "I prefer services."');await post("topics","I discuss security, anxiety, family and leadership.");
 const r=await read();expect(r.stances.filter(s=>s.endorsedByOwner)).toHaveLength(1);expect(new Set(r.stances.map(s=>s.origin))).toEqual(new Set(["expert-authored","quote","third-party-description","visitor-claim"]));expect(r.relations).toEqual([]);expect(await prisma.temporalStance.count()).toBe(4);
 reviewCases.push({name:"Author vs quote, description and visitor",views:[r],reviewQuestions:["Is only the authored expert view attributed to the expert?","Are quotes, descriptions and visitor claims correctly separate?","Does discussion of topics avoid creating personality or biography claims?"]});
});
test("principles and boundaries have immutable exact-span evidence, no inferred links",async()=>{
 await post("values","My principle is reversible decisions.\nI will not disclose confidential material.");const r=await read();expect(r.stances.map(s=>s.category).sort()).toEqual(["boundary","principle"]);expect(r.stances.every(s=>s.text.includes(s.action))).toBe(true);expect(await prisma.evidenceDecisionCase.count()).toBe(0);
 reviewCases.push({name:"Documented principle and boundary",views:[r],reviewQuestions:["Do the exact source lines support these principle/boundary records?","Are no unsupported decision links or personal motives added?"]});
 await expect(prisma.temporalStance.update({where:{id:r.stances[0].id},data:{action:"invented"}})).rejects.toThrow("append-only");
});
test("dated supersession is effective only at declared date and retains both auditable spans",async()=>{
 await post("old","From 2024-01-01, "+prefix+"I prefer monolith.");await post("new","From 2025-01-01, "+prefix+"I prefer services instead of monolith.");
 const current=await read();expect(current.stances).toHaveLength(1);expect(current.stances[0].action).toBe("services");expect(current.supersededStances).toHaveLength(1);expect(current.relations[0].type).toBe("supersedes");expect((await read({mode:"as-of",validAt:new Date("2024-06-01")})).stances[0].action).toBe("monolith");expect(await prisma.temporalStance.count()).toBe(2);
 reviewCases.push({name:"Dated source-declared supersession",views:[await read({mode:"as-of",validAt:new Date("2024-06-01")}),current],reviewQuestions:["Does instead-of plus the declared date justify this replacement?","Are both supporting spans auditable while only the appropriate current stance is served?"]});
});
test("restricted supersession cannot suppress public stance or leak its relation; downgrade rechecks live entitlement",async()=>{
 await post("old","From 2024-01-01, "+prefix+"I prefer monolith.");await post("new","From 2025-01-01, "+prefix+"I prefer services instead of monolith.",true);
 expect((await read()).stances.map(s=>s.action)).toEqual(["monolith"]);expect((await read()).relations).toEqual([]);
 await prisma.user.create({data:{id:"visitor",email:"visitor@example.invalid"}});await prisma.expertSubscription.create({data:{subscriberId:"visitor",expertProfileId:expert,tier:"PREMIUM",status:"ACTIVE",price:0}});
 const entitled=await scope("visitor");expect((await read(undefined,entitled)).stances.map(s=>s.action)).toEqual(["services"]);await prisma.expertSubscription.update({where:{subscriberId_expertProfileId:{subscriberId:"visitor",expertProfileId:expert}},data:{tier:"STANDARD"}});expect((await read(undefined,entitled)).stances.map(s=>s.action)).toEqual(["monolith"]);expect((await read(undefined,entitled)).relations).toEqual([]);
});
test("same revision replay/concurrent backfill is idempotent; deletion retracts independent support and audit persists",async()=>{
 const a=await post("a",prefix+"I prefer monolith."),b=await post("b",prefix+"I prefer monolith.");const before=await read();await Promise.all([rebuildEvidenceSource(expert,a.id),rebuildEvidenceSource(expert,a.id)]);expect(await read()).toEqual(before);expect(await prisma.temporalStance.count()).toBe(2);
 await removeKnowledgeItem(expert,a.id);expect((await read()).stances).toHaveLength(1);await removeKnowledgeItem(expert,b.id);expect((await read()).stances).toEqual([]);expect((await read({mode:"as-of",validAt:new Date("2025-01-01")})).stances).toEqual([]);expect(await prisma.temporalStance.count()).toBe(2);
});
test("edit/unpublish retracts current and as-of serving, preserves historical decisions and blocks foreign tenant",async()=>{
 const item=await post("post","From 2024-01-01, "+prefix+"I prefer monolith.");const old=(await read()).stances[0],stale=await scope();await prisma.post.update({where:{id:"post"},data:{content:"From 2025-01-01, "+prefix+"I prefer services."}});expect((await read(undefined,stale)).stances).toEqual([]);await syncPostSource("post");expect((await read()).stances[0].action).toBe("services");expect((await prisma.evidenceRevision.findUniqueOrThrow({where:{id:old.revisionId}})).retiredAt).not.toBeNull();expect(await prisma.temporalStance.count()).toBe(2);
 expect((await read(undefined,{...await scope(),expertProfileId:"foreign"})).stances).toEqual([]);await prisma.post.update({where:{id:"post"},data:{status:"DRAFT"}});expect((await read(undefined,await scope())).stances).toEqual([]);expect(await rebuildEvidenceSource("foreign",item.id)).toBeNull();
});
test("actual chat engine supports explicit as-of query and carries allowed decision trace without model network",async()=>{
 await post("post","From 2024-01-01 until 2025-01-01, "+prefix+"I chose monolith because operations capacity is limited.");let wire:any;global.fetch=jest.fn(async(url,options)=>{if(url!=="https://api.openai.com/v1/chat/completions")throw Error("External call forbidden");wire=JSON.parse(String(options?.body));return new Response('data: [DONE]\n\n');});
 const result=await runChatEngine({expertId:owner,query:"As of 2024-06-01, what architecture choice was documented for monolith?",chatHistory:[]});expect(result.temporalTrace.stances).toHaveLength(1);expect(result.sources[0].metadata.temporalTrace).toMatchObject({mode:"as-of"});expect(wire.messages[0].content).toContain("operations capacity is limited");expect(wire.messages[0].content).toContain("Recorded time is not validity");expect(global.fetch).toHaveBeenCalledTimes(1);
 const {writeFileSync}=await import("fs");writeFileSync("audit/exp13/answer-trace.json",JSON.stringify({synthetic:true,modelResponse:"in-process fake; no network",temporalTrace:result.temporalTrace,sources:result.sources,systemPrompt:wire.messages[0].content},null,2)+"\n");
});

test("EXP13 additive rollback DDL preserves EXP12 sources/evidence and rolls back transactionally",async()=>{
 await post("source",prefix+"I prefer monolith.");const before=await read();const {readFileSync}=await import("fs");const rollback=readFileSync("audit/exp13/rollback.sql","utf8").replace(/--[^\n]*/g,"");
 await expect(prisma.$transaction(async tx=>{for(const sql of rollback.split(";").map(s=>s.trim()).filter(Boolean))await tx.$executeRawUnsafe(sql);expect(await tx.evidenceRevision.count()).toBe(1);expect(await tx.knowledgeItem.count()).toBe(1);expect(await tx.evidenceAssertion.count()).toBe(0);const absent=await tx.$queryRaw<{relation:string|null}[]>`SELECT to_regclass('"TemporalStance"')::text AS relation`;expect(absent[0].relation).toBeNull();throw Error("rollback proof");})).rejects.toThrow("rollback proof");expect(await read()).toEqual(before);
});

test("mismatched decision-span support cannot inject restricted fields into a public stance",async()=>{
 await post("public","My principle is reversibility.");await post("private",prefix+"I prefer services.",true);
 const publicStance=await prisma.temporalStance.findFirstOrThrow({where:{category:"principle"}});const restricted=await prisma.temporalStance.findFirstOrThrow({where:{category:"preference"}});
 await prisma.evidenceDecisionCase.create({data:{id:"synthetic-inconsistent-support",stanceId:publicStance.id,spanId:restricted.spanId,chosenAction:"RESTRICTED_ONLY",documentedReasons:"RESTRICTED_REASON",decisionType:"recommendation",extractorVersion:"literal-temporal-decision-v1"}});
 const r=await read();expect(r.stances).toHaveLength(1);expect(r.stances[0].documentedReasons).toBeNull();expect(JSON.stringify(r)).not.toContain("RESTRICTED_REASON");
});
