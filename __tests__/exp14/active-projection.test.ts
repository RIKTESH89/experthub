import type { Prisma } from "@prisma/client";
import type { TemporalStanceTrace } from "@/lib/graph/temporal/retriever";
import raw from "./fixtures/negative-projection.json";
const query = jest.fn();
jest.mock("@/lib/prisma", () => ({__esModule:true,default:{$queryRaw:query,knowledgeItem:{findMany:jest.fn(async()=>["p","n"].map(id=>({id,expertProfileId:"tenant-a",title:"Title",sourceType:"manual",sourceId:null,sourceVersion:1,indexedVersion:1,vectorIds:[`tenant-a:${id}:v1:chunk_0`]})))}}}));
jest.mock("@/lib/vector/client", () => ({vectorStore:{query:jest.fn(async()=>[]),keywordSearch:jest.fn(async()=>[])}}));
jest.mock("@/lib/vector/embeddings", () => ({generateEmbedding:jest.fn(async()=>[1])}));
import { publishTemporal } from "@/lib/graph/temporal/publisher";
import { retrieveIntentEvidence } from "@/lib/retrieval/retrieve";
import { retrieveTemporalEvidence } from "@/lib/graph/temporal/retriever";
import { retrieveLocalEvaluationEvidence } from "@/lib/ai/dialogue/structured/local-retrieval";
import { revalidateDialogueEvidence } from "@/lib/ai/dialogue/revalidate";
import { replayNegativePreference } from "@/lib/graph/temporal/read-projection";
import { TEMPORAL_READ_VERSION, ACTIVE_TEMPORAL_READ_VERSION } from "@/lib/graph/temporal/read-policy";
import { TEMPORAL_EXTRACTOR_VERSION as V1 } from "@/lib/graph/temporal/extractor";
import { hashEvidence } from "@/lib/graph/evidence-extractor";
import { writeFileSync } from "fs";

// Actual default publisher -> INSERT values -> actual gate/reader/bundle. Only SQL execution and search are mocked.
type Row = Record<string,unknown>;
let tables:Record<string,Row[]>;
let sourceAuthors:Record<string,string|null>;
let audience:string, entitled:boolean, live:boolean, corrupt:boolean;
const scope={expertProfileId:"tenant-a",namespace:"a",viewerId:"subscriber",isOwner:false,allowedVectorIds:["tenant-a:p:v1:chunk_0","tenant-a:n:v1:chunk_0"]};
async function seed(text:string,id:string,author:string|null="owner") {
 const tx={$executeRaw:async(parts:TemplateStringsArray,...values:unknown[])=>{
  const m=parts.join("?").match(/INSERT INTO "(\w+)" \(([\s\S]*?)\) VALUES/)!;
  const columns=Array.from(m[2].matchAll(/"(\w+)"/g),x=>x[1]);
  const r=Object.fromEntries(columns.map((c,i)=>[c,values[i]]));
  tables[m[1]] ||= []; if(!tables[m[1]].some(x=>x.id===r.id))tables[m[1]].push(r); return 1;
 }} as unknown as Prisma.TransactionClient;
 sourceAuthors[id]=author;
 // Nonzero offsets are important: replay must reconstruct the original revision-relative identity.
 await publishTemporal(tx,"r-"+id,{id,expertProfileId:"tenant-a",sourceVersion:1} as never,"owner","Title\n\n"+text,author);
}
function spans() {
 return tables.EvidenceSpan.map(s=>({...s,spanId:s.id,itemId:(s.chunkIds as string[])[0].split(":")[1],contentHash:hashEvidence(s.text),sourceVersion:1,chunkIds:s.chunkIds as string[],authorId:sourceAuthors[(s.chunkIds as string[])[0].split(":")[1]],uploaderId:"owner",audience,publishedAt:null,publicationTimeBasis:"unavailable",sourceUpdatedAt:new Date("2026-01-01"),ingestedAt:new Date("2026-01-01")}));
}
beforeEach(async()=>{
 tables={}; sourceAuthors={}; audience="public"; entitled=true; live=true; corrupt=false;
 await seed(raw.positive,"p"); await seed(raw.negative,"n");
 query.mockImplementation(async(parts:TemplateStringsArray,...values:unknown[])=>{
  const sql=parts.join("?");
  if(sql.includes("WITH eligible AS")) {
   // Assert the real gate retains tenant, exact current source, live entitlement and bounded SQL predicates.
   for(const fragment of ['r."retiredAt" IS NULL','i."indexedVersion"=r."sourceVersion"','r."content"','sub."razorpayPaymentId" IS NOT NULL','sub."currentPeriodEnd">CURRENT_TIMESTAMP','LIMIT 100'])expect(sql).toContain(fragment);
   const selected=values[3] as string[], allowed=values[4] as string[];
   return values[0]!==scope.expertProfileId || !live || (audience!=="public" && values[1]!=="owner" && !(audience==="premium"&&entitled)) ? [] : spans().filter(s=>(s.chunkIds as string[]).some(id=>selected.includes(id)&&allowed.includes(id)));
  }
  if(sql.includes('FROM "TemporalStance"')) {
   expect(sql).toContain('d."spanId"=s."spanId"'); expect(values[2]).toBe(V1);
   return tables.TemporalStance.filter(s=>values[0]===scope.expertProfileId&&(values[1] as string[]).includes(s.spanId as string)&&s.extractorVersion===values[2]).map(s=>{
    const d=tables.EvidenceDecisionCase?.find(d=>d.stanceId===s.id&&d.spanId===s.spanId);
    const fields=Object.fromEntries(["situation","constraints","chosenAction","documentedReasons","alternatives","tradeoffs","exceptions","decisionType"].map(f=>[f,d?.[f]??null]));
    return {...s,...fields,...(corrupt&&s.polarity==="negative"?{action:"Corrupt"}:{})};
   });
  }
  if(sql.includes('FROM "EvidenceAssertion"'))return [];
  throw new Error("Unexpected SQL");
 });
});

