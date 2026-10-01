/* Prepared remaining-case continuation: offline only until new approval. */
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const {spawnSync}=require('child_process'),ts=require('typescript');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'audit/phase0/exp7-continuation');
const frozen=path.join(root,'audit/phase0/exp7-preflight');
const fixtures=JSON.parse(fs.readFileSync(path.join(frozen,'fixtures.json'),'utf8'));
const MODEL='openai/gpt-oss-120b',ENDPOINT='https://api.groq.com/openai/v1/chat/completions';
const LIMITS=Object.freeze({attempts:10,answers:8,reranks:2,input:36864,output:18432,total:55296});
const PRIOR_SPENT=Object.freeze({attempts:6,input:1853,output:1239,total:3092,requestsWithoutUsage:1});
function createLedger(test){
 const ledger={status:'running',priorSpent:PRIOR_SPENT,attempts:0,answers:0,reranks:0,promptTokens:0,completionTokens:0,totalTokens:0,records:[],outputs:[],dollarCost:null,naturalness:'unvalidated without human ratings'};
 if(test?.initialCounters)Object.assign(ledger,test.initialCounters);
 return ledger;
}
function assertAttemptBudget(ledger,stage){
 if(!['answer','rerank'].includes(stage))throw Error('Unknown request stage');
 if(ledger.attempts>=LIMITS.attempts||ledger[stage==='answer'?'answers':'reranks']>=LIMITS[stage==='answer'?'answers':'reranks'])throw Error('Attempt cap exceeded');
}
function assertUsageBudget(usage,payload,inputCap,ledger){
 if(usage.prompt_tokens>inputCap||usage.completion_tokens>payload.max_completion_tokens||ledger.promptTokens>LIMITS.input||ledger.completionTokens>LIMITS.output||ledger.totalTokens>LIMITS.total)throw Error('Observed accounting cap exceeded');
}
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function preservedHistory(){
 const files=['audit/phase0/exp21/ledger.json','audit/phase0/exp7-next/ledger.json'];
 const ledgers=files.map(file=>JSON.parse(fs.readFileSync(path.join(root,file))));
 const actual={attempts:ledgers.reduce((n,l)=>n+l.attempts,0),input:ledgers.reduce((n,l)=>n+l.promptTokens,0),output:ledgers.reduce((n,l)=>n+l.completionTokens,0),total:ledgers.reduce((n,l)=>n+l.totalTokens,0),requestsWithoutUsage:ledgers.flatMap(l=>l.records).filter(r=>!r.usage).length};
 if(JSON.stringify(actual)!==JSON.stringify(PRIOR_SPENT))throw Error('Preserved spent history changed');
 const valid=ledgers[1].outputs;
 if(valid.length!==4||valid.some(o=>!/^H[12]/.test(o.caseId)))throw Error('Completed pair inventory changed');
 return {ledgers:files.map(file=>({file,sha256:sha(fs.readFileSync(path.join(root,file)))})),preservedAnswers:valid.map(o=>({caseId:o.caseId,variant:o.variant,answerHash:sha(o.answer)}))};
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function responseDiagnostics(data,secret){
 const text=value=>typeof value==='string'?value.split(secret||'__NO_SECRET__').join('[REDACTED]').replace(/[\u0000-\u001f]/g,' ').slice(0,1000):null;
 const type=value=>value===null?'null':Array.isArray(value)?'array':typeof value;
 const integer=value=>Number.isInteger(value)&&value>=0?value:null;
 const choices=Array.isArray(data?.choices)?data.choices:[];
 return {model:text(data?.model),systemFingerprint:text(data?.system_fingerprint),responseStatus:text(data?.status),choicesType:type(data?.choices),choiceCount:choices.length,
  choices:choices.slice(0,2).map(c=>({finishReason:text(c?.finish_reason),messageType:type(c?.message),contentType:type(c?.message?.content),contentLength:typeof c?.message?.content==='string'?c.message.content.length:null,
   finalContent:text(c?.message?.content),refusalType:type(c?.message?.refusal),refusal:text(c?.message?.refusal),refusalPresent:!!c?.message?.refusal,
   reasoningType:type(c?.message?.reasoning),reasoningLength:typeof c?.message?.reasoning==='string'?c.message.reasoning.length:null,toolCallCount:Array.isArray(c?.message?.tool_calls)?c.message.tool_calls.length:0})),
  usageShape:{promptTokens:integer(data?.usage?.prompt_tokens),completionTokens:integer(data?.usage?.completion_tokens),totalTokens:integer(data?.usage?.total_tokens),reasoningTokens:integer(data?.usage?.completion_tokens_details?.reasoning_tokens),cachedTokens:integer(data?.usage?.prompt_tokens_details?.cached_tokens)}};
}
function responseFailure(data){
 if(!Array.isArray(data?.choices)||data.choices.length!==1)return 'Invalid choice shape';
 const c=data.choices[0];
 if(c?.message?.refusal)return 'Provider refusal';
 if(c?.finish_reason==='length')return 'Truncated response';
 if(c?.finish_reason!=='stop')return 'Unexpected finish reason';
 if(typeof c?.message?.content!=='string')return 'Invalid final content';
 if(!c.message.content.trim())return 'Empty final content';
 if(c.message.tool_calls?.length||c.message.function_call)return 'Unexpected tool call';
 return null;
}
function validateUsage(data){
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Invalid response object');
 if(data.model!==MODEL)throw Error('Unexpected model');
 const u=data.usage;
 if(!u)throw Error('Missing usage');
 if(!['prompt_tokens','completion_tokens','total_tokens'].every(k=>Number.isSafeInteger(u[k])&&u[k]>=0)||u.total_tokens!==u.prompt_tokens+u.completion_tokens)throw Error('Invalid usage');
 const reasoning=u.completion_tokens_details?.reasoning_tokens,cached=u.prompt_tokens_details?.cached_tokens;
 if(reasoning!=null&&(!Number.isSafeInteger(reasoning)||reasoning<0||reasoning>u.completion_tokens))throw Error('Invalid usage');
 if(cached!=null&&(!Number.isSafeInteger(cached)||cached<0||cached>u.prompt_tokens))throw Error('Invalid usage');
 return u;
}
async function httpErrorDiagnostics(response,secret){
 const redact=value=>typeof value==='string'?value.split(secret).join('[REDACTED]').replace(/[\u0000-\u001f]/g,' ').slice(0,1000):null;
 try{
  let data;
  if(typeof response.text==='function'){
   const raw=await response.text();
   try{data=JSON.parse(raw);}catch{return {parseable:false,format:'text',snippet:redact(raw)};}
  }else data=await response.json();
  return {parseable:true,type:redact(data?.error?.type),code:redact(data?.error?.code),message:redact(data?.error?.message||data?.message),reportedUsage:responseDiagnostics(data,secret).usageShape};
 }catch(error){return {parseable:false,errorType:['TimeoutError','AbortError','SyntaxError'].includes(error.name)?error.name:'Error'};}
}
function count(messages){
 const p=spawnSync(path.join(root,'.phase0-runtime/exp21-venv/bin/python'),[path.join(__dirname,'exp21-token-count.py')],{input:JSON.stringify(messages),encoding:'utf8',timeout:10000,env:{PATH:process.env.PATH,TIKTOKEN_RS_CACHE_DIR:path.join(root,'.phase0-runtime/exp21-tokenizer')}});
 if(p.status!==0||!/^\d+\s*$/.test(p.stdout))throw Error('Local tokenizer failed');return Number(p.stdout);
}
function load(variant,file,dependencies,fetchImpl){
 const source=fs.readFileSync(path.join(frozen,variant,file+'.source'),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const exports={};const context={exports,require:id=>{if(!(id in dependencies))throw Error('Unmocked dependency '+id);return dependencies[id];},fetch:fetchImpl,process:{env:{OPENAI_API_KEY:'synthetic-transport-enabled',OPENAI_MODEL:MODEL}},console:{log(){},error(){}},Date,Set,Map,Promise};
 vm.runInNewContext(js,context,{filename:file,timeout:1000});return exports;
}
function setup(variant,c,fetchImpl){
 const profileId='synthetic-profile-'+c.expert;
 const all=fixtures.sources.filter(s=>s.expert===c.expert).map(s=>({id:s.chunkIds[0],content:s.text,score:0.8,metadata:{expertProfileId:profileId,knowledgeId:s.id,title:s.id}}));
 const allowed=new Set(fixtures.sources.filter(s=>s.expert===c.expert&&s.audience==='public').flatMap(s=>s.chunkIds));
 const scope={expertProfileId:profileId,namespace:'expert_'+c.expert,allowedVectorIds:[...allowed,...fixtures.distractors.map(s=>s.id)],isOwner:false};
 const rows=variant==='candidate'?all.filter(r=>allowed.has(r.id)):all;
 const channels=c.id.startsWith('H3')?{vector:[],keyword:[]}:c.id.startsWith('H4')?{
  vector:fixtures.distractors.map(s=>({id:s.id,content:s.text,score:s.score,metadata:{expertProfileId:profileId,knowledgeId:s.id,title:s.id}})),
  keyword:all.filter(s=>s.id==='ada-public-2026-rare-tool:chunk_0')
 }:{vector:rows,keyword:[]};
 const retriever=load(variant,'src/lib/vector/retriever.ts',{'./client':{vectorStore:{query:async()=>channels.vector,keywordSearch:async()=>channels.keyword}},'./embeddings':{generateEmbedding:async()=>Array(1536).fill(0.01)}},fetchImpl);
 const prompts=load(variant,'src/lib/ai/prompts.ts',{},fetchImpl);
 const history=variant==='candidate'?load(variant,'src/lib/ai/history.ts',{},fetchImpl):{};
 const engine=load(variant,'src/lib/ai/chat-engine.ts',{
  '@/lib/vector/retriever':retriever,'@/lib/ai/prompts':prompts,'@/lib/ai/history':history,
  '@/lib/ai/web-search':{searchWeb:async()=>{throw Error('Web search prohibited');}},
  '@/lib/ai/memory-manager':{getMemories:async()=>[]},
  '@/lib/graph/graph-retriever':{graphEnhancedRetrieval:async()=>[]},
  '@/lib/knowledge/access':{resolveRetrievalScope:async()=>scope},
  '@/lib/prisma':{default:{expertProfile:{findUnique:async()=>({id:profileId,userId:c.expert,displayName:c.expert==='ada'?'Ada':'Ben',vectorNamespace:scope.namespace,ragEnabled:true})}}}
 },fetchImpl);
 // Route's exact ORDER BY/TAKE reproduced over the same synthetic rows; no DB/OAuth in this pilot.
 let chatHistory=[];
 if(c.id.startsWith('H3')){
  const messages=[...fixtures.conversations[0].messages];
  if(variant==='original')chatHistory=messages.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).slice(0,20).map(m=>({role:m.role,content:m.content}));
  else chatHistory=history.chronologicalHistory(messages.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id)).slice(0,20)).map(m=>({role:m.role,content:m.content,sources:m.sources}));
 }
 return {run:()=>engine.runChatEngine({expertId:c.expert,subscriberId:c.viewer==='ordinary-subscriber'?'synthetic-ordinary':undefined,query:c.question,chatHistory,enableWebSearch:false}),scope,channels};
}
function sequence(){return fixtures.cases.flatMap((c,i)=>(i%2?['candidate','original']:['original','candidate']).map(variant=>({caseId:c.id,variant}))).filter(item=>!item.caseId.startsWith('H1')&&!item.caseId.startsWith('H2'));}
function validatePayload(payload){
 const allowed=['model','messages','temperature','stream','max_completion_tokens','reasoning_effort','include_reasoning'];
 if(Object.keys(payload).some(k=>!allowed.includes(k))||allowed.some(k=>!(k in payload)))throw Error('Unexpected provider request field');
 if(payload.model!==MODEL||payload.stream!==false||payload.reasoning_effort!=='low'||payload.include_reasoning!==false||![0,0.5].includes(payload.temperature)||![1024,2048].includes(payload.max_completion_tokens))throw Error('Invalid provider request configuration');
 if(!Array.isArray(payload.messages)||!payload.messages.length)throw Error('Invalid provider message envelope');
 for(const m of payload.messages)if(!m||!['system','user','assistant','developer'].includes(m.role)||typeof m.content!=='string'||Object.keys(m).some(k=>!['role','content'].includes(k)))throw Error('Unexpected provider message field');
}
function envelope(body){const payload= {model:MODEL,messages:body.messages,temperature:body.temperature,stream:false,max_completion_tokens:body.stream?2048:1024,reasoning_effort:'low',include_reasoning:false};validatePayload(payload);payload.messages=payload.messages.map(m=>({role:m.role,content:m.content}));return payload;}
async function preflight(){
 const traces=[];
 for(const item of sequence()){
  const c=fixtures.cases.find(c=>c.id===item.caseId);const requests=[];
  const capture=async(url,init)=>{
   if(url!=='https://api.openai.com/v1/chat/completions')throw Error('Unexpected pipeline endpoint');
   const body=JSON.parse(init.body),stage=body.stream?'answer':'rerank',payload=envelope(body),localTokens=count(payload.messages),reserve=stage==='answer'?512:256,cap=stage==='answer'?4096:2048;
   if(localTokens+reserve>cap)throw Error('Prompt cannot fit '+item.caseId+' '+item.variant+' '+stage);
   requests.push({stage,payload,localTokens,estimatedHostFraming:reserve,inputCap:cap});
   return body.stream?{ok:true,body:{synthetic:true}}:{ok:true,json:async()=>({choices:[{message:{content:'1,2,3,4,5'}}]})};
  };
  const binding=setup(item.variant,c,capture);await binding.run();
  // Bound every possible five-chunk selection; do not assume live rerank order.
  if(requests.some(r=>r.stage==='rerank')){
   const rows=[...binding.channels.vector,...binding.channels.keyword];
   const prompt=load(item.variant,'src/lib/ai/prompts.ts',{},capture);
   const base=requests.find(r=>r.stage==='answer').payload.messages;
   const longest=[...rows].sort((a,b)=>Buffer.byteLength(b.content)-Buffer.byteLength(a.content)).slice(0,5);
   const worstSystem=prompt.getDigitalTwinSystemPrompt(c.expert==='ada'?'Ada':'Ben',undefined,null,{opinions:null,framework:null,boundaries:null})+prompt.getMemoryPrompt([])+prompt.getContextPrompt(longest.map(r=>r.content));
   const worstMessages=[{role:'system',content:worstSystem},...base.slice(1)];
   // UTF-8 bytes bound raw text BPE token count; actual empty-message rendering counts role/control framing.
   const worstUpper=worstMessages.reduce((n,m)=>n+Buffer.byteLength(m.content),0)+count(worstMessages.map(m=>({...m,content:''})))+512;
   if(worstUpper>4096)throw Error('Possible rerank selection cannot fit');
   requests.find(r=>r.stage==='answer').allSelectionUpperBound=worstUpper;
  }
  traces.push({...item,requests});
 }
 const sourceManifest=JSON.parse(fs.readFileSync(path.join(frozen,'manifest.json')));
 for(const s of sourceManifest.sourceFiles){const p=path.join(root,s.snapshot||'audit/phase0/exp7-preflight/'+s.artifact);if(sha(fs.readFileSync(p))!==s.sha256)throw Error('Frozen artifact changed');}
 const manifest={protocol:'Prepared H3-H6 continuation only; no new provider authorization',original:sourceManifest.originalCommit,candidate:sourceManifest.candidateCommit,fixturesHash:sha(fs.readFileSync(path.join(frozen,'fixtures.json'))),runnerHash:sha(fs.readFileSync(__filename)),tokenCounterHash:sha(fs.readFileSync(path.join(__dirname,'exp21-token-count.py'))),historyHash:sha(fs.readFileSync(path.join(frozen,'candidate/src/lib/ai/history.ts.source'))),tracesHash:sha(JSON.stringify(traces)),attemptCap:LIMITS.attempts,answerCap:LIMITS.answers,rerankCap:LIMITS.reranks,inputCap:LIMITS.input,outputCap:LIMITS.output,totalCap:LIMITS.total,priorSpent:PRIOR_SPENT,preservedHistory:preservedHistory(),combinedAttemptCap:16,combinedKnownAndReservedTotal:58388,combinedExactTotalUnknown:true,pacingAfterCompletionMs:65000,timeoutMs:15000,hostFraming:'512 answer / 256 rerank estimated tokens; not a proven hosted bound',freePlan:'accepted existing user confirmation; no live account/quota proof',adapters:'synthetic vectors and declared channels; mocked audience scope, profile, empty graph/memories; route history query reproduced; actual pinned retriever/prompts/chat engine executed unchanged',preflightCalls:traces.flatMap(t=>t.requests).length};
 fs.writeFileSync(path.join(out,'prompt-traces.json'),JSON.stringify(traces,null,2)+'\n');fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 return manifest;
}
async function execute(test,approved=false){
 if(!test)throw Error('Repair is offline only; further provider calls require new authorization');
 const manifest=JSON.parse(fs.readFileSync(path.join(out,'manifest.json')));
 if(JSON.stringify(manifest.preservedHistory)!==JSON.stringify(preservedHistory()))throw Error('Preserved result history changed');
 if(manifest.runnerHash!==sha(fs.readFileSync(__filename))||manifest.tokenCounterHash!==sha(fs.readFileSync(path.join(__dirname,'exp21-token-count.py')))||manifest.fixturesHash!==sha(fs.readFileSync(path.join(frozen,'fixtures.json'))))throw Error('Preflight changed');
 if(manifest.tracesHash!==sha(JSON.stringify(JSON.parse(fs.readFileSync(path.join(out,'prompt-traces.json')))))||manifest.historyHash!==sha(fs.readFileSync(path.join(frozen,'candidate/src/lib/ai/history.ts.source'))))throw Error('Frozen traces changed');
 for(const s of JSON.parse(fs.readFileSync(path.join(frozen,'manifest.json'))).sourceFiles){if(sha(fs.readFileSync(path.join(root,s.snapshot||'audit/phase0/exp7-preflight/'+s.artifact)))!==s.sha256)throw Error('Frozen source changed');}
 if(test&&(!test.fetch||test.fetch===globalThis.fetch||test.secret.LOCAL_TEST_GROQ_API_KEY!=='synthetic-mock-key'))throw Error('Invalid offline test injection');
 const ledgerFile=test?test.ledgerFile:path.join(out,'ledger.json');if(fs.existsSync(ledgerFile))throw Error('Existing ledger: no resume/retry allowed');
 const secret=test?test.secret:require('dotenv').parse(fs.readFileSync(path.join(root,'.env.local-test-groq')));
 if(!secret.LOCAL_TEST_GROQ_API_KEY||secret.LOCAL_TEST_GROQ_BASE_URL!=='https://api.groq.com/openai/v1'||secret.LOCAL_TEST_GROQ_MODEL!==MODEL)throw Error('Opaque configuration invalid');
 const ledger=createLedger(test);
 const save=()=>fs.writeFileSync(ledgerFile,JSON.stringify(ledger,null,2)+'\n');save();let lastCompletion=0,fatal;
 try{
  for(const item of sequence()){
   const c=fixtures.cases.find(c=>c.id===item.caseId);const started=performance.now();let answer;
   const transport=async(url,init)=>{
    if(fatal)throw Error('Stopped');
    let stage,payload,localTokens,inputCap;
    try{
     if(url!=='https://api.openai.com/v1/chat/completions')throw Error('Unexpected pipeline endpoint');
     const body=JSON.parse(init.body);stage=body.stream?'answer':'rerank';payload=envelope(body);localTokens=count(payload.messages);inputCap=stage==='answer'?4096:2048;
     if(localTokens+(stage==='answer'?512:256)>inputCap)throw Error('Local input reservation exceeded');
     assertAttemptBudget(ledger,stage);
    }catch(error){fatal=error.message;ledger.blocker=fatal;save();throw Error(fatal);}
    if(lastCompletion)await (test?test.sleep:sleep)(Math.max(0,65000-(Date.now()-lastCompletion)));
    const record={...item,stage,attempt:++ledger.attempts,localTokens,estimatedHostFraming:stage==='answer'?512:256,payload,startUtc:new Date().toISOString()};ledger[stage==='answer'?'answers':'reranks']++;ledger.records.push(record);save();
    process.stdout.write(JSON.stringify({event:'attempt',attempt:ledger.attempts,caseId:c.id,variant:item.variant,stage})+'\n');
    const start=performance.now();
    try{
     const response=await (test?test.fetch:fetch)(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+secret.LOCAL_TEST_GROQ_API_KEY},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
     record.headersMs=performance.now()-start;record.httpStatus=response.status??null;
     if(!response.ok){
      record.httpError=await httpErrorDiagnostics(response,secret.LOCAL_TEST_GROQ_API_KEY);
      throw Error('HTTP '+response.status);
     }
     let data;try{data=await response.json();}catch(error){if(['TimeoutError','AbortError'].includes(error.name))throw error;throw Error('Invalid response JSON');}record.latencyMs=performance.now()-start;
     record.responseDiagnostics=responseDiagnostics(data,secret.LOCAL_TEST_GROQ_API_KEY);save();
     const u=validateUsage(data);
     record.usage={prompt_tokens:u.prompt_tokens,completion_tokens:u.completion_tokens,total_tokens:u.total_tokens};ledger.promptTokens+=u.prompt_tokens;ledger.completionTokens+=u.completion_tokens;ledger.totalTokens+=u.total_tokens;
     assertUsageBudget(u,payload,inputCap,ledger);
     const failure=responseFailure(data);if(failure)throw Error(failure);
     record.content=data.choices[0].message.content.split(secret.LOCAL_TEST_GROQ_API_KEY).join('[REDACTED]');record.finishReason=data.choices[0].finish_reason;
     // Preserve the actual pinned parser's tolerant numeric extraction and score fill.
     // An extra strict comma-only schema would change the original pipeline behavior.
     record.status='ok';save();process.stdout.write(JSON.stringify({event:'complete',attempt:ledger.attempts,stage,latencyMs:record.latencyMs,usage:record.usage})+'\n');
     if(stage==='answer'){answer=record.content;return {ok:true,body:{synthetic:true}};}return {ok:true,json:async()=>data};
    }catch(error){record.status='failed';record.errorType=['TimeoutError','AbortError','SyntaxError'].includes(error.name)?error.name:'Error';record.error=error.name==='TimeoutError'||error.name==='AbortError'?'Timeout':/^(HTTP \d+|Invalid response JSON|Invalid response object|Unexpected model|Missing usage|Invalid usage|Observed accounting cap exceeded|Invalid choice shape|Provider refusal|Truncated response|Unexpected finish reason|Invalid final content|Empty final content|Unexpected tool call)$/.test(error.message)?error.message:'Transport failure (details redacted)';fatal=record.error;save();throw Error(fatal);}
    finally{lastCompletion=Date.now();}
   };
   const result=await setup(item.variant,c,transport).run();if(fatal)throw Error(fatal);
   const ids=result.sources.map(r=>r.metadata.vectorId||r.metadata.knowledgeId+':chunk_0');
   ledger.outputs.push({...item,answer,selectedChunkIds:ids,pipelineMs:performance.now()-started});save();
  }
  ledger.status='complete';
 }catch{ledger.status='stopped';ledger.blocker=fatal||'Local pipeline/preflight failure';}
 save();process.stdout.write(JSON.stringify({event:'final',status:ledger.status,attempts:ledger.attempts,answers:ledger.answers,reranks:ledger.reranks,totalTokens:ledger.totalTokens})+'\n');if(!test&&ledger.status!=='complete')process.exitCode=1;return ledger;
}
module.exports={validatePayload,validateUsage,httpErrorDiagnostics,preservedHistory,count,load,setup,sequence,envelope,preflight,execute,responseDiagnostics,responseFailure,assertAttemptBudget,assertUsageBudget,LIMITS,PRIOR_SPENT,createLedger};
if(require.main===module){(process.argv.some(a=>a.includes('execute'))?execute():preflight()).then(m=>{if(m&&!process.argv.includes('--execute-approved-exp22'))console.log(JSON.stringify(m));}).catch(()=>{console.error('Local preparation failed or execution unauthorized; no secret/error body printed');process.exitCode=1;});}
