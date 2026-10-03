import { assembleBundle, tokenUpperBound } from "@/lib/retrieval/bundle";
import { planQuestion, RETRIEVAL_BUDGET } from "@/lib/retrieval/intent";
import { resolveTimeline } from "@/lib/graph/temporal/timeline";
import type { TemporalStanceTrace } from "@/lib/graph/temporal/retriever";
const scope = {expertProfileId:"tenant-a",namespace:"a",isOwner:false,allowedVectorIds:["c-a","c-b","c-old"]};
const row = (id:string, extra:Partial<TemporalStanceTrace> = {}):TemporalStanceTrace => ({id,spanId:"s-"+id,revisionId:"r-"+id,itemId:"item-"+id,contentHash:"hash",sourceVersion:1,authorId:"owner",uploaderId:"owner",speakerId:"owner",speakerRole:"author",audience:"public",publishedAt:null,publicationTimeBasis:"unavailable",sourceUpdatedAt:new Date("2026-01-01"),ingestedAt:new Date("2026-01-01"),start:0,end:40,text:"I prefer ZephyrDB for analytics.",chunkIds:["c-"+id],speaker:"owner",origin:"expert-authored",domain:"analytics",context:null,category:"preference",polarity:"positive",action:"ZephyrDB",validFrom:null,validUntil:null,recordedAt:new Date("2026-01-01"),supersedes:null,endorsedByOwner:true,certainty:"source-explicit",kind:"explicit",extractorVersion:"literal",situation:null,constraints:null,chosenAction:null,documentedReasons:null,alternatives:null,tradeoffs:null,exceptions:null,decisionType:null,...extra});
const chunks = (ids=scope.allowedVectorIds) => ids.map(id=>({content:"",score:0.9,metadata:{vectorId:id,expertProfileId:scope.expertProfileId}}));
const retrieve=(question:string,rows:TemporalStanceTrace[],s=scope)=>{const plan=planQuestion(question);return assembleBundle(s,plan,chunks(),[],resolveTimeline(rows,plan.temporal));};
test.each([
 ["What is ZephyrDB?","factual"],["What is your stance on ZephyrDB?","stance"],["Should I choose ZephyrDB?","decision"],["Tell me your career biography","biography"],["Compare ZephyrDB versus SQL","comparison"],["Hello!","conversation"]
])("routes %s as %s",(query,intent)=>expect(planQuestion(query).intent).toBe(intent));
test("held-out dated source partition changes current versus as-of positions",()=>{
 const rows=[row("old",{validFrom:new Date("2024-01-01"),validUntil:new Date("2025-01-01"),text:"I prefer ZephyrDB until 2025."}),row("a",{validFrom:new Date("2025-01-01"),polarity:"negative",text:"I do not prefer ZephyrDB from 2025."})];
 expect(retrieve("As of 2024-06-01, stance on ZephyrDB",rows).temporalTrace.stances.map(s=>s.id)).toEqual(["old"]);
 expect(retrieve("Current stance on ZephyrDB",rows).temporalTrace.stances.map(s=>s.id)).toEqual(["a"]);
});
test("decision expands constraints and exceptions and preserves counterevidence",()=>{
 const result=retrieve("Should I choose ZephyrDB?",[row("a",{constraints:"small budget",exceptions:"regulated workloads"}),row("b",{constraints:"small budget",polarity:"negative",text:"I do not prefer ZephyrDB.",documentedReasons:"operational complexity"})]);
 expect(result.temporalTrace.stances).toHaveLength(2);expect(result.temporalTrace.relations[0].type).toBe("contradiction");expect(result.prompt).toContain("regulated workloads");expect(result.prompt).toContain("operational complexity");
});
test("same-domain one-hop decision expansion retains scoped exception",()=>{
 const result=retrieve("Should I choose ZephyrDB?",[row("a"),row("b",{action:"backup",text:"For analytics I recommend backup except during migration.",context:"migration",exceptions:"during migration"})]);
 expect(result.temporalTrace.stances.map(s=>s.id).sort()).toEqual(["a","b"]);expect(result.trace.hops).toBe(1);
});
test("rare exact keyword survives; unknown topic abstains without generic beliefs",()=>{
 expect(retrieve("ZephyrDB",[row("a")]).trace.selected).toBe(1);
 expect(retrieve("Quantum orchids",[row("a")])).toMatchObject({sources:[],trace:{selected:0}});
 expect(retrieve("Quantum orchids",[row("a")]).gaps[0]).toContain("No relevant");
});
test("neighbor, reranking and citations exclude revoked and foreign chunks",()=>{
 const foreign={...chunks(["c-b"])[0],metadata:{expertProfileId:"tenant-b",vectorId:"c-b"}};
 const plan=planQuestion("ZephyrDB"),timeline=resolveTimeline([row("a"),row("b",{polarity:"negative"})],plan.temporal);
 const r=assembleBundle({...scope,allowedVectorIds:["c-a"]},plan,[...chunks(["c-a"]),foreign],[],timeline);
 expect(r.temporalTrace.stances.map(s=>s.id)).toEqual(["a"]);expect(r.temporalTrace.relations).toEqual([]);expect(r.prompt).not.toContain('"id":"b"');expect(r.sources).toHaveLength(1);
 expect(assembleBundle({...scope,allowedVectorIds:[]},plan,chunks(),[],timeline).sources).toEqual([]);
});
test("as-of cannot resurrect rows removed by live source gate",()=>{
 const plan=planQuestion("As of 2024-06-01, ZephyrDB");
 expect(assembleBundle({...scope,allowedVectorIds:[]},plan,chunks(),[],resolveTimeline([row("a")],plan.temporal)).trace.selected).toBe(0);
});
test("UTF-8 conservative budget and candidate/evidence caps are fixed",()=>{
 const huge=row("a",{text:"ZephyrDB "+"界".repeat(6000)}),r=retrieve("ZephyrDB",[huge]);
 expect(r.trace.truncated).toBe(true);expect(r.trace.selected).toBe(0);expect(tokenUpperBound(r.prompt)).toBeLessThanOrEqual(RETRIEVAL_BUDGET.tokens);
});
test("near duplicate spans cannot crowd out a contrary position",()=>{
 const rows=[row("a"),row("old"),row("b",{polarity:"negative",text:"I do not prefer ZephyrDB."})],r=retrieve("stance on ZephyrDB",rows);
 expect(r.temporalTrace.stances).toHaveLength(2);expect(new Set(r.temporalTrace.stances.map(s=>s.polarity)).size).toBe(2);
});
test("invalid date fails closed and unrelated date does not change mode",()=>{
 expect(()=>planQuestion("As of 2024-02-30, ZephyrDB")).toThrow();expect(planQuestion("ZephyrDB in 2024-06-01").temporal.mode).toBe("current");
});