test("active default retrieval closes null fields from default v1 publication without opt-in or writes",async()=>{
 const retained=JSON.stringify(tables);
 const r=await retrieveIntentEvidence(scope,"Should I choose JetStream?",{mode:"current",now:new Date("2026-10-07")});
 expect(r.temporalTrace.readVersion).toBe(ACTIVE_TEMPORAL_READ_VERSION);
 expect(r.temporalTrace.stances).toHaveLength(2);
 const n=r.temporalTrace.stances.find(s=>s.polarity==="negative")!;
 expect(n).toMatchObject({constraints:"two engineers",documentedReasons:"maintenance",exceptions:"audited workloads",chosenAction:"JetStream",polarity:"negative",start:7,storedExtractorVersion:V1,projectionBasis:"authorized-span-replay"});
 expect(n.recordedAt).toEqual(n.ingestedAt);
 expect(n.storedStanceId).toBe(tables.TemporalStance.find(s=>s.polarity==="negative")!.id);
 expect(r.temporalTrace.relations[0]).toMatchObject({type:"contradiction",kind:"inferred"});
 expect(r.prompt).toContain("maintenance"); expect(r.prompt).toContain("authorized-span-replay");
 expect(r.sources).toHaveLength(2); expect(r.trace.tokenUpperBound).toBeLessThanOrEqual(4096); expect(r.trace.truncated).toBe(false);
 expect(JSON.stringify(tables)).toBe(retained); expect(tables.EvidenceDecisionCase).toHaveLength(1);
 writeFileSync("audit/exp14/active-negative-projection/active-read-fixture.json",JSON.stringify({method:"Actual default publisher, live-gate SQL construction, active default intent reader and bundle; in-memory SQL executor and mock search only. No live/native SQL or providers.",storedRows:tables,bundle:r},null,2)+"\n");
});
test("local evaluation default shares the repaired reader, while explicit retained v1 stays unchanged",async()=>{
 const current=await retrieveLocalEvaluationEvidence(scope,"Should I choose JetStream?");
 expect(current.temporalTrace.stances.find(s=>s.polarity==="negative")!.constraints).toBe("two engineers");
 const old=await retrieveIntentEvidence({...scope,temporalReadVersion:V1},"Should I choose JetStream?");
 expect(old.temporalTrace.stances.find(s=>s.polarity==="negative")!.constraints).toBeNull(); expect(old.temporalTrace.relations).toEqual([]);
 expect(old.temporalTrace.stances.every(s=>s.extractorVersion===V1)).toBe(true);
});
test("authorization is evaluated before replay, including warm entitlement downgrade, owner-only and foreign tenant",async()=>{
 audience="premium"; expect((await retrieveLocalEvaluationEvidence(scope,"JetStream")).temporalTrace.stances).toHaveLength(2);
 entitled=false;
 for(const s of [scope,{...scope,expertProfileId:"foreign"}]) {
  const r=await retrieveLocalEvaluationEvidence(s,"Should I choose JetStream?");expect(r.sources).toEqual([]);expect(r.prompt).not.toContain("maintenance");
 }
 audience="private"; expect((await retrieveLocalEvaluationEvidence(scope,"JetStream")).trace.selected).toBe(0);
 expect((await retrieveLocalEvaluationEvidence({...scope,viewerId:"owner",isOwner:true},"JetStream")).temporalTrace.stances).toHaveLength(2);
 live=false;expect((await retrieveLocalEvaluationEvidence({...scope,viewerId:"owner",isOwner:true},"As of 2026-01-01, JetStream")).sources).toEqual([]);
});
test("current/as-of/knownAt and unknown topics still use typed routing and gaps",async()=>{
 tables={};await seed("From 2024-01-01 until 2025-01-01, "+raw.positive,"p");await seed("From 2025-01-01, "+raw.negative,"n");
 expect((await retrieveLocalEvaluationEvidence(scope,"As of 2024-06-01, should I choose JetStream?")).temporalTrace.stances.map(s=>s.polarity)).toEqual(["positive"]);
 expect((await retrieveLocalEvaluationEvidence(scope,"Should I choose JetStream?")).temporalTrace.stances.map(s=>s.polarity)).toEqual(["negative"]);
 expect((await retrieveLocalEvaluationEvidence(scope,"JetStream",{mode:"as-of",validAt:new Date("2025-06-01"),knownAt:new Date("2025-12-31")})).sources).toEqual([]);
 const gap=await retrieveLocalEvaluationEvidence(scope,"Quantum orchids");expect(gap.trace.selected).toBe(0);expect(gap.gaps[0]).toContain("No relevant");
});
test("replay refuses corrupt identity/provenance/offsets and mismatched joined fields",async()=>{
 const trace=await retrieveTemporalEvidence({...scope,temporalReadVersion:V1},scope.allowedVectorIds.map(vectorId=>({content:"",score:0,metadata:{vectorId,expertProfileId:scope.expertProfileId}})));
 const n=trace.stances.find(s=>s.polarity==="negative")!;
 for(const extra of [{id:"wrong"},{speakerId:"other"},{speaker:"other"},{start:8},{domain:"other"},{constraints:"unexpected"},{origin:"quote"},{authorId:null}]){
  const changed={...n,...extra} as TemporalStanceTrace; expect(replayNegativePreference(changed)).toBe(changed);
 }
 corrupt=true;
 const result=await retrieveTemporalEvidence(scope,scope.allowedVectorIds.map(vectorId=>({content:"",score:0,metadata:{vectorId,expertProfileId:scope.expertProfileId}})));expect(result.stances.find(s=>s.polarity==="negative")!.constraints).toBeNull();
});
test("quoted negative fields retain source-local visitor attribution and missing fields stay null",async()=>{
 tables={};await seed(raw.positive,"p");await seed(`Visitor claimed: "${raw.negative}"`,"n");
 const quote=await retrieveLocalEvaluationEvidence(scope,"Should I choose JetStream?");
 expect(quote.temporalTrace.stances.find(s=>s.polarity==="negative")).toMatchObject({origin:"visitor-claim",speaker:"n:quoted:Visitor",endorsedByOwner:false,constraints:"two engineers"});expect(quote.temporalTrace.relations).toEqual([]);
 tables={};await seed(raw.missing,"n");const missing=await retrieveLocalEvaluationEvidence(scope,"Should I choose JetStream?");
 expect(missing.temporalTrace.stances[0]).toMatchObject({constraints:null,documentedReasons:null,exceptions:null});
});
test("unsupported release read policy fails before store calls",async()=>{
 query.mockClear();await expect(retrieveLocalEvaluationEvidence({...scope,temporalReadVersion:"unknown"},"JetStream")).rejects.toThrow("Unsupported temporal read policy");
 // The concurrent assertion branch can read the gate; the temporal reader itself must not.
 query.mockClear();await expect(retrieveTemporalEvidence({...scope,temporalReadVersion:"unknown"},[])).rejects.toThrow("Unsupported temporal read policy");expect(query).not.toHaveBeenCalled();
});


