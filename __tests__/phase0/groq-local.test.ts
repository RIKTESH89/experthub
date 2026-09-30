const {createSyntheticRunner,ENDPOINT,MODEL}=require("../../scripts/local-test/groq-synthetic.cjs");
const config={apiKey:"synthetic-key-not-real",baseUrl:ENDPOINT,model:MODEL};
const good=()=>({ok:true,json:async()=>({model:MODEL,choices:[{finish_reason:"stop",message:{content:JSON.stringify({answer:"Use a decision log.",evidenceIds:["synthetic-ada"],uncertain:false})}}]})});
test("local adapter sends only fixed synthetic fixture, bounded strict nonstreaming request",async()=>{
 const fetchMock=jest.fn().mockResolvedValue(good());const run=createSyntheticRunner(config,fetchMock);await run(0);
 const [url,options]=fetchMock.mock.calls[0];expect(url).toBe(`${ENDPOINT}/chat/completions`);
 const body=JSON.parse(options.body);expect(body).toMatchObject({model:MODEL,stream:false,max_tokens:256,response_format:{type:"json_schema",json_schema:{strict:true}}});expect(body.tools).toBeUndefined();expect(body.messages[1].content).toContain("synthetic-ada");
});
test("endpoint/model allowlist and missing credential fail without network",()=>{expect(()=>createSyntheticRunner({...config,baseUrl:"https://other.example"})).toThrow("approved");expect(()=>createSyntheticRunner({...config,model:"paid-model"})).toThrow("approved");expect(()=>createSyntheticRunner({...config,apiKey:""})).toThrow("Configure");});
test("two-request cap and fixed fixture gate",async()=>{const fetchMock=jest.fn().mockResolvedValue(good());const run=createSyntheticRunner(config,fetchMock);await expect(run(5)).rejects.toThrow("synthetic");await run(0);await run(0);await expect(run(0)).rejects.toThrow("cap");expect(fetchMock).toHaveBeenCalledTimes(2);});
test("HTTP failure has no retry or fallback and omits provider body",async()=>{const fetchMock=jest.fn().mockResolvedValue({ok:false,status:429,json:jest.fn()});await expect(createSyntheticRunner(config,fetchMock)(0)).rejects.toThrow("HTTP 429");expect(fetchMock).toHaveBeenCalledTimes(1);});
test.each([
 {model:"other",choices:[]},
 {model:MODEL,choices:[{finish_reason:"length"}]},
 {model:MODEL,choices:[{finish_reason:"stop",message:{content:"broken"}}]},
 {model:MODEL,choices:[{finish_reason:"stop",message:{content:JSON.stringify({answer:"x",evidenceIds:["private-source"],uncertain:false})}}]},
 {model:MODEL,choices:[{finish_reason:"stop",message:{content:JSON.stringify({answer:"x",evidenceIds:[],uncertain:false})}}]},
])("response contract rejects unsupported or incomplete evidence %#",async(data)=>{const fetchMock=jest.fn().mockResolvedValue({ok:true,json:async()=>data});await expect(createSyntheticRunner(config,fetchMock)(0)).rejects.toThrow();});