test("one-hop expansion does not turn another speaker or domain into expert decision evidence",()=>{
 const r=retrieve("Should I choose ZephyrDB?",[row("a"),row("b",{speaker:"quoted-visitor",origin:"quote",endorsedByOwner:false,action:"other",text:"Quoted visitor likes other databases."}),row("old",{domain:"gardening",action:"orchids",text:"I prefer orchids."})]);
 expect(r.temporalTrace.stances.map(s=>s.id)).toEqual(["a"]);
});
test("quoted exact-topic evidence retains attribution and does not acquire owner endorsement",()=>{
 const r=retrieve("ZephyrDB",[row("a",{speaker:"quoted-visitor",origin:"quote",endorsedByOwner:false,speakerRole:"quoted"})]);
 expect(r.temporalTrace.stances[0].endorsedByOwner).toBe(false);expect(r.prompt).toContain('"origin":"quote"');
});
import { writeFileSync } from "fs";
test("record per-intent synthetic traces with exact identities and observable gaps",()=>{
 const rich=row("a",{constraints:"budget below 100",exceptions:"regulated workloads",documentedReasons:"documented cost"});
 const questions=["What is ZephyrDB?","What is your stance on ZephyrDB?","Should I choose ZephyrDB?","Tell me your career biography","Compare ZephyrDB versus Snowflake","Hello!","Quantum orchids"];
 const traces=questions.map(question=>({question,...retrieve(question,[rich])}));
 for(const r of traces) expect(r.trace.tokenUpperBound).toBeLessThanOrEqual(RETRIEVAL_BUDGET.tokens);
 writeFileSync("audit/exp14/intent-traces.json",JSON.stringify(traces,null,2)+"\n");
});
