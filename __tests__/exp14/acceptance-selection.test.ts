import { assembleBundle } from "@/lib/retrieval/bundle";
import { planQuestion, RETRIEVAL_BUDGET } from "@/lib/retrieval/intent";
import { resolveTimeline } from "@/lib/graph/temporal/timeline";
import { TEMPORAL_READ_VERSION, TEMPORAL_SELECTION_VERSION } from "@/lib/graph/temporal/read-policy";
import { TEMPORAL_EXTRACTOR_VERSION } from "@/lib/graph/temporal/extractor";
import type { TemporalStanceTrace } from "@/lib/graph/temporal/retriever";
import type { EvidenceTrace } from "@/lib/graph/evidence-store";
import { writeFileSync } from "fs";
import { assembleBundle as frozenV2Bundle } from "./fixtures/frozen-v2-bundle";

const at = new Date("2026-10-11T00:00:00Z");
const stance = (id: string, extra: Partial<TemporalStanceTrace> = {}): TemporalStanceTrace => ({
 id,spanId:`span-${id}`,revisionId:`revision-${id}`,itemId:`item-${id}`,contentHash:"synthetic",sourceVersion:1,authorId:"owner",uploaderId:"owner",speakerId:"owner",speakerRole:"author",audience:"public",publishedAt:null,publicationTimeBasis:"unavailable",sourceUpdatedAt:at,ingestedAt:at,start:0,end:50,text:"In transport, I prefer ArrowBus.",chunkIds:[`chunk-${id}`],speaker:"owner",origin:"expert-authored",domain:"transport",context:"small teams",category:"preference",polarity:"positive",action:"ArrowBus",validFrom:null,validUntil:null,recordedAt:at,supersedes:null,endorsedByOwner:true,certainty:"source-explicit",kind:"explicit",extractorVersion:TEMPORAL_EXTRACTOR_VERSION,situation:"small teams",constraints:"one operator",chosenAction:"ArrowBus",documentedReasons:"bounded operations",alternatives:null,tradeoffs:null,exceptions:"regulated traffic",decisionType:null,...extra
});
const assertion = (id: string, text: string): EvidenceTrace => ({...stance(id),assertionId:`assertion-${id}`,subject:"owner",predicate:"states",object:text,weight:1,text});
const filler = Array.from({length:28},(_,i)=>`term${String.fromCharCode(97+i%26)}${String.fromCharCode(97+Math.floor(i/26))}`).join(" ");
function bundle(question: string, rows: TemporalStanceTrace[], assertions: EvidenceTrace[] = [], active = true, allowed?: string[]) {
 const all=[...rows,...assertions], ids=all.flatMap(r=>r.chunkIds);
 const scope={expertProfileId:"tenant",namespace:"tenant-ns",isOwner:false,allowedVectorIds:allowed||ids};
 const chunks=ids.map(id=>({content:"",score:0.9,metadata:{expertProfileId:"tenant",vectorId:id}}));
 const plan=planQuestion(question,{mode:"current",now:at});
 return assembleBundle(scope,plan,chunks,assertions,{...resolveTimeline(rows,plan.temporal),readVersion:active?TEMPORAL_SELECTION_VERSION:TEMPORAL_READ_VERSION});
}

test("rare exact anchors after 24 source words survive without expanding the query budget",()=>{
 const a=assertion("long",`${filler} NacreQueue is the documented ingestion adapter.`);
 const r=bundle("What is NacreQueue?",[],[a]);
 expect(r.evidenceTrace.map(t=>t.assertionId)).toEqual([a.assertionId]);
 expect(r.sources[0].content).toBe(a.text);
 expect(r.trace.tokenUpperBound).toBeLessThanOrEqual(RETRIEVAL_BUDGET.tokens);
 expect(bundle("What is NacreQueue?",[],[a],false).trace.selected).toBe(0);
 expect(planQuestion(filler+" NacreQueue").terms).toHaveLength(24);
});

