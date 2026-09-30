import {writeFileSync} from "fs";
const store={query:jest.fn(),keywordSearch:jest.fn()};const embed=jest.fn();
jest.mock("@/lib/vector/client",()=>({vectorStore:store}));
jest.mock("@/lib/vector/embeddings",()=>({generateEmbedding:embed}));
import {retrieveContext as oldRetrieve} from "../../audit/phase0/frozen/retriever";
import {generateEmbedding as oldEmbed} from "../../audit/phase0/frozen/embeddings";
import {retrieveContext as newRetrieve} from "@/lib/vector/retriever";
import {frozenSources,goldenCases} from "./fixtures";
const vectors=Array.from({length:15},(_,i)=>({id:`vector-${i}`,content:`vector-${i}`,score:0.8,metadata:{expertProfileId:"ada"}}));
const keyword={id:"keyword-only",content:"rare-tool correct source",score:0.8,metadata:{expertProfileId:"ada"}};
const scope={expertProfileId:"ada",namespace:"ada-ns",isOwner:false,allowedVectorIds:vectors.map((r)=>r.id).concat([keyword.id])};
beforeEach(()=>{jest.clearAllMocks();store.query.mockResolvedValue(vectors);store.keywordSearch.mockResolvedValue([keyword]);embed.mockResolvedValue([1]);process.env.OPENAI_API_KEY="synthetic-only";
 global.fetch=jest.fn().mockImplementation(async(_url: string,options: {body:string})=>{const body=JSON.parse(options.body);return {ok:true,json:async()=>({choices:[{message:{content:body.messages[1].content.includes("rare-tool correct source")?"2,1,3,4,5":"1,2,3,4,5"}}]})};});});
afterEach(()=>{delete process.env.OPENAI_API_KEY;});
test("EXP7 frozen sources split whole documents/time and golden expectations remain fixed",()=>{
 expect(new Set(frozenSources.map((s)=>s.source)).size).toBe(frozenSources.length);
 expect(frozenSources.filter((s)=>s.split==="heldout").every((s)=>s.date>"2026-01-01")).toBe(true);expect(goldenCases).toHaveLength(4);
});
test("original baseline reproduces keyword-only loss; Phase0 retrieves it under the same mocked model/budget",async()=>{
 expect((await oldRetrieve("ada-ns","rare-tool",5)).map((r)=>r.content)).not.toContain(keyword.content);
 expect((await newRetrieve("ada-ns","rare-tool",5,scope)).map((r)=>r.content)).toContain(keyword.content);
});
test("original baseline manufactured embeddings when credentials were absent",async()=>{
 delete process.env.OPENAI_API_KEY;const result=await oldEmbed("synthetic source");expect(result).toHaveLength(1536);expect(result.some((v)=>v!==0)).toBe(true);
});
test("synthetic retrieval-only timing comparison; no provider/model performance claim",async()=>{
 const sample=async(fn:()=>Promise<unknown>)=>{const timings=[];for(let i=0;i<100;i++){const start=performance.now();await fn();timings.push(performance.now()-start);}timings.sort((a,b)=>a-b);return {medianMs:timings[50],p95Ms:timings[95],iterations:100};};
 const baseline=await sample(()=>oldRetrieve("ada-ns","rare-tool",5));const phase0=await sample(()=>newRetrieve("ada-ns","rare-tool",5,scope));
 writeFileSync("audit/phase0/synthetic-latency.json",JSON.stringify({kind:"mocked in-process harness only",baseline,phase0,warning:"Not provider, DB or production latency; not model faithfulness/naturalness"},null,2)+"\n");
 expect(baseline.iterations).toBe(100);expect(phase0.iterations).toBe(100);
});
