import { BillingRuntimeError } from './billing-runtime';
/** Call only after fresh ADMIN/origin authorization. Retained body bytes never exceed
 * the limit; cancel errors/abort are observed without waiting on a hostile source. */
export async function readBillingReviewBody(request:Request,maxBytes=32768,budgetMs=5000):Promise<unknown> {
 const cancelBody=()=>{if(request.body&&!request.body.locked)void request.body.cancel().catch(()=>{});};
 const advertised=request.headers.get('content-length');
 if(advertised!==null&&(!/^\d+$/.test(advertised)||Number(advertised)>maxBytes)) {cancelBody();throw new BillingRuntimeError('Request too large',413);}
 if(request.signal.aborted){cancelBody();throw new BillingRuntimeError('Request aborted',400);}
 if(!request.body)throw new BillingRuntimeError('Invalid request body',400);
 const reader=request.body.getReader(),chunks:Uint8Array[]=[];let bytes=0;
 let timer:ReturnType<typeof setTimeout>|undefined,abort:()=>void=()=>{};
 const stopped=new Promise<never>((_,reject)=>{
  abort=()=>reject(new BillingRuntimeError('Request aborted',400));
  request.signal.addEventListener('abort',abort,{once:true});
  timer=setTimeout(()=>reject(new BillingRuntimeError('Request body timeout',408)),budgetMs);
 });
 try {
  while(true){
   const {done,value}=await Promise.race([reader.read(),stopped]);if(done)break;
   if(!(value instanceof Uint8Array))throw new BillingRuntimeError('Invalid request body',400);
   bytes+=value.byteLength;if(bytes>maxBytes)throw new BillingRuntimeError('Request too large',413);
   chunks.push(value);
  }
  if(request.signal.aborted)throw new BillingRuntimeError('Request aborted',400);
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,bytes)));
 }catch(error){
  void reader.cancel().catch(()=>{});
  if(error instanceof BillingRuntimeError)throw error;
  throw new BillingRuntimeError('Invalid request body',400);
 }finally {
  if(timer)clearTimeout(timer);request.signal.removeEventListener('abort',abort);
  try{reader.releaseLock();}catch{/* A cancelled outstanding read releases asynchronously. */}
 }
}
