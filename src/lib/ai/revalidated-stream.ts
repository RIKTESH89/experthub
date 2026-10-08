/** Check after each provider read and before handing that chunk (or EOF) downstream.
 * Demand-driven, no prefetch. Already handed-off bytes cannot be recalled. This is
 * a fresh check boundary, not atomic SQL/network delivery or a silent-provider poll.
 */
export function revalidatedStream(body: ReadableStream<Uint8Array>, authorize:()=>Promise<void>, signal?:AbortSignal):ReadableStream<Uint8Array> {
 const reader=body.getReader();let ended=false;
 let stop:(()=>void)|undefined;
 const detach=()=>{if(stop)signal?.removeEventListener('abort',stop);};
 const release=()=>{try{reader.releaseLock();}catch{/* a cancelled read may still be settling */}};
 const cancel=async(reason?:unknown)=>{await reader.cancel(reason).catch(()=>{});release();};
 return new ReadableStream<Uint8Array>({
  start(controller){
   stop=()=>{if(ended)return;ended=true;detach();controller.error(signal?.reason);void cancel(signal?.reason);};
   signal?.addEventListener('abort',stop,{once:true});if(signal?.aborted)stop();
  },
  async pull(controller){
   if(ended)return;
   try{
    const next=await reader.read();if(ended)return;
    await authorize();if(ended)return;
    if(next.done){ended=true;detach();release();controller.close();}
    else controller.enqueue(next.value);
   }catch(error){
    if(!ended){ended=true;detach();controller.error(error);}await cancel(error);
   }
  },
  async cancel(reason){ended=true;detach();await cancel(reason);},
 },{highWaterMark:0});
}