test("revalidation preserves retained read policy and independently rechecks fresh access",async()=>{
 const original=await retrieveLocalEvaluationEvidence({...scope,temporalReadVersion:V1},"Should I choose JetStream?");
 const old=await revalidateDialogueEvidence(scope,original);
 expect(old.temporalTrace.readVersion).toBe(V1);expect(old.temporalTrace.stances.find(s=>s.polarity==="negative")!.constraints).toBeNull();
 await expect(revalidateDialogueEvidence({...scope,temporalReadVersion:TEMPORAL_READ_VERSION},original)).rejects.toThrow("Temporal read policy changed");
 const active=await retrieveLocalEvaluationEvidence(scope,"Should I choose JetStream?");
 const current=await revalidateDialogueEvidence(scope,active);
 expect(current.temporalTrace.stances.find(s=>s.polarity==="negative")!.constraints).toBe("two engineers");
 live=false;const revoked=await revalidateDialogueEvidence(scope,active);expect(revoked.temporalTrace.stances).toEqual([]);expect(revoked.sources).toEqual([]);
});

import priorNative from "../../audit/exp14/sql/projection-limitation.json";
import { assembleBundle } from "@/lib/retrieval/bundle";
import { planQuestion } from "@/lib/retrieval/intent";
import { resolveTimeline } from "@/lib/graph/temporal/timeline";
test("retained native row fixture with real-length identities still fits opposite projected evidence in the fixed budget",()=>{
 const rows=priorNative.retrieved.stances.map(value=>{
  const row={...value} as unknown as TemporalStanceTrace;
  for(const key of ["publishedAt","sourceUpdatedAt","ingestedAt","validFrom","validUntil","recordedAt"] as const) if(row[key]) (row as unknown as Row)[key]=new Date(row[key]!);
  return replayNegativePreference(row);
 });
 expect(rows.find(s=>s.polarity==="negative")!.constraints).toBe("two engineers");
 const chunkIds=Array.from(new Set(rows.flatMap(s=>s.chunkIds)));
 const s={expertProfileId:"exp14-synthetic-expert",namespace:"synthetic",isOwner:false,allowedVectorIds:chunkIds};
 const plan=planQuestion("Should I choose JetStream for small teams?",{mode:"current",now:new Date("2026-10-07")});
 const result=assembleBundle(s,plan,chunkIds.map(vectorId=>({content:"",score:0,metadata:{vectorId,expertProfileId:s.expertProfileId}})),[],{...resolveTimeline(rows,plan.temporal),readVersion:TEMPORAL_READ_VERSION});
 expect(result.temporalTrace.stances).toHaveLength(2);expect(result.temporalTrace.relations).toHaveLength(1);expect(result.prompt).toContain('"recordType":"relation"');expect(result.trace.truncated).toBe(false);expect(result.trace.tokenUpperBound).toBeLessThanOrEqual(4096);
 writeFileSync("audit/exp14/active-negative-projection/prior-native-row-replay.json",JSON.stringify({method:"Offline replay of retained prior native rows; no new native SQL run",bundle:result},null,2)+"\n");
});
