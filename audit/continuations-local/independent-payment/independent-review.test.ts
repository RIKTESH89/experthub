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
