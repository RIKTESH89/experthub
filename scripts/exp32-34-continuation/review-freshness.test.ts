import {reviewBilling,type BillingReviewDependencies} from '../../src/lib/payments/billing-review';
const env:NodeJS.ProcessEnv={NODE_ENV:'test',BILLING_REVIEW_ENABLED:'true',BILLING_REVIEW_SECRET:'synthetic-independent-review-signature',NEXT_PUBLIC_APP_URL:'https://app.example.invalid'};
test('apply rechecks provider evidence after a refund during the review window',async()=>{
 let refunded=false;const paidPeriod=jest.fn(async()=>{if(refunded)throw Error('payment refunded');return {providerId:'remote',paymentId:'paid',captured:true,start:new Date('2026-10-01'),end:new Date('2026-11-01')};});
 const apply=jest.fn(async()=>true);
 const deps:BillingReviewDependencies={env,now:()=>new Date('2026-10-03'),actor:async()=>({id:'admin',role:'ADMIN'}),loadRow:async()=>({id:'sub',version:0,providerId:'remote',cancelled:false}),loadIntent:jest.fn(),lookup:{paidPeriod,recover:jest.fn()},reconciliation:()=>({apply}),provisioning:jest.fn()};
 const planned:any=await reviewBilling({action:'plan',kind:'reconcile',id:'sub',paymentId:'paid'},env.NEXT_PUBLIC_APP_URL!,deps);
 refunded=true;
 await expect(reviewBilling({action:'apply',token:planned.token,reviewedDigest:planned.reviewedDigest},env.NEXT_PUBLIC_APP_URL!,deps)).rejects.toThrow();
 expect(apply).not.toHaveBeenCalled();
});
test.each(['changed-interval','uncaptured','lookup-failure'])('fresh %s evidence requires a new review without entering apply store',async mode=>{
 let changed=false;const evidence={providerId:'remote',paymentId:'paid',captured:true,start:new Date('2026-10-01'),end:new Date('2026-11-01')};
 const paidPeriod=jest.fn(async()=>{if(changed&&mode==='lookup-failure')throw Error('provider unavailable');return changed?{...evidence,...(mode==='changed-interval'?{end:new Date('2026-12-01')}:{captured:false})}:evidence;});
 const apply=jest.fn(async()=>true);const deps:BillingReviewDependencies={env,now:()=>new Date('2026-10-03'),actor:async()=>({id:'admin',role:'ADMIN'}),loadRow:async()=>({id:'sub',version:0,providerId:'remote',cancelled:false}),loadIntent:jest.fn(),lookup:{paidPeriod,recover:jest.fn()},reconciliation:()=>({apply}),provisioning:jest.fn()};
 const planned:any=await reviewBilling({action:'plan',kind:'reconcile',id:'sub',paymentId:'paid'},env.NEXT_PUBLIC_APP_URL!,deps);changed=true;
 await expect(reviewBilling({action:'apply',token:planned.token,reviewedDigest:planned.reviewedDigest},env.NEXT_PUBLIC_APP_URL!,deps)).rejects.toThrow('new review required');expect(apply).not.toHaveBeenCalled();expect(paidPeriod).toHaveBeenCalledTimes(2);
});
test('fresh recovery identity mismatch/unavailable prevents attachment',async()=>{
 let changed=false;const attach=jest.fn(async()=>{});const lookup=jest.fn(async()=>({outcome:'candidate',evidence:{intentId:'intent',providerId:changed?'other':'remote'}}));
 const intent={id:'intent',version:2,state:'UNKNOWN' as const,subscriberId:'visitor',expertProfileId:'expert',tier:'PREMIUM',price:10};
 const deps:BillingReviewDependencies={env,actor:async()=>({id:'admin',role:'ADMIN'}),loadRow:jest.fn(),loadIntent:async()=>intent,lookup:{recover:lookup,paidPeriod:jest.fn()},reconciliation:jest.fn(),provisioning:()=>({attach,claim:jest.fn(),save:jest.fn()})};
 const planned:any=await reviewBilling({action:'plan',kind:'recover',id:'intent'},env.NEXT_PUBLIC_APP_URL!,deps);changed=true;
 await expect(reviewBilling({action:'apply',token:planned.token,reviewedDigest:planned.reviewedDigest},env.NEXT_PUBLIC_APP_URL!,deps)).rejects.toThrow('new review required');expect(attach).not.toHaveBeenCalled();
});
test('fresh provider lookup budget fails closed without an apply when lookup hangs',async()=>{
 jest.useFakeTimers();let hang=false;const evidence={providerId:'remote',paymentId:'paid',captured:true,start:new Date('2026-10-01'),end:new Date('2026-11-01')};const apply=jest.fn(async()=>true);
 const deps:BillingReviewDependencies={env,now:()=>new Date('2026-10-03'),actor:async()=>({id:'admin',role:'ADMIN'}),loadRow:async()=>({id:'sub',version:0,providerId:'remote',cancelled:false}),loadIntent:jest.fn(),lookup:{paidPeriod:async()=>hang?new Promise(()=>{}):evidence,recover:jest.fn()},reconciliation:()=>({apply}),provisioning:jest.fn()};
 try{const planned:any=await reviewBilling({action:'plan',kind:'reconcile',id:'sub',paymentId:'paid'},env.NEXT_PUBLIC_APP_URL!,deps);hang=true;const checked=expect(reviewBilling({action:'apply',token:planned.token,reviewedDigest:planned.reviewedDigest},env.NEXT_PUBLIC_APP_URL!,deps)).rejects.toThrow('new review required');await jest.advanceTimersByTimeAsync(20001);await checked;expect(apply).not.toHaveBeenCalled();}finally{jest.useRealTimers();}
});
