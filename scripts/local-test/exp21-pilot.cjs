/* EXP21 synthetic-only adapted pinned pipelines. No production module or env import. */
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const {spawnSync}=require('child_process'),ts=require('typescript');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'audit/phase0/exp21');
const frozen=path.join(root,'audit/phase0/exp7-preflight');
const fixtures=JSON.parse(fs.readFileSync(path.join(frozen,'fixtures.json'),'utf8'));
const MODEL='openai/gpt-oss-120b',ENDPOINT='https://api.groq.com/openai/v1/chat/completions';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
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
  if(variant==='original')chatHistory=messages.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).slice(0,20);
  else chatHistory=history.chronologicalHistory(messages.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id)).slice(0,20));
 }
 return {run:()=>engine.runChatEngine({expertId:c.expert,subscriberId:c.viewer==='ordinary-subscriber'?'synthetic-ordinary':undefined,query:c.question,chatHistory,enableWebSearch:false}),scope,channels};
}
function sequence(){return fixtures.cases.flatMap((c,i)=>(i%2?['candidate','original']:['original','candidate']).map(variant=>({caseId:c.id,variant})));}
function envelope(body){return {model:MODEL,messages:body.messages,temperature:body.temperature,stream:false,max_tokens:body.stream?256:100};}
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
  // Enumerate every possible five-chunk generation context, since live reranking may change it.
  if(requests.some(r=>r.stage==='rerank')){
   const rows=[...binding.channels.vector,...binding.channels.keyword];
   const prompt=load(item.variant,'src/lib/ai/prompts.ts',{},capture);
   const base=requests.find(r=>r.stage==='answer').payload.messages;
   const longest=[...rows].sort((a,b)=>count([{role:'user',content:b.content}])-count([{role:'user',content:a.content}])).slice(0,5);
   // Fixed fixture rows are <= 78 ASCII chars; add conservative per-context content byte bound to existing system overhead.
   const emptySystem=prompt.getDigitalTwinSystemPrompt(c.expert==='ada'?'Ada':'Ben',undefined,null,{opinions:null,framework:null,boundaries:null})+prompt.getMemoryPrompt([])+prompt.getContextPrompt([]);
   const overhead=count([{role:'system',content:emptySystem},...base.slice(1)]);
   const worstUpper=overhead+longest.reduce((n,r)=>n+Buffer.byteLength(r.content),0)+100+512;
   if(worstUpper>4096)throw Error('Possible rerank selection cannot fit');
   requests.find(r=>r.stage==='answer').allSelectionUpperBound=worstUpper;
  }
  traces.push({...item,requests});
 }
 const sourceManifest=JSON.parse(fs.readFileSync(path.join(frozen,'manifest.json')));
 for(const s of sourceManifest.sourceFiles){const p=path.join(root,s.snapshot||'audit/phase0/exp7-preflight/'+s.artifact);if(sha(fs.readFileSync(p))!==s.sha256)throw Error('Frozen artifact changed');}
 const manifest={protocol:'EXP21 approved 2026-10-01 06:03 UTC',original:sourceManifest.originalCommit,candidate:sourceManifest.candidateCommit,fixturesHash:sha(fs.readFileSync(path.join(frozen,'fixtures.json'))),runnerHash:sha(fs.readFileSync(__filename)),tokenCounterHash:sha(fs.readFileSync(path.join(__dirname,'exp21-token-count.py'))),historyHash:sha(fs.readFileSync(path.join(frozen,'candidate/src/lib/ai/history.ts.source'))),tracesHash:sha(JSON.stringify(traces)),attemptCap:24,answerCap:12,rerankCap:12,inputCap:73728,outputCap:4272,totalCap:78000,pacingAfterCompletionMs:65000,timeoutMs:15000,hostFraming:'512 answer / 256 rerank estimated tokens; not a proven hosted bound',freePlan:'accepted existing user confirmation; no live account/quota proof',adapters:'synthetic vectors and declared channels; mocked audience scope, profile, empty graph/memories; route history query reproduced; actual pinned retriever/prompts/chat engine executed unchanged',preflightCalls:traces.flatMap(t=>t.requests).length};
 fs.writeFileSync(path.join(out,'prompt-traces.json'),JSON.stringify(traces,null,2)+'\n');fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 return manifest;
}
async function execute(test){
 const manifest=JSON.parse(fs.readFileSync(path.join(out,'manifest.json')));
 if(manifest.runnerHash!==sha(fs.readFileSync(__filename))||manifest.tokenCounterHash!==sha(fs.readFileSync(path.join(__dirname,'exp21-token-count.py')))||manifest.fixturesHash!==sha(fs.readFileSync(path.join(frozen,'fixtures.json'))))throw Error('Preflight changed');
 if(manifest.tracesHash!==sha(JSON.stringify(JSON.parse(fs.readFileSync(path.join(out,'prompt-traces.json')))))||manifest.historyHash!==sha(fs.readFileSync(path.join(frozen,'candidate/src/lib/ai/history.ts.source'))))throw Error('Frozen traces changed');
 for(const s of JSON.parse(fs.readFileSync(path.join(frozen,'manifest.json'))).sourceFiles){if(sha(fs.readFileSync(path.join(root,s.snapshot||'audit/phase0/exp7-preflight/'+s.artifact)))!==s.sha256)throw Error('Frozen source changed');}
 if(test&&(!test.fetch||test.fetch===globalThis.fetch||test.secret.LOCAL_TEST_GROQ_API_KEY!=='synthetic-mock-key'))throw Error('Invalid offline test injection');
 const ledgerFile=test?test.ledgerFile:path.join(out,'ledger.json');if(fs.existsSync(ledgerFile))throw Error('Existing ledger: no resume/retry allowed');
 const secret=test?test.secret:require('dotenv').parse(fs.readFileSync(path.join(root,'.env.local-test-groq')));
 if(!secret.LOCAL_TEST_GROQ_API_KEY||secret.LOCAL_TEST_GROQ_BASE_URL!=='https://api.groq.com/openai/v1'||secret.LOCAL_TEST_GROQ_MODEL!==MODEL)throw Error('Opaque configuration invalid');
 const ledger={status:'running',attempts:0,answers:0,reranks:0,promptTokens:0,completionTokens:0,totalTokens:0,records:[],outputs:[],dollarCost:null,naturalness:'unvalidated without human ratings'};
 const save=()=>fs.writeFileSync(ledgerFile,JSON.stringify(ledger,null,2)+'\n');save();let lastCompletion=0,fatal;
 try{
  for(const item of sequence()){
   const c=fixtures.cases.find(c=>c.id===item.caseId);const started=performance.now();let answer;
   const transport=async(url,init)=>{
    if(fatal)throw Error('Stopped');
    if(url!=='https://api.openai.com/v1/chat/completions')throw Error('Unexpected pipeline endpoint');
    const body=JSON.parse(init.body),stage=body.stream?'answer':'rerank',payload=envelope(body),localTokens=count(payload.messages),inputCap=stage==='answer'?4096:2048;
    if(localTokens+(stage==='answer'?512:256)>inputCap)throw Error('Local input reservation exceeded');
    if(ledger.attempts>=24||ledger[stage==='answer'?'answers':'reranks']>=12)throw Error('Attempt cap exceeded');
    if(lastCompletion)await (test?test.sleep:sleep)(Math.max(0,65000-(Date.now()-lastCompletion)));
    const record={...item,stage,attempt:++ledger.attempts,localTokens,estimatedHostFraming:stage==='answer'?512:256,payload,startUtc:new Date().toISOString()};ledger[stage==='answer'?'answers':'reranks']++;ledger.records.push(record);save();
    process.stdout.write(JSON.stringify({event:'attempt',attempt:ledger.attempts,caseId:c.id,variant:item.variant,stage})+'\n');
    const start=performance.now();
    try{
     const response=await (test?test.fetch:fetch)(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+secret.LOCAL_TEST_GROQ_API_KEY},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
     record.headersMs=performance.now()-start;
     if(!response.ok)throw Error('HTTP '+response.status);
     const data=await response.json();record.latencyMs=performance.now()-start;
     const u=data.usage;
     if(data.model!==MODEL||!u||!['prompt_tokens','completion_tokens','total_tokens'].every(k=>Number.isInteger(u[k])&&u[k]>=0)||u.total_tokens!==u.prompt_tokens+u.completion_tokens)throw Error('Missing/invalid model or usage');
     record.usage={prompt_tokens:u.prompt_tokens,completion_tokens:u.completion_tokens,total_tokens:u.total_tokens};ledger.promptTokens+=u.prompt_tokens;ledger.completionTokens+=u.completion_tokens;ledger.totalTokens+=u.total_tokens;
     if(u.prompt_tokens>inputCap||u.completion_tokens>payload.max_tokens||ledger.promptTokens>73728||ledger.completionTokens>4272||ledger.totalTokens>78000)throw Error('Observed accounting cap exceeded');
     if(data.choices?.length!==1||data.choices[0].finish_reason!=='stop'||typeof data.choices[0].message?.content!=='string')throw Error('Incomplete/invalid response');
     record.content=data.choices[0].message.content;record.finishReason=data.choices[0].finish_reason;
     if(stage==='rerank'&&!/^\s*\d+(?:\s*[,\s]\s*\d+)*\s*$/.test(record.content))throw Error('Invalid rerank schema');
     record.status='ok';save();process.stdout.write(JSON.stringify({event:'complete',attempt:ledger.attempts,stage,latencyMs:record.latencyMs,usage:record.usage})+'\n');
     if(stage==='answer'){answer=record.content;return {ok:true,body:{synthetic:true}};}return {ok:true,json:async()=>data};
    }catch(error){record.status='failed';record.error=error.name==='TimeoutError'?'Timeout':/^(HTTP \d+|Missing\/invalid model or usage|Observed accounting cap exceeded|Incomplete\/invalid response|Invalid rerank schema)$/.test(error.message)?error.message:'Transport failure (details redacted)';fatal=record.error;save();throw Error(fatal);}
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
module.exports={count,load,setup,sequence,envelope,preflight,execute};
if(require.main===module){(process.argv.includes('--execute-approved-exp21')?execute():preflight()).then(m=>{if(m)console.log(JSON.stringify(m));}).catch(()=>{console.error('EXP21 local preflight failed; no secret/error body printed');process.exitCode=1;});}