test.each(["documentedReasons","alternatives","tradeoffs"] as const)("decision retrieval can anchor on late documented %s",field=>{
 const r=bundle("Should I choose NacreQueue?",[stance("context",{action:"batching",text:`Documented batching: ${filler} NacreQueue.`,[field]:`${filler} NacreQueue`})]);
 expect(r.temporalTrace.stances.map(s=>s.id)).toEqual(["context"]);
 expect(r.prompt).toContain("NacreQueue");
});

test("same-budget saturation retains a direct conflict before repeated supporting spans",()=>{
 const supports=Array.from({length:8},(_,i)=>stance(`a${i}`,{text:`In transport, I prefer ArrowBus for variant ${i}. ${"documented detail ".repeat(12)}`}));
 const contrary=stance("z",{polarity:"negative",text:"In transport, I do not prefer ArrowBus.",documentedReasons:"on-call workload",exceptions:"disposable pilots"});
 const rows=[...supports,contrary];
 const old=bundle("Should I choose ArrowBus?",rows,[],false),current=bundle("Should I choose ArrowBus?",rows);
 expect(old.temporalTrace.stances.some(s=>s.id==="z")).toBe(false);
 expect(current.temporalTrace.stances.map(s=>s.id)).toContain("z");
 expect(current.temporalTrace.stances.some(s=>s.polarity==="positive")).toBe(true);
 expect(current.temporalTrace.relations.some(r=>r.type==="contradiction")).toBe(true);
 expect(current.prompt).toContain('"recordType":"relation"');
 expect(current.prompt).toContain("on-call workload");
 expect(current.trace.hops).toBeLessThanOrEqual(1);
 expect(current.trace.tokenUpperBound).toBeLessThanOrEqual(RETRIEVAL_BUDGET.tokens);
 expect(current.trace.truncated).toBe(true);
 // Synthetic required-position recall is separate from human precision/quality.
 const samples=(active:boolean)=>Array.from({length:50},()=>{const start=performance.now();bundle("Should I choose ArrowBus?",rows,[],active);return performance.now()-start;}).sort((a,b)=>a-b);
 const baselineTimes=samples(false),candidateTimes=samples(true);
 writeFileSync("audit/exp14-acceptance-20261011/saturation-comparison.json",JSON.stringify({method:"Hand-authored adversarial support saturation, active v3 versus retained frozen v2 selection, equal 4096-byte budget. Fifty local pure-bundle CPU measurements per variant; excludes SQL, embeddings, network/model latency and cost. No human quality judgment; this is not the Phase0 baseline or general held-out precision/recall.",question:"Should I choose ArrowBus?",requiredPositionIds:["a0","z"],baseline:{selected:old.temporalTrace.stances.map(s=>s.id),requiredPositionRecall:old.temporalTrace.stances.filter(s=>["a0","z"].includes(s.id)).length/2,medianLocalMs:baselineTimes[25],trace:old.trace},candidate:{selected:current.temporalTrace.stances.map(s=>s.id),requiredPositionRecall:current.temporalTrace.stances.filter(s=>["a0","z"].includes(s.id)).length/2,medianLocalMs:candidateTimes[25],trace:current.trace}},null,2)+"\n");
});

test("counterposition prioritization cannot restore a revoked neighbor or citation",()=>{
 const positive=stance("p"),negative=stance("n",{polarity:"negative",text:"PRIVATE_CONTRARY_SENTINEL"});
 const r=bundle("Should I choose ArrowBus?",[positive,negative],[],true,positive.chunkIds);
 expect(r.temporalTrace.stances.map(s=>s.id)).toEqual(["p"]);
 expect(r.temporalTrace.relations).toEqual([]);
 expect(JSON.stringify(r)).not.toContain("PRIVATE_CONTRARY_SENTINEL");
 expect(bundle("Should I choose ArrowBus?",[positive,negative],[],true,[]).sources).toEqual([]);
});

