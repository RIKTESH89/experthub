import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, generateEmbedding, validateEmbedding } from "@/lib/vector/embeddings";
const vector = () => Array.from({length:EMBEDDING_DIMENSIONS},(_,i)=>i===0?1:0);
beforeEach(()=>{process.env.OPENAI_API_KEY="synthetic-only";});
afterEach(()=>{delete process.env.OPENAI_API_KEY;});
test("EXP11 absent provider never creates a fake persistent embedding",async()=>{delete process.env.OPENAI_API_KEY;await expect(generateEmbedding("source")).rejects.toThrow("not configured");});
test.each([503,429,401])("HTTP %s fails safely",async(status)=>{global.fetch=jest.fn().mockResolvedValue({ok:false,status});await expect(generateEmbedding("source")).rejects.toThrow(`failed: ${status}`);});
test("rejects a model mismatch",async()=>{global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({model:"other",data:[{embedding:vector()}]})});await expect(generateEmbedding("source")).rejects.toThrow("model mismatch");});
test.each([[1],Array(EMBEDDING_DIMENSIONS).fill(0),Array(EMBEDDING_DIMENSIONS).fill(NaN)])("rejects invalid dimensions/nonfinite/zero vector",(values)=>{expect(()=>validateEmbedding(values)).toThrow("dimension/value mismatch");});
test("accepts only explicit matching model and dimensions",async()=>{global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({model:EMBEDDING_MODEL,data:[{embedding:vector()}]})});expect(await generateEmbedding("source")).toEqual(vector());});
