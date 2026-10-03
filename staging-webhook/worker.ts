import { credentials, drainOne, workerAuthorization, type Database } from './core';
/** Inject private worker DB; public receiver must never receive this adapter. */
export function workerHandler(db:Database,secret:string,apply:Parameters<typeof drainOne>[1]) {
 return async(request:Request)=> {
  if(request.method!=='POST')return new Response(null,{status:405});
  if(!workerAuthorization(request.headers.get('authorization'),secret))return new Response(null,{status:401});
  try {let processed=0;const deadline=Date.now()+45000;
   while(processed<32&&Date.now()<deadline&&await drainOne(db,apply))processed++;
   return Response.json({processed});
  }catch{return new Response(null,{status:503});}
 };
}
/** Invoke only in the restricted worker process before any shared Prisma import. */
export async function sharedReducer(env:NodeJS.ProcessEnv=process.env) {
 Object.assign(process.env,credentials(env));
 const {applyPaymentSnapshot}=await import('../src/lib/payments/state');
 return applyPaymentSnapshot;
}
// No timers or hosted schedules. Future recovery scheduler invokes authenticated handler
// every 30 minutes; injected best-effort wake may invoke it immediately after inbox commit.
