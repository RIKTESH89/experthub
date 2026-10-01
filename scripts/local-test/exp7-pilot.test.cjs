const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const {execute}=require('./exp7-pilot.cjs');
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
for(const kind of ['http','timeout','missing','overrun','length'])test('stop without retry/fallback on '+kind,async()=>{
 const m=mocks(kind);try{const r=await execute(m.config);assert.equal(r.status,'stopped');assert.equal(m.calls(),1);assert.ok(!JSON.stringify(r).includes('PRIVATE_MOCK_SECRET'));assert.ok(r.records.at(-1).status==='failed');}finally{m.cleanup();}
});
test('diagnostics retain truncation, status, refusal and numeric reasoning usage without reasoning text/secrets',()=>{
 const {responseDiagnostics,responseFailure}=require('./exp7-pilot.cjs');
 const data={model:'openai/gpt-oss-120b',status:'completed',choices:[{finish_reason:'length',message:{content:'partial synthetic-mock-key',refusal:null,reasoning:'DO_NOT_STORE_REASONING_TEXT'}}],usage:{prompt_tokens:40,completion_tokens:256,total_tokens:296,completion_tokens_details:{reasoning_tokens:250},prompt_tokens_details:{cached_tokens:3}}};
 const d=responseDiagnostics(data,'synthetic-mock-key');assert.equal(d.choices[0].finishReason,'length');assert.equal(d.responseStatus,'completed');assert.equal(d.usageShape.reasoningTokens,250);assert.equal(d.usageShape.cachedTokens,3);assert.equal(responseFailure(data),'Truncated response');assert.ok(!JSON.stringify(d).includes('synthetic-mock-key'));assert.ok(!JSON.stringify(d).includes('DO_NOT_STORE_REASONING_TEXT'));assert.match(d.choices[0].finalContent,/REDACTED/);
});
test('finish reasons, refusal, missing choice and null content have distinct diagnoses',()=>{
 const {responseDiagnostics,responseFailure}=require('./exp7-pilot.cjs');
 const d={choices:[{finish_reason:'stop',message:{content:null,refusal:'Synthetic refusal synthetic-mock-key'}}]};
 assert.equal(responseFailure(d),'Provider refusal');assert.equal(responseDiagnostics(d,'synthetic-mock-key').choices[0].refusal,'Synthetic refusal [REDACTED]');delete d.choices[0].message.refusal;assert.equal(responseFailure(d),'Invalid final content');d.choices[0].finish_reason='content_filter';assert.equal(responseFailure(d),'Unexpected finish reason');assert.equal(responseFailure({choices:[]}), 'Invalid choice shape');assert.equal(responseFailure({choices:'bad'}),'Invalid choice shape');
});
test('actual stopped mock ledger retains length diagnostics and usage before rejection',async()=>{
 const m=mocks('length');try{const r=await execute(m.config);assert.equal(r.records[0].error,'Truncated response');assert.equal(r.records[0].responseDiagnostics.choices[0].finishReason,'length');assert.deepEqual(r.records[0].usage,{prompt_tokens:100,completion_tokens:10,total_tokens:110});}finally{m.cleanup();}
});
test('tolerant rerank output uses pinned parser rather than an invented strict schema',async()=>{
 const m=mocks('rerank');try{const r=await execute(m.config);assert.equal(r.status,'complete');assert.equal(r.attempts,14);assert.equal(r.outputs.length,12);}finally{m.cleanup();}
});
test('production/provider execution is disabled pending a new approved run',async()=>{
 await assert.rejects(execute(),/not authorized/);
});
