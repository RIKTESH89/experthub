import { drainBillingOutbox, type BillingOutboxStore } from './outbox';
import { billingEmailConfiguration, makeBillingEmailDelivery, type BillingEmailPreparationStore, type EmailTransport } from './billing-email';
import { assertBillingEnabled, requireWorkerCredential } from './billing-runtime';
export async function runBillingWorker(authorization:string|null,deps:{store:BillingOutboxStore;preparation:BillingEmailPreparationStore;env?:NodeJS.ProcessEnv;makeTransport?:(key:string)=>EmailTransport;now?:()=>Date}) {
 const env=deps.env||process.env;
 assertBillingEnabled('BILLING_WORKER_ENABLED',env);requireWorkerCredential(authorization,env);billingEmailConfiguration(env);
 const tokens=new Map<string,string>();
 const store={...deps.store,claim:async(...args:Parameters<BillingOutboxStore['claim']>)=>{assertBillingEnabled('BILLING_WORKER_ENABLED',env);const rows=await deps.store.claim(...args);for(const row of rows)tokens.set(row.id,row.leaseToken);return rows;}};
 const deliver=makeBillingEmailDelivery(deps.preparation,id=>tokens.get(id)||'',env,deps.makeTransport,deps.now);
 const processed=await drainBillingOutbox(store,deliver,deps.now?.()||new Date(),5,3);return {processed};
}
