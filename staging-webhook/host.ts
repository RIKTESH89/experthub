import {readBody,stagingIdentity,workerAuthorization} from './core';
import {enabled,publicReceiver,privateWorker} from './runtime';
export const receiverPath='/razorpay-test';
export const workerPath='/drain';
export const recoveryPath='/recover';
type Service={fetch:(request:Request)=>Promise<Response>;close:()=>Promise<void>};
type Hooks={env?:NodeJS.ProcessEnv;receiver?:typeof publicReceiver;worker?:typeof privateWorker;fetch?:typeof fetch;waitUntil?:(promise:Promise<unknown>)=>void};
function path(request:Request,expected:string){const url=new URL(request.url);return url.pathname===expected&&!url.search;}
function routeError(request:Request,expected:string){if(!path(request,expected))return new Response(null,{status:404});if(request.method!=='POST')return new Response(null,{status:405,headers:{allow:'POST'}});}
function secret(env:NodeJS.ProcessEnv,key:string){const value=env[key];if(!value||value.length<32)throw new Error('Secret unavailable');return value;}
export function wakeContract(env:NodeJS.ProcessEnv){
 if(env.STAGING_WEBHOOK_WAKE_ENABLED!=='true')return null;
 const url=new URL(env.STAGING_WEBHOOK_WORKER_URL||''),host=env.STAGING_WEBHOOK_WORKER_HOST;
 if(!host||url.hostname!==host||url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash||url.pathname!==workerPath||env.STAGING_WEBHOOK_WORKER_BRANCH_ID!==stagingIdentity.branch)throw new Error('Wake target unavailable');
 const auth=secret(env,'STAGING_WEBHOOK_WORKER_SECRET');if(auth===env.STAGING_RAZORPAY_TEST_WEBHOOK_SECRET)throw new Error('Distinct secrets required');
 return {url:url.toString(),auth};
}
/** Generic raw HTTP surface never trusts X-Neon-* headers. */
export function receiverAdapter(hooks:Hooks={}){
 const env=hooks.env||process.env;let service:Service|undefined;
 const wake=async()=>{
  const contract=wakeContract(env);if(!contract)return;
  const run=(hooks.fetch||fetch)(contract.url,{method:'POST',headers:{authorization:`Bearer ${contract.auth}`},redirect:'error',signal:AbortSignal.timeout(5000)}).then(response=>{if(!response.ok)throw new Error('Wake rejected');});
  // Only Neon entrypoint supplies waitUntil; no generic rawHTTP assumption.
  hooks.waitUntil?.(run);await run;
 };
 return {fetch:async(request:Request)=>{
  const invalid=routeError(request,receiverPath);if(invalid)return invalid;
  try{enabled(env);secret(env,'STAGING_RAZORPAY_TEST_WEBHOOK_SECRET');wakeContract(env);
   if(!/^[a-f0-9]{64}$/i.test(request.headers.get('x-razorpay-signature')||''))return new Response(null,{status:400});
   service ||= (hooks.receiver||publicReceiver)(env,wake);return await service.fetch(request);
  }catch{return new Response(null,{status:503});}
 },close:()=>service?.close()||Promise.resolve()};
}
export function workerAdapter(hooks:Hooks={}){
 const env=hooks.env||process.env;let service:Promise<Service>|undefined;
 return {fetch:async(request:Request)=>{
  const invalid=routeError(request,workerPath);if(invalid)return invalid;
  try{enabled(env);const auth=secret(env,'STAGING_WEBHOOK_WORKER_SECRET');
   if(!workerAuthorization(request.headers.get('authorization'),auth))return new Response(null,{status:401});
   service ||= (hooks.worker||privateWorker)(env).catch(error=>{service=undefined;throw error;});
   return await (await service).fetch(request);
  }catch{return new Response(null,{status:503});}
 },close:async()=>{if(service)await(await service).close();}};
}
/** ONLY a module deployed directly behind Neon edge may trust stripped X-Neon-*.
 * This factory is intentionally separate from generic workerAdapter/raw HTTP server.
 */
export function neonWorkerAdapter(hooks:Hooks={}){
 const env=hooks.env||process.env,generic=workerAdapter(hooks);
 return {fetch:async(request:Request)=>{
  if(!path(request,recoveryPath))return generic.fetch(request);
  if(request.method!=='POST')return new Response(null,{status:405,headers:{allow:'POST'}});
  if(env.STAGING_WEBHOOK_RECOVERY_ENABLED!=='true')return new Response(null,{status:503});
  const invocation=request.headers.get('x-neon-trigger-invocation-id'),triggerId=env.STAGING_WEBHOOK_RECOVERY_TRIGGER_ID;
  if(!invocation||!triggerId)return new Response(null,{status:403});
  try{
   enabled(env);const auth=secret(env,'STAGING_WEBHOOK_WORKER_SECRET');
   const raw=await readBody(request,5000);if(raw.length>4096)return new Response(null,{status:413});const envelope=JSON.parse(raw.toString('utf8'));
   if(envelope.version!==1||envelope.invocation_id!==invocation||envelope.trigger?.type!=='schedule'||envelope.trigger?.id!==triggerId||typeof envelope.data?.scheduled_at!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(envelope.data.scheduled_at)||!Number.isFinite(Date.parse(envelope.data.scheduled_at)))return new Response(null,{status:400});
   // No HTTP relay: construct authenticated internal drain request with original abort signal.
   return generic.fetch(new Request(new URL(workerPath,request.url),{method:'POST',headers:{authorization:`Bearer ${auth}`},signal:request.signal}));
  }catch{return new Response(null,{status:400});}
 },close:generic.close};
}
