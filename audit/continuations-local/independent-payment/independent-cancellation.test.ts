import {reviewBilling,type BillingReviewDependencies} from '../../../src/lib/payments/billing-review';
import {makeProviderRecoveryLookup} from '../../../src/lib/payments/provider-lookup';
const env:NodeJS.ProcessEnv={NODE_ENV:'test',BILLING_REVIEW_ENABLED:'true',BILLING_PROVIDER_LOOKUP_ENABLED:'true',BILLING_REVIEW_SECRET:'synthetic-independent-review-signature',RAZORPAY_KEY_ID:'rzp_test_synthetic',RAZORPAY_KEY_SECRET:'synthetic-no-calls',NEXT_PUBLIC_APP_URL:'https://app.example.invalid'};
test('provider cancellation between plan and apply must not restore uncancelled ACTIVE state',async()=>{
 let cancelled=false;
 const client={subscriptions:{all:jest.fn(),fetch:async()=>({id:'remote',status:cancelled?'cancelled':'active'})},plans:{fetch:jest.fn()},payments:{fetch:async()=>({id:'paid',status:'captured',captured:true,amount_refunded:0,invoice_id:'invoice'})},invoices:{fetch:async()=>({id:'invoice',subscription_id:'remote',payment_id:'paid',status:'paid',billing_start:1790812800,billing_end:1793491200})}};
 const apply=jest.fn(async()=>true);
 const deps:BillingReviewDependencies={env,now:()=>new Date('2026-10-03'),actor:async()=>({id:'admin',role:'ADMIN'}),loadRow:async()=>({id:'sub',version:0,providerId:'remote',cancelled:false}),loadIntent:jest.fn(),lookup:makeProviderRecoveryLookup(env,()=>client),reconciliation:()=>({apply}),provisioning:jest.fn()};
 const planned=await reviewBilling({action:'plan',kind:'reconcile',id:'sub',paymentId:'paid'},env.NEXT_PUBLIC_APP_URL!,deps);
 if(!('token' in planned))throw Error('Expected review proposal');
 cancelled=true;
 await expect(reviewBilling({action:'apply',token:planned.token,reviewedDigest:planned.reviewedDigest},env.NEXT_PUBLIC_APP_URL!,deps)).rejects.toThrow();
 expect(apply).not.toHaveBeenCalled();
});
