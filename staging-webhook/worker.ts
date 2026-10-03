import { drainOne,workerAuthorization,type WorkerDatabase,type Apply } from './core';
export function workerHandler(db:WorkerDatabase,secret:string,apply:Apply,budgetMs=45000){
 return async(request:Request)=>{
  if(request.method!=='POST')return new Response(null,{status:405});
  if(!workerAuthorization(request.headers.get('authorization'),secret))return new Response(null,{status:401});
  const operation={deadline:Date.now()+budgetMs,signal:request.signal};
  try{let processed=0;while(processed<32&&Date.now()<operation.deadline&&await drainOne(db,apply,8,operation))processed++;return Response.json({processed});}
  catch{return new Response(null,{status:503});}
 };
}
