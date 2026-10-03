import {credentials,receiver} from './core';
import {workerHandler} from './worker';
import {database,isolatedClient} from './database';
export function enabled(env:NodeJS.ProcessEnv){if(env.STAGING_WEBHOOK_ENABLED!=='true'||env.STAGING_PAYMENT_MODE!=='razorpay-test'||env.STAGING_PG_VERSION!=='16'||env.STAGING_REGION!=='aws-ap-southeast-1'||env.STAGING_PLAN!=='Free')throw new Error('Staging webhook disabled');}
export function publicReceiver(env:NodeJS.ProcessEnv=process.env,wake?:()=>Promise<void>){
 enabled(env);const urls=credentials(env,'staging_webhook_receiver');Object.assign(process.env,urls);
 const client=isolatedClient(urls.DATABASE_URL);
 return {fetch:receiver(database(client),env.STAGING_RAZORPAY_TEST_WEBHOOK_SECRET||'',wake),close:()=>client.$disconnect()};
}
export async function privateWorker(env:NodeJS.ProcessEnv=process.env){
 enabled(env);const urls=credentials(env,'staging_webhook_worker');Object.assign(process.env,urls);
 const client=isolatedClient(urls.DATABASE_URL);
 const {applyPaymentSnapshotInTransaction}=await import('../src/lib/payments/state');
 return {fetch:workerHandler(database(client),env.STAGING_WEBHOOK_WORKER_SECRET||'',applyPaymentSnapshotInTransaction),close:()=>client.$disconnect()};
}
