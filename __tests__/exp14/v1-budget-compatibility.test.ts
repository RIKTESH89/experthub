import fixture from "./fixtures/v1-budget-boundary.json";
import { extractTemporal,temporalIdentity,TEMPORAL_EXTRACTOR_VERSION as V1 } from "@/lib/graph/temporal/extractor";
import { TEMPORAL_READ_VERSION } from "@/lib/graph/temporal/read-policy";
import { hashEvidence } from "@/lib/graph/evidence-extractor";
import { resolveTimeline } from "@/lib/graph/temporal/timeline";
import { assembleBundle } from "@/lib/retrieval/bundle";
import { planQuestion } from "@/lib/retrieval/intent";
import type { TemporalStanceTrace } from "@/lib/graph/temporal/retriever";

// Independent review reproduction at the frozen v1 serialization boundary (766-byte reason).
const scope={expertProfileId:"tenant-a",namespace:"a",isOwner:false,allowedVectorIds:["tenant-a:p:v1:chunk_0"],temporalReadVersion:V1};
const date=new Date("2026-01-01");
function retrieve(readVersion?:typeof V1|typeof TEMPORAL_READ_VERSION,text=fixture.source) {
 const v=extractTemporal(text,"owner","owner")[0];
 const spanId=hashEvidence(["revision",v.start,v.end]);
 const {reasons,...literal}=v;
 const row:TemporalStanceTrace={...literal,id:temporalIdentity("revision",spanId,v),spanId,revisionId:"revision",itemId:"p",contentHash:hashEvidence(text),sourceVersion:1,authorId:"owner",uploaderId:"owner",chunkIds:scope.allowedVectorIds,speaker:"owner",audience:"public",publishedAt:null,publicationTimeBasis:"unavailable",sourceUpdatedAt:date,ingestedAt:date,recordedAt:date,extractorVersion:V1,validFrom:null,validUntil:null,situation:v.context,chosenAction:v.action,documentedReasons:reasons};
 const timeline=resolveTimeline([row],{mode:"current",now:date});
 const chunks=[{content:"",score:0,metadata:{expertProfileId:"tenant-a",vectorId:scope.allowedVectorIds[0]}}];
 return assembleBundle({...scope,temporalReadVersion:readVersion},planQuestion("Should I choose JetStream?",{mode:"current",now:date}),chunks,[],readVersion?{...timeline,readVersion}:timeline);
}
test("pinned v1 preserves frozen budget selection and truncation at the compaction boundary",()=>{
 const r=retrieve(V1);
 expect(r.trace).toEqual(fixture.baseline);
 expect(r.temporalTrace.stances).toEqual([]);expect(r.sources).toEqual([]);
});
test("unlabeled legacy timelines preserve v1 serialization rather than implicitly compacting",()=>{
 expect(retrieve().trace).toEqual(fixture.baseline);
});
test("only the explicit active read policy compacts the same trace within the unchanged budget",()=>{
 const r=retrieve(TEMPORAL_READ_VERSION);
 expect(r.trace).toEqual(fixture.candidate);
 expect(r.temporalTrace.stances).toHaveLength(1);
 expect(r.temporalTrace.stances[0]).toMatchObject({situation:"small teams",chosenAction:"JetStream"});
 expect(r.prompt).not.toContain('"situation"');expect(r.prompt).not.toContain('"chosenAction"');
});


test("selected v1 evidence keeps its original situation/chosenAction transport fields",()=>{
 const shorter=fixture.source.replace("x".repeat(fixture.reasonLength),"x".repeat(fixture.reasonLength-1));
 const r=retrieve(V1,shorter);
 expect(r.trace.selected).toBe(1);expect(r.trace.truncated).toBe(false);
 expect(r.prompt).toContain('"situation":"small teams"');expect(r.prompt).toContain('"chosenAction":"JetStream"');
});
