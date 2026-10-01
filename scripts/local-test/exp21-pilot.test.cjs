const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const {execute}=require('./exp21-pilot.cjs');
function mocks(kind){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'exp21-mock-'));let calls=0,waits=[];
 const config={ledgerFile:path.join(dir,'ledger.json'),secret:{LOCAL_TEST_GROQ_API_KEY:'synthetic-mock-key',LOCAL_TEST_GROQ_BASE_URL:'https://api.groq.com/openai/v1',LOCAL_TEST_GROQ_MODEL:'openai/gpt-oss-120b'},sleep:async ms=>{waits.push(ms);},fetch:async(url,init)=>{
  calls++;assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');const p=JSON.parse(init.body);assert.equal(p.stream,false);assert.ok([100,256].includes(p.max_tokens));assert.ok(init.signal);
  if(kind==='http')return {ok:false,status:429};
  if(kind==='timeout')throw Object.assign(new Error('PRIVATE_MOCK_SECRET'),{name:'TimeoutError'});
  const data={model:p.model,usage:{prompt_tokens:100,completion_tokens:10,total_tokens:110},choices:[{finish_reason:'stop',message:{content:p.max_tokens===100?'1,2,3,4,5':'Synthetic mock answer.'}}]};
  if(kind==='missing')delete data.usage;
  if(kind==='overrun')data.usage={prompt_tokens:4097,completion_tokens:10,total_tokens:4107};
  if(kind==='length')data.choices[0].finish_reason='length';
  if(kind==='rerank'&&p.max_tokens===100)data.choices[0].message.content='Not a ranking';
  return {ok:true,json:async()=>data};
 }};return {config,calls:()=>calls,waits,cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
}
test('complete paired run uses only 12 answers plus 2 native reranks and waits after every completion',async()=>{
 const m=mocks('ok');try{const r=await execute(m.config);assert.equal(r.status,'complete');assert.equal(r.attempts,14);assert.equal(r.answers,12);assert.equal(r.reranks,2);assert.equal(r.outputs.length,12);assert.equal(m.waits.length,13);assert.ok(m.waits.every(v=>v>64000&&v<=65000));await assert.rejects(execute(m.config),/Existing ledger/);}finally{m.cleanup();}
});
for(const kind of ['http','timeout','missing','overrun','length','rerank'])test('stop without retry/fallback on '+kind,async()=>{
 const m=mocks(kind);try{const r=await execute(m.config);assert.equal(r.status,'stopped');assert.equal(m.calls(),kind==='rerank'?7:1);assert.ok(!JSON.stringify(r).includes('PRIVATE_MOCK_SECRET'));assert.ok(r.records.at(-1).status==='failed');}finally{m.cleanup();}
});
