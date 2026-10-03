import { createHash, timingSafeEqual } from 'crypto';
import { isPreviewIsolated } from '@/lib/preview-isolation';
export class BillingRuntimeError extends Error { constructor(message:string,public status=503){super(message);} }
export function assertBillingEnabled(flag:string, env:NodeJS.ProcessEnv=process.env) {
 if(isPreviewIsolated() || env.VERCEL_ENV==='preview' || env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED==='true' || env[flag]!=='true')throw new BillingRuntimeError('Billing operation disabled');
}
export function requireWorkerCredential(header:string|null,env:NodeJS.ProcessEnv=process.env) {
 const secret=env.BILLING_WORKER_SECRET;
 if(!secret || secret.trim().length<32)throw new BillingRuntimeError('Billing worker unavailable');
 const supplied=header?.startsWith('Bearer ')?header.slice(7):'';
 const digest=(s:string)=>createHash('sha256').update(s).digest();
 if(!timingSafeEqual(digest(secret),digest(supplied)))throw new BillingRuntimeError('Unauthorized',401);
}
/** Timeout is an unknown outcome; losing promise is observed, never retried inline. */
export async function billingTimeout<T>(operation:()=>Promise<T>,milliseconds:number):Promise<T> {
 let timer:ReturnType<typeof setTimeout>|undefined;
 try {return await Promise.race([Promise.resolve().then(operation),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('billing-operation-timeout')),milliseconds);})]);}
 finally {if(timer)clearTimeout(timer);}
}
