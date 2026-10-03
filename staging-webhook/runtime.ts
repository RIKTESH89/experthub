import {credentials,receiver,type Database} from './core';
import {sharedReducer,workerHandler} from './worker';
function enabled(env:NodeJS.ProcessEnv){if(env.STAGING_WEBHOOK_ENABLED!=='true'||env.STAGING_PAYMENT_MODE!=='razorpay-test'||env.STAGING_PG_VERSION!=='16'||env.STAGING_REGION!=='aws-ap-southeast-1'||env.STAGING_PLAN!=='Free')throw new Error('Staging webhook disabled');}
function role(urls:ReturnType<typeof credentials>,expected:string){for(const url of [urls.DATABASE_URL,urls.DIRECT_URL])if(decodeURIComponent(new URL(url).username)!==expected)throw new Error('Restricted database role required');}
/** Factories stay disabled until approved setup injects exact staging metadata and restricted credentials.
 * connect must create a fresh role-specific autocommit pool, never a shared owner pool.
 */
export function publicReceiver(connect:(url:string)=>Database,env:NodeJS.ProcessEnv=process.env,wake?:()=>Promise<void>){
 enabled(env);const urls=credentials(env);role(urls,'staging_webhook_receiver');Object.assign(process.env,urls);
 return {fetch:receiver(connect(urls.DATABASE_URL),env.STAGING_RAZORPAY_TEST_WEBHOOK_SECRET||'',wake)};
}
export async function privateWorker(connect:(url:string)=>Database,env:NodeJS.ProcessEnv=process.env){
 enabled(env);const urls=credentials(env);role(urls,'staging_webhook_worker');Object.assign(process.env,urls);
 return {fetch:workerHandler(connect(urls.DATABASE_URL),env.STAGING_WEBHOOK_WORKER_SECRET||'',await sharedReducer(env))};
}