test("dense mixed relations prioritize contradiction over a higher scoring alternative",()=>{
 const seed=stance("a",{action:"ArrowBus small teams",text:"I prefer ArrowBus small teams.",documentedReasons:"bounded operations"});
 const alternative=stance("b",{action:"ArrowBus small teams variant",text:"I prefer ArrowBus small teams variant. "+"alternative detail ".repeat(28)});
 const contrary=stance("z",{action:seed.action,polarity:"negative",text:"I do not prefer ArrowBus small teams.",documentedReasons:null,situation:null});
 const r=bundle("Should I choose ArrowBus for small teams?",[seed,alternative,contrary]);
 expect(r.temporalTrace.stances.map(s=>s.id)).toContain("z");
 expect(r.temporalTrace.relations.some(r=>r.type==="contradiction")).toBe(true);
});

test("oversized direct counterevidence omission produces a specific conflict gap",()=>{
 const seed=stance("a"),contrary=stance("z",{polarity:"negative",text:"I do not prefer ArrowBus.",documentedReasons:"detail ".repeat(800)});
 const r=bundle("Should I choose ArrowBus?",[seed,contrary]);
 expect(r.temporalTrace.stances.map(s=>s.id)).toEqual(["a"]);expect(r.temporalTrace.relations).toEqual([]);
 expect(r.gaps).toContain("Relevant conflicting or superseding evidence is outside selected context; do not present the selected stance as uncontested");
 expect(r.trace.truncated).toBe(true);expect(r.trace.tokenUpperBound).toBeLessThanOrEqual(RETRIEVAL_BUDGET.tokens);
});

test("new ranking remains deterministic and cannot invent missing-topic evidence",()=>{
 const rows=[stance("b"),stance("a",{text:"A separately documented ArrowBus preference."}),stance("n",{polarity:"negative",text:"I do not prefer ArrowBus."})];
 const first=bundle("Should I choose ArrowBus?",rows),second=bundle("Should I choose ArrowBus?",[...rows].reverse());
 expect(first.prompt).toBe(second.prompt);expect(first.temporalTrace).toEqual(second.temporalTrace);expect(first.trace).toEqual(second.trace);
 expect(first.sources.map(s=>s.metadata.vectorId).sort()).toEqual(second.sources.map(s=>s.metadata.vectorId).sort());
 expect(bundle("What is the stance on unopened StarMoss?",rows)).toMatchObject({sources:[],trace:{selected:0}});
});

test("pinned v2 bundles remain byte-equivalent to the frozen delivered selector across context budgets",()=>{
 let comparisons=0;
 for(const words of [0,24,25,32])for(const reasonLength of [0,80,300,700])for(const question of ["What is NacreQueue?","Should I choose ArrowBus?","Compare ArrowBus versus NacreQueue"]){
  const prefix=filler.split(" ").slice(0,words).join(" ");
  const rows=[stance("a",{documentedReasons:"detail ".repeat(reasonLength),text:"I prefer ArrowBus. "+prefix}),stance("z",{polarity:"negative",text:"I do not prefer ArrowBus."})];
  const assertions=[assertion("long",prefix+" NacreQueue is documented.")];
  const ids=[...rows,...assertions].flatMap(r=>r.chunkIds),scope={expertProfileId:"tenant",namespace:"tenant-ns",isOwner:false,allowedVectorIds:ids};
  const chunks=ids.map(vectorId=>({content:"",score:0.9,metadata:{expertProfileId:"tenant",vectorId}}));
  const plan=planQuestion(question,{mode:"current",now:at}),timeline={...resolveTimeline(rows,plan.temporal),readVersion:TEMPORAL_READ_VERSION} as const;
  expect(JSON.stringify(assembleBundle(scope,plan,chunks,assertions,timeline))).toBe(JSON.stringify(frozenV2Bundle(scope,plan,chunks,assertions,timeline)));
  comparisons++;
 }
 expect(comparisons).toBe(48);
});
