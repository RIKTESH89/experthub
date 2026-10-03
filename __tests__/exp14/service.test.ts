const store={query:jest.fn(),keywordSearch:jest.fn()},embedding=jest.fn(),assertions=jest.fn(),temporal=jest.fn();
jest.mock("@/lib/vector/client",()=>({vectorStore:store}));
jest.mock("@/lib/vector/embeddings",()=>({generateEmbedding:embedding}));
jest.mock("@/lib/graph/evidence-store",()=>({retrieveEvidenceTrace:assertions}));
jest.mock("@/lib/graph/temporal/retriever",()=>({retrieveTemporalEvidence:temporal}));
import { retrieveIntentEvidence } from "@/lib/retrieval/retrieve";
import { resolveTimeline } from "@/lib/graph/temporal/timeline";
const scope={expertProfileId:"a",namespace:"ns-a",isOwner:false,allowedVectorIds:["public"]};
beforeEach(()=>{jest.clearAllMocks();embedding.mockResolvedValue([1]);store.query.mockResolvedValue([]);store.keywordSearch.mockResolvedValue([]);assertions.mockResolvedValue([]);temporal.mockImplementation((_s,_c,q)=>Promise.resolve(resolveTimeline([],q)));});
test("hybrid channels and neighbors receive same scope; hostile hits removed before store and citations",async()=>{
 store.query.mockResolvedValue([{id:"private",content:"PRIVATE",metadata:{expertProfileId:"a"},score:1},{id:"public",content:"FOREIGN",metadata:{expertProfileId:"b"},score:1}]);
 store.keywordSearch.mockResolvedValue([{id:"public",content:"ZephyrDB",metadata:{expertProfileId:"a"},score:0.6}]);
 const r=await retrieveIntentEvidence(scope,"Should I choose ZephyrDB?");
 expect(store.query).toHaveBeenCalledWith("ns-a",[1],15,scope);expect(store.keywordSearch).toHaveBeenCalledWith("ns-a","zephyrdb",15,scope);
 expect(assertions.mock.calls[0][1]).toHaveLength(1);expect(JSON.stringify(assertions.mock.calls)).not.toContain("PRIVATE");expect(JSON.stringify(r)).not.toContain("FOREIGN");
});
test("search failure exposes lexical fallback; permission failure stops retrieval",async()=>{
 embedding.mockRejectedValue(Error("offline"));expect((await retrieveIntentEvidence(scope,"ZephyrDB")).trace.failures).toContain("semantic-unavailable; lexical fallback");
 assertions.mockRejectedValue(Error("authorization store unavailable"));await expect(retrieveIntentEvidence(scope,"ZephyrDB")).rejects.toThrow("authorization store unavailable");
});
test("revoked manifest and conversational queries make no embedding call",async()=>{
 await retrieveIntentEvidence({...scope,allowedVectorIds:[]},"ZephyrDB");await retrieveIntentEvidence(scope,"Hello!");expect(embedding).not.toHaveBeenCalled();expect(assertions.mock.calls[0][1]).toEqual([]);
});
test("manifest graph scan capped at 100 and flagged rather than claiming exhaustive coverage",async()=>{
 const s={...scope,allowedVectorIds:Array.from({length:200},(_,i)=>"v"+i)};
 const r=await retrieveIntentEvidence(s,"ZephyrDB");expect(assertions.mock.calls[0][1]).toHaveLength(100);expect(r.trace.truncated).toBe(true);expect(r.gaps).toContain("Candidate or context budget reached; further evidence may exist");
});

import { retrieveContext as frozenRetrieve } from "../../audit/phase0/frozen/retriever";
import { writeFileSync } from "fs";
import { tokenUpperBound } from "@/lib/retrieval/bundle";
test("held-out frozen baseline comparison uses same 4096-byte conservative budget, offline only",async()=>{
 delete process.env.OPENAI_API_KEY;
 const distractors=Array.from({length:15},(_,i)=>({id:"d"+i,content:"General management and planning principles. "+"detail ".repeat(70),score:0.95,metadata:{expertProfileId:"a"}}));
 const hits=[{id:"public",content:"In analytics, I prefer ZephyrDB.",score:0.6,metadata:{expertProfileId:"a"}}];
 store.query.mockResolvedValue(distractors);store.keywordSearch.mockResolvedValue(hits);
 const stance={id:"heldout",spanId:"span-heldout",revisionId:"rev-heldout",itemId:"item-heldout",contentHash:"synthetic",sourceVersion:1,authorId:"owner",uploaderId:"owner",speakerId:"owner",speakerRole:"author",audience:"public",publishedAt:null,publicationTimeBasis:"unavailable",sourceUpdatedAt:new Date("2026-09-01"),ingestedAt:new Date("2026-09-01"),start:0,end:32,text:hits[0].content,chunkIds:["public"],speaker:"owner",origin:"expert-authored",domain:"analytics",context:null,category:"preference",polarity:"positive",action:"ZephyrDB",validFrom:null,validUntil:null,recordedAt:new Date("2026-09-01"),supersedes:null,endorsedByOwner:true,certainty:"source-explicit",kind:"explicit",extractorVersion:"literal",situation:null,constraints:null,chosenAction:null,documentedReasons:null,alternatives:null,tradeoffs:null,exceptions:null,decisionType:null};
 temporal.mockImplementation((_s,_c,q)=>Promise.resolve(resolveTimeline([stance],q)));
 const measurements=[];
 for(const question of ["What is your stance on ZephyrDB?","Should I choose ZephyrDB?","Compare ZephyrDB versus Snowflake"]){
  const baselineTimes:number[]=[],candidateTimes:number[]=[];let base:Awaited<ReturnType<typeof frozenRetrieve>>=[],candidate:Awaited<ReturnType<typeof retrieveIntentEvidence>>|undefined;
  for(let i=0;i<50;i++) {let start=performance.now();base=await frozenRetrieve("ns-a",question,5);baselineTimes.push(performance.now()-start);start=performance.now();candidate=await retrieveIntentEvidence({...scope,allowedVectorIds:[...distractors.map(d=>d.id),"public"]},question);candidateTimes.push(performance.now()-start);}
  let baselineBytes=0;const bounded=base.filter(c=>{const n=tokenUpperBound(c.content);if(baselineBytes+n>4096)return false;baselineBytes+=n;return true;});
  const relevant=bounded.filter(c=>c.content.includes("ZephyrDB")).length;
  const median=(v:number[])=>v.sort((a,b)=>a-b)[Math.floor(v.length/2)];
  measurements.push({question,budget:4096,baseline:{recall:relevant?1:0,precision:bounded.length?relevant/bounded.length:0,tokenUpperBound:baselineBytes,medianLocalMs:median(baselineTimes)},candidate:{recall:candidate!.temporalTrace.stances.length?1:0,precision:candidate!.trace.selected?1:0,tokenUpperBound:candidate!.trace.tokenUpperBound,medianLocalMs:median(candidateTimes)}});
  expect(candidate!.temporalTrace.stances.map(s=>s.id)).toEqual(["heldout"]);expect(relevant).toBe(0);
 }
 writeFileSync("audit/exp14/offline-comparison.json",JSON.stringify({method:"Three synthetic source-heldout queries, 50 in-process runs each; frozen Phase0 retriever credential-free ranking; identical 4096 UTF-8-byte upper-bound cap. Mocked stores/embedding only; excludes SQL, network and model latency. Narrow rare-keyword saturation reproduction, not a general quality estimate.",measurements},null,2)+"\n");
});
