import { makeBillingEmailDelivery, type PreparedBillingEmail } from '../../src/lib/payments/billing-email';
import { makeProviderRecoveryLookup, type RecoveryIntent } from '../../src/lib/payments/provider-lookup';
import { runBillingWorker } from '../../src/lib/payments/billing-worker';
import { reviewBilling, type BillingReviewDependencies } from '../../src/lib/payments/billing-review';
const env:NodeJS.ProcessEnv={NODE_ENV:"test",BILLING_WORKER_ENABLED:'true',BILLING_EMAIL_DELIVERY_ENABLED:'true',BILLING_PROVIDER_LOOKUP_ENABLED:'true',BILLING_REVIEW_ENABLED:'true',BILLING_WORKER_SECRET:'synthetic-worker-credential-no-real-service',BILLING_REVIEW_SECRET:'synthetic-review-signing-no-real-service',RESEND_API_KEY:'re_synthetic_no_calls',EMAIL_FROM:'Synthetic <billing@example.invalid>',RAZORPAY_KEY_ID:'rzp_test_synthetic',RAZORPAY_KEY_SECRET:'synthetic-no-calls',NEXT_PUBLIC_APP_URL:'https://app.example.invalid'};
const intent:RecoveryIntent={id:'intent',version:2,state:'UNKNOWN',subscriberId:'visitor',expertProfileId:'expert',tier:'PREMIUM',price:10,planId:'plan'};
const candidate={id:'remote',plan_id:'plan',status:'created',notes:{provisioningIntentId:'intent',subscriberId:'visitor',expertProfileId:'expert',tier:'PREMIUM'}};
const fakeClient=()=>({subscriptions:{all:jest.fn(async()=>({items:[candidate]})),fetch:jest.fn(async()=>candidate)},plans:{fetch:jest.fn(async()=>({id:'plan',period:'monthly',interval:1,item:{amount:1000,currency:'INR'}}))},payments:{fetch:jest.fn(async()=>({id:'payment',status:'captured',captured:true,amount_refunded:0,invoice_id:'invoice'}))},invoices:{fetch:jest.fn(async()=>({id:'invoice',subscription_id:'remote',payment_id:'payment',status:'paid',billing_start:1790000000,billing_end:1791000000}))}});
const now=new Date('2026-10-03T00:00:00Z');
const prepared:PreparedBillingEmail={kind:'email',firstAttemptAt:now.toISOString(),message:{from:env.EMAIL_FROM!,to:'owner@example.invalid',subject:'Synthetic',html:'<p>Synthetic</p>'}};
test('success but acknowledgement lost retries identical message and stable key',async()=>{
 const send=jest.fn().mockRejectedValueOnce(Error('accepted remote response lost')).mockResolvedValue({data:{id:'same-id'}});
 const deliver=makeBillingEmailDelivery({prepare:async()=>prepared,owns:async()=>true},()=> 'lease',env,()=>({send}),()=>now);
 await expect(deliver({},'outbox-id')).rejects.toThrow('ack-unknown');await deliver({},'outbox-id');
 expect(send.mock.calls[0]).toEqual(send.mock.calls[1]);expect(send.mock.calls[0][1].idempotencyKey).toMatch(/^billing\/[a-f0-9]{64}$/);
});
test('provider retention cutoff stops ambiguous email retry and rejects permanent failures',async()=>{
 const send=jest.fn(async()=>({error:{name:'validation_error',statusCode:422}}));
 const store={prepare:async()=>prepared,owns:async()=>true};const deliver=makeBillingEmailDelivery(store,()=> 'lease',env,()=>({send}),()=>now);
 await expect(deliver({},'job')).rejects.toThrow('rejected');
 const late=makeBillingEmailDelivery(store,()=> 'lease',env,()=>({send}),()=>new Date(now.getTime()+23*3600_000));await expect(late({},'job')).rejects.toThrow('ambiguity-review');expect(send).toHaveBeenCalledTimes(1);
});
test('email request timeout is unknown, observed and not retried inline',async()=>{
 jest.useFakeTimers();const send=jest.fn(()=>new Promise<never>(()=>{}));
 try {const deliver=makeBillingEmailDelivery({prepare:async()=>prepared,owns:async()=>true},()=> 'lease',env,()=>({send}),()=>now);const result=expect(deliver({},'job')).rejects.toThrow('ack-unknown');await jest.advanceTimersByTimeAsync(10_001);await result;expect(send).toHaveBeenCalledTimes(1);}finally{jest.useRealTimers();}
});
test.each([{...env,BILLING_EMAIL_DELIVERY_ENABLED:'false'},{...env,RESEND_API_KEY:'bad'},{...env,VERCEL_ENV:'preview'},{...env,NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED:'true'}])('disabled invalid credentials and Preview prevent email preparation and transport',configuration=>{
 const prepare=jest.fn(),transport=jest.fn();expect(()=>makeBillingEmailDelivery({prepare,owns:async()=>true},()=> 'lease',configuration,transport)).toThrow();expect(prepare).not.toHaveBeenCalled();expect(transport).not.toHaveBeenCalled();
});
test('worker purpose-specific authentication fails before claiming jobs',async()=>{
 const store={claim:jest.fn(),owns:jest.fn(),settle:jest.fn()},preparation={prepare:jest.fn(),owns:async()=>true};
 for(const configuration of [{...env,BILLING_WORKER_SECRET:undefined},{...env,BILLING_WORKER_ENABLED:'false'},{...env,VERCEL_ENV:'preview'},env])await expect(runBillingWorker('Bearer wrong',{store,preparation,env:configuration})).rejects.toThrow();
 expect(store.claim).not.toHaveBeenCalled();
});
test('lookup binds exact notes and pricing; multiple matches and incomplete pages stay uncertain',async()=>{
 const client=fakeClient();const lookup=makeProviderRecoveryLookup(env,()=>client);expect((await lookup.recover(intent)).outcome).toBe('candidate');
 client.subscriptions.all.mockResolvedValue({items:[candidate,candidate]});expect((await lookup.recover(intent)).outcome).toBe('review-required');
 client.subscriptions.all.mockResolvedValue({items:Array.from({length:50},()=>candidate)});expect((await lookup.recover(intent)).outcome).toBe('review-required');expect(client.subscriptions.all).toHaveBeenCalledTimes(4);
 client.subscriptions.all.mockResolvedValue({items:[]});expect((await lookup.recover(intent)).outcome).toBe('review-required');
 client.subscriptions.all.mockResolvedValue({items:[{...candidate,notes:{...candidate.notes,subscriberId:'other'}}]});expect((await lookup.recover(intent)).outcome).toBe('review-required');
});
test('lookup timeout has bounded budget and never creates/cancels provider objects',async()=>{
 jest.useFakeTimers();const client=fakeClient();client.subscriptions.all.mockImplementation(()=>new Promise(()=>{}));
 try {const pending=makeProviderRecoveryLookup(env,()=>client).recover(intent);await jest.advanceTimersByTimeAsync(5001);expect((await pending).outcome).toBe('unavailable');expect(client.subscriptions.all).toHaveBeenCalledTimes(1);}finally{jest.useRealTimers();}
});
test('lookup enforces Test Mode credentials and Preview isolation before provider factory',async()=>{
 const factory=jest.fn(fakeClient);for(const configuration of [{...env,RAZORPAY_KEY_ID:'rzp_live_forbidden'},{...env,RAZORPAY_KEY_SECRET:''},{...env,VERCEL_ENV:'preview'},{...env,BILLING_PROVIDER_LOOKUP_ENABLED:'false'}])await expect(makeProviderRecoveryLookup(configuration,factory).recover(intent)).rejects.toThrow();expect(factory).not.toHaveBeenCalled();
});
test('paid lookup requires captured payment linked to paid subscription invoice and exact dates',async()=>{
 const client=fakeClient();const lookup=makeProviderRecoveryLookup(env,()=>client);expect((await lookup.paidPeriod('remote','payment')).start).toEqual(new Date(1790000000*1000));
 client.invoices.fetch.mockResolvedValue({...await client.invoices.fetch(),subscription_id:'wrong'});await expect(lookup.paidPeriod('remote','payment')).rejects.toThrow();
 client.invoices.fetch.mockResolvedValue({id:'invoice',subscription_id:'remote',payment_id:'payment',status:'paid',billing_start:0,billing_end:1791000000});await expect(lookup.paidPeriod('remote','payment')).rejects.toThrow();
});
function reviewDeps():BillingReviewDependencies {
 return {env,now:()=>now,actor:async()=>({id:'admin',role:'ADMIN'}),loadRow:async()=>({id:'sub',version:2,providerId:'remote',cancelled:true}),loadIntent:async()=>intent,lookup:makeProviderRecoveryLookup(env,fakeClient),reconciliation:()=>({apply:jest.fn(async()=>true)}),provisioning:()=>({claim:jest.fn(),save:jest.fn(),attach:jest.fn(async()=>{})})};
}
test('review defaults to server-produced dry-run; tampered signature actor origin and stale time rejected',async()=>{
 const deps=reviewDeps(),result=await reviewBilling({action:'plan',kind:'reconcile',id:'sub',paymentId:'payment'},env.NEXT_PUBLIC_APP_URL!,deps) as any;
 expect(result.outcome).toBe('dry-run');
 await expect(reviewBilling({action:'apply',token:result.token+'a',reviewedDigest:result.reviewedDigest},env.NEXT_PUBLIC_APP_URL!,deps)).rejects.toThrow('signature');
 await expect(reviewBilling({action:'apply',token:result.token,reviewedDigest:result.reviewedDigest},env.NEXT_PUBLIC_APP_URL!,{...deps,actor:async()=>({id:'other',role:'ADMIN'})})).rejects.toThrow('actor');
 await expect(reviewBilling({action:'apply',token:result.token,reviewedDigest:result.reviewedDigest},env.NEXT_PUBLIC_APP_URL!,{...deps,now:()=>new Date(now.getTime()+600001)})).rejects.toThrow('expired');
 await expect(reviewBilling({action:'plan',kind:'recover',id:'intent'},'https://evil.invalid',deps)).rejects.toThrow('origin');
 await expect(reviewBilling({},env.NEXT_PUBLIC_APP_URL!,{...deps,actor:async()=>({id:'visitor',role:'SUBSCRIBER'})})).rejects.toThrow('Administrator');
 expect((await reviewBilling({action:'apply',token:result.token,reviewedDigest:result.reviewedDigest},env.NEXT_PUBLIC_APP_URL!,deps)).outcome).toBe('applied');
});
test('review Preview gate occurs before session DB and lookup',async()=>{
 const deps=reviewDeps(),actor=jest.fn(deps.actor);await expect(reviewBilling({},env.NEXT_PUBLIC_APP_URL!,{...deps,env:{...env,VERCEL_ENV:'preview'},actor})).rejects.toThrow('disabled');expect(actor).not.toHaveBeenCalled();
});
test('concurrent idempotent request response retries stable payload while payload-conflict is terminal',async()=>{
 const send=jest.fn().mockResolvedValueOnce({error:{name:'concurrent_idempotent_requests',statusCode:409}}).mockResolvedValueOnce({error:{name:'invalid_idempotent_request',statusCode:409}});
 const deliver=makeBillingEmailDelivery({prepare:async()=>prepared,owns:async()=>true},()=> 'lease',env,()=>({send}),()=>now);
 await expect(deliver({},'job')).rejects.toThrow('retry');await expect(deliver({},'job')).rejects.toThrow('rejected');expect(send.mock.calls[0]).toEqual(send.mock.calls[1]);
});
test('review refuses missing session, missing signing configuration and missing explicit apply digest',async()=>{
 const deps=reviewDeps();await expect(reviewBilling({},env.NEXT_PUBLIC_APP_URL!,{...deps,actor:async()=>null})).rejects.toThrow('Unauthorized');
 await expect(reviewBilling({},env.NEXT_PUBLIC_APP_URL!,{...deps,env:{...env,BILLING_REVIEW_SECRET:''}})).rejects.toThrow('unavailable');
 await expect(reviewBilling({action:'apply'},env.NEXT_PUBLIC_APP_URL!,deps)).rejects.toThrow('Explicit reviewed');
});
test('middleware session exception is exact; neighboring internal and admin routes stay protected',async()=>{
 const {isPublicRoute}=await import('../../src/lib/route-access');expect(isPublicRoute('/api/internal/billing/worker')).toBe(true);
 for(const path of ['/api/internal/billing/worker/anything','/api/internal/billing/workers','/api/internal/billing','/api/admin/billing/review','/api/internal/other','/api/internal/billing/worker/','/api/internal/billing/%77orker','/api/internal/billing/worker%2F','/api/internal/billing/worker/../other'])expect(isPublicRoute(path)).toBe(false);
});
