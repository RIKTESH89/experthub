const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),os=require('os');
const runner=require('./exp7-continuation.cjs');
const fixtures=require('../../audit/phase0/exp7-preflight/fixtures.json');
const previous=require('../../audit/phase0/exp7-next/ledger.json');
function mock(transform=()=>{},failAt=1){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'exp7-continuation-'));let calls=0;const waits=[];
 const config={ledgerFile:path.join(dir,'ledger.json'),secret:{LOCAL_TEST_GROQ_API_KEY:'synthetic-mock-key',LOCAL_TEST_GROQ_BASE_URL:'https://api.groq.com/openai/v1',LOCAL_TEST_GROQ_MODEL:'openai/gpt-oss-120b'},sleep:async ms=>waits.push(ms),fetch:async(url,init)=>{
  calls++;assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');const p=JSON.parse(init.body);runner.validatePayload(p);assert.ok(init.signal);assert.equal(init.headers.Authorization,'Bearer synthetic-mock-key');
  const data={model:p.model,choices:[{finish_reason:'stop',message:{content:p.max_completion_tokens===1024?'1,2,3,4,5':'Synthetic bounded answer.'}}],usage:{prompt_tokens:100,completion_tokens:10,total_tokens:110,completion_tokens_details:{reasoning_tokens:3},prompt_tokens_details:{cached_tokens:0}}};
  const response={ok:true,status:200,json:async()=>data};if(calls===failAt)transform(data,response,p);return response;
 }};
 return {config,calls:()=>calls,waits,cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
}
test('exact H3-H6 continuation sequence: eight answers plus two native reranks, no completed pairs replayed',async()=>{
 const m=mock();try{const r=await runner.execute(m.config);assert.equal(r.status,'complete');assert.equal(r.attempts,10);assert.equal(r.answers,8);assert.equal(r.reranks,2);assert.equal(r.outputs.length,8);assert.equal(m.waits.length,9);assert.ok(m.waits.every(ms=>ms>64000&&ms<=65000));assert.ok(r.records.every(r=>!/^H[12]/.test(r.caseId)));assert.equal(r.priorSpent.attempts,6);assert.equal(r.priorSpent.total,3092);assert.equal(r.priorSpent.requestsWithoutUsage,1);await assert.rejects(runner.execute(m.config),/Existing ledger/);}finally{m.cleanup();}
});
test('all frozen remaining payloads conform to documented restricted Groq wire schema',()=>{
 const traces=require('../../audit/phase0/exp7-continuation/prompt-traces.json');assert.equal(traces.length,8);assert.equal(traces.flatMap(t=>t.requests).length,10);
 for(const t of traces)for(const r of t.requests){runner.validatePayload(r.payload);assert.ok(r.localTokens+r.estimatedHostFraming<=r.inputCap);assert.ok(r.payload.messages.every(m=>Object.keys(m).sort().join(',')==='content,role'));assert.equal(r.payload.max_completion_tokens,r.stage==='answer'?2048:1024);}
});
test('64-round fixture produces original oldest history and candidate latest correction without database columns',async()=>{
 assert.equal(fixtures.conversations[0].messages.length,128);const c=fixtures.cases.find(c=>c.id.startsWith('H3'));
 for(const variant of ['original','candidate']){let body;await runner.setup(variant,c,async(_,init)=>{body=JSON.parse(init.body);return {ok:true,body:{}}}).run();const p=runner.envelope(body);assert.ok(p.messages.every(m=>Object.keys(m).sort().join(',')==='content,role'));assert.equal(p.messages.some(m=>m.content.includes('now has twenty')),variant==='candidate');assert.equal(p.messages.length,variant==='original'?22:12);}
});
test('completed H1/H2 wire payloads remain byte-equivalent under repaired adapter, so preserved pairs remain comparable',async()=>{
 for(const o of previous.outputs){let captured;const c=fixtures.cases.find(c=>c.id===o.caseId);await runner.setup(o.variant,c,async(_,init)=>{captured=runner.envelope(JSON.parse(init.body));return {ok:true,body:{}};}).run();const originalPayload=previous.records.find(r=>r.caseId===o.caseId&&r.variant===o.variant).payload;assert.equal(JSON.stringify(captured),JSON.stringify(originalPayload));}
});
const cases=[
 ['HTTP400 JSON',(d,r)=>{r.ok=false;r.status=400;r.json=async()=>({error:{type:'invalid_request_error',code:'invalid_message',message:'Unexpected createdAt synthetic-mock-key\n'}})},'HTTP 400'],
 ['HTTP429',(d,r)=>{r.ok=false;r.status=429;r.json=async()=>({error:{message:'Limit synthetic-mock-key'}})},'HTTP 429'],
 ['HTTP500 nonJSON',(d,r)=>{r.ok=false;r.status=500;r.json=async()=>{throw Error('synthetic-mock-key')}},'HTTP 500'],
 ['invalid success JSON',(d,r)=>{r.json=async()=>{throw SyntaxError('synthetic-mock-key')}},'Invalid response JSON'],
 ['null success object',(d,r)=>{r.json=async()=>null},'Invalid response object'],
 ['model mismatch',d=>{d.model='wrong'},'Unexpected model'],
 ['missing usage',d=>{delete d.usage},'Missing usage'],
 ['invalid usage total',d=>{d.usage.total_tokens=99},'Invalid usage'],
 ['invalid usage negative',d=>{d.usage.prompt_tokens=-1},'Invalid usage'],
 ['reasoning over reported completion',d=>{d.usage.completion_tokens_details.reasoning_tokens=11},'Invalid usage'],
 ['cached over reported prompt',d=>{d.usage.prompt_tokens_details.cached_tokens=101},'Invalid usage'],
 ['prompt cap',d=>{d.usage.prompt_tokens=4097;d.usage.total_tokens=4107},'Observed accounting cap exceeded'],
 ['completion cap',d=>{d.usage.completion_tokens=2049;d.usage.total_tokens=2149;},'Observed accounting cap exceeded'],
 ['truncation',d=>{d.choices[0].finish_reason='length'},'Truncated response'],
 ['refusal',d=>{d.choices[0].message.refusal='Synthetic refusal synthetic-mock-key'},'Provider refusal'],
 ['missing choices',d=>{delete d.choices},'Invalid choice shape'],
 ['two choices',d=>{d.choices.push(d.choices[0])},'Invalid choice shape'],
 ['finish filter',d=>{d.choices[0].finish_reason='content_filter'},'Unexpected finish reason'],
 ['null final',d=>{d.choices[0].message.content=null},'Invalid final content'],
 ['empty final',d=>{d.choices[0].message.content=' '},'Empty final content'],
 ['tool call',d=>{d.choices[0].message.tool_calls=[{}]},'Unexpected tool call'],
 ['timeout',(d,r)=>{r.json=async()=>{throw Object.assign(Error('synthetic-mock-key'),{name:'AbortError'})}},'Timeout'],
];
for(const [name,transform,error] of cases)test('first failure stops entire remaining run: '+name,async()=>{
 const m=mock(transform);try{const r=await runner.execute(m.config);assert.equal(r.status,'stopped');assert.equal(r.attempts,1);assert.equal(m.calls(),1);assert.equal(r.blocker,error);assert.ok(!JSON.stringify(r).includes('synthetic-mock-key'));if(name==='HTTP400 JSON'){assert.equal(r.records[0].httpError.code,'invalid_message');assert.match(r.records[0].httpError.message,/REDACTED/);}if(name==='HTTP500 nonJSON')assert.equal(r.records[0].httpError.parseable,false);}finally{m.cleanup();}
});
test('real Response non2xx JSON/text decoding preserves a redacted bounded error body',async()=>{
 const m=mock();m.config.fetch=async()=>new Response(JSON.stringify({error:{type:'invalid_request_error',code:'unknown_field',message:'createdAt synthetic-mock-key'}}),{status:400});
 try{const r=await runner.execute(m.config);assert.equal(r.blocker,'HTTP 400');assert.equal(r.records[0].httpError.code,'unknown_field');assert.ok(!JSON.stringify(r).includes('synthetic-mock-key'));}finally{m.cleanup();}
 const d=await runner.httpErrorDiagnostics(new Response('<html>synthetic-mock-key '+('x'.repeat(2000))+'</html>',{status:500}),'synthetic-mock-key');assert.equal(d.format,'text');assert.ok(d.snippet.length<=1000);assert.ok(!JSON.stringify(d).includes('synthetic-mock-key'));
});
test('rerank failure cannot trigger pinned score fallback followed by another provider call',async()=>{
 const m=mock((d,r)=>{r.ok=false;r.status=429;},3);try{const r=await runner.execute(m.config);assert.equal(r.status,'stopped');assert.equal(m.calls(),3);assert.equal(r.outputs.length,2);assert.equal(r.reranks,1);}finally{m.cleanup();}
});
test('third-rerank guard latches before dispatch even through pinned retriever catch',async()=>{
 const m=mock();m.config.initialCounters={attempts:2,answers:0,reranks:2};try{const r=await runner.execute(m.config);assert.equal(r.status,'stopped');assert.equal(r.blocker,'Attempt cap exceeded');assert.equal(m.calls(),2);assert.equal(r.reranks,2);assert.equal(r.records.length,2);}finally{m.cleanup();}
});
test('actual tolerant pinned rerank parser deduplicates valid indices, ignores out-of-range and fills by score',async()=>{
 const c=fixtures.cases.find(c=>c.id.startsWith('H4'));for(const variant of ['original','candidate']){const r=await runner.setup(variant,c,async(_,init)=>{const b=JSON.parse(init.body);return b.stream?{ok:true,body:{}}:{ok:true,json:async()=>({choices:[{message:{content:'2,2,999,-1 words 1'}}]})};}).run();assert.equal(r.sources.length,5);assert.equal(new Set(r.sources.map(x=>x.metadata.vectorId||x.metadata.knowledgeId)).size,5);}
});
test('keyword-only candidate is offered to candidate rerank and starved by original 15-vector budget, without altering parser',()=>{
 const t=require('../../audit/phase0/exp7-continuation/prompt-traces.json').filter(t=>t.caseId.startsWith('H4'));for(const x of t){const r=x.requests.find(r=>r.stage==='rerank');assert.equal(r.payload.messages[1].content.includes('reversible trial'),x.variant==='candidate');}
});
test('all request fields/roles/configuration validated before dispatch; no tools, JSON schema, DB fields or unsupported params',()=>{
 const base=runner.envelope({stream:true,temperature:0.5,messages:[{role:'user',content:'Synthetic'}]});
 for(const change of [{tools:[]},{response_format:{}},{reasoning_format:'hidden'},{max_tokens:2048},{model:'other'},{temperature:3},{stream:true},{max_completion_tokens:100},{include_reasoning:true},{reasoning_effort:'medium'}])assert.throws(()=>runner.validatePayload({...base,...change}));
 for(const message of [{role:'user',content:'Synthetic',id:'db'},{role:'user',content:'Synthetic',sources:[]},{role:'user',content:'Synthetic',createdAt:'date'},{role:'tool',content:'Synthetic'},{role:'user',content:null}])assert.throws(()=>runner.envelope({stream:true,temperature:0.5,messages:[message]}));
});
test('new maximums and spent history arithmetic; overrun boundaries stop before further dispatch',()=>{
 assert.equal(runner.LIMITS.total,8*(4096+2048)+2*(2048+1024));assert.equal(runner.LIMITS.input,8*4096+2*2048);assert.equal(runner.LIMITS.output,8*2048+2*1024);
 assert.throws(()=>runner.assertAttemptBudget({attempts:10,answers:7,reranks:2},'answer'));
 assert.throws(()=>runner.assertAttemptBudget({attempts:8,answers:8,reranks:0},'answer'));
 const u={prompt_tokens:4096,completion_tokens:2048},p={max_completion_tokens:2048},l={promptTokens:36864,completionTokens:18432,totalTokens:55296};runner.assertUsageBudget(u,p,4096,l);
 for(const update of [{promptTokens:36865},{completionTokens:18433},{totalTokens:55297}])assert.throws(()=>runner.assertUsageBudget(u,p,4096,{...l,...update}));
});
test('runtime fetch timeout is terminal and redacted',async()=>{
 const m=mock();m.config.fetch=async()=>{throw Object.assign(Error('synthetic-mock-key'),{name:'TimeoutError'})};try{const r=await runner.execute(m.config);assert.equal(r.blocker,'Timeout');assert.equal(r.attempts,1);assert.equal(r.records[0].errorType,'TimeoutError');assert.ok(!JSON.stringify(r).includes('synthetic-mock-key'));}finally{m.cleanup();}
});
test('diagnostics preserve finish/refusal/reasoning counts without reasoning text or secret',()=>{
 const d=runner.responseDiagnostics({status:'completed',choices:[{finish_reason:'length',message:{content:'partial synthetic-mock-key',refusal:'synthetic-mock-key',reasoning:'DO_NOT_STORE'}}],usage:{completion_tokens_details:{reasoning_tokens:10}}},'synthetic-mock-key');assert.equal(d.choices[0].finishReason,'length');assert.equal(d.usageShape.reasoningTokens,10);assert.ok(!JSON.stringify(d).includes('synthetic-mock-key'));assert.ok(!JSON.stringify(d).includes('DO_NOT_STORE'));
});
test('network execution requires explicit approved execution flag; default path starts no requests',async()=>{await assert.rejects(runner.execute(),/explicit approved/);await assert.rejects(runner.execute(undefined,false),/explicit approved/);assert.equal(runner.createLedger().attempts,0);});
test('optional null reasoning/cache details remain unknown rather than falsely zero or invalid',()=>{
 const d={model:'openai/gpt-oss-120b',usage:{prompt_tokens:100,completion_tokens:10,total_tokens:110,completion_tokens_details:{reasoning_tokens:null},prompt_tokens_details:{cached_tokens:null}}};runner.validateUsage(d);const r=runner.responseDiagnostics(d,'synthetic-mock-key');assert.equal(r.usageShape.reasoningTokens,null);assert.equal(r.usageShape.cachedTokens,null);
});
