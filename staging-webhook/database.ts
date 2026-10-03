import { PrismaClient, type Prisma } from '@prisma/client';
import type { Database, WorkerDatabase, Transaction, Operation } from './core';
export class DeadlineError extends Error {}
export function remaining(operation:Operation) {
 const ms=operation.deadline-Date.now();
 if(operation.signal.aborted||ms<=0)throw new DeadlineError('Operation deadline or abort');
 return Math.max(1,Math.floor(ms));
}
/** Race exists INSIDE the interactive transaction. Abort throws into its callback,
 * and callers await Prisma's rollback before returning. Late callbacks only hold a
 * closed TransactionClient: queries fail, never commit in another transaction.
 */
function abortable<T>(operation:Operation,action:()=>Promise<T>):Promise<T> {
 remaining(operation);
 return new Promise((resolve,reject)=>{
  let settled=false;
  const cleanup=()=>{clearTimeout(timer);operation.signal.removeEventListener('abort',fail);};
  const finish=(error:unknown,value?:T)=>{if(settled)return;settled=true;cleanup();if(error)reject(error);else resolve(value!);};
  const fail=()=>finish(new DeadlineError('Operation deadline or abort'));
  const timer=setTimeout(fail,remaining(operation));
  operation.signal.addEventListener('abort',fail,{once:true});
  Promise.resolve().then(action).then(value=>finish(null,value),error=>finish(error));
 });
}
export function database(client:PrismaClient):WorkerDatabase {
 async function transaction<T>(operation:Operation,action:(tx:Transaction)=>Promise<T>):Promise<T> {
  const ms=remaining(operation);
  return client.$transaction(async raw=>{
   const tx:Transaction={raw,query:async(sql,values=[])=>{
    remaining(operation);
    return {rows:await raw.$queryRawUnsafe<any[]>(sql,...values)};
   }};
   return abortable(operation,async()=>{
    await raw.$queryRawUnsafe("SELECT set_config('statement_timeout',$1,true),set_config('lock_timeout',$1,true),set_config('idle_in_transaction_session_timeout',$2,true)",`${Math.max(1,remaining(operation))}ms`,`${Math.max(1,remaining(operation))+1000}ms`);
    const result=await action(tx);remaining(operation);return result;
   });
  },{timeout:ms,maxWait:Math.min(1000,ms)});
 }
 return {
  transaction,
  query:(sql,values=[],operation={deadline:Date.now()+5000,signal:new AbortController().signal})=>transaction(operation,tx=>tx.query(sql,values)),
 };
}
/** Explicit instance: never reuse globalForPrisma or any owner client. */
export function isolatedClient(url:string):PrismaClient {
 const parsed=new URL(url);parsed.searchParams.set('connect_timeout','5');parsed.searchParams.set('pool_timeout','1');
 return new PrismaClient({datasources:{db:{url:parsed.toString()}},transactionOptions:{maxWait:1000,timeout:45000}});
}
