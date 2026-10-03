import { provision, recoverProvisioning, ProvisioningIntent, ProvisioningStore } from '../../src/lib/payments/provisioning';
import { drainBillingOutbox } from '../../src/lib/payments/outbox';
import { planReconciliation, reconcile } from '../../src/lib/payments/reconciliation';
function memory() {
 let row: ProvisioningIntent={id:'intent',version:0,state:'READY'};
 const store: ProvisioningStore={claim:async(id,v)=> {if(row.version!==v||row.state!=='READY')return null; row={...row,state:'IN_FLIGHT',version:v+1};return {...row};},save:async(id,v,p)=>{if(row.version!==v)throw Error('conflict');row={...row,...p,version:v+1};return {...row};},attach:async i=>{if(row.version!==i.version)throw Error('conflict');row={...i,state:'ATTACHED',version:i.version+1};}};
 return {store,get:()=>row};
}
test('concurrent provisioning calls create once and never activate paid access',async()=>{
 const m=memory(), provider={createPlan:jest.fn(async()=> 'plan'),createSubscription:jest.fn(async()=> 'provider')};
 const input={...m.get()}; const result=await Promise.all([provision(input,m.store,provider),provision(input,m.store,provider)]);
 expect(provider.createSubscription).toHaveBeenCalledTimes(1);expect(result.map(r=>r.outcome).sort()).toEqual(['attached','concurrent-request']);
});
test('provider timeout stays uncertain; retries do not create and reviewed recovery matches identity',async()=>{
 const m=memory(), provider={createPlan:jest.fn(async()=> 'plan'),createSubscription:jest.fn(async()=> {throw Error('timeout after remote creation');})};
 expect((await provision(m.get(),m.store,provider)).outcome).toBe('review-required');
 await provision(m.get(),m.store,provider);expect(provider.createSubscription).toHaveBeenCalledTimes(1);
 await expect(recoverProvisioning(m.get(),{reviewed:false,intentId:'intent',providerId:'remote'},m.store)).rejects.toThrow();
 await recoverProvisioning(m.get(),{reviewed:true,intentId:'intent',providerId:'remote'},m.store);expect(m.get().state).toBe('ATTACHED');
});
test('outbox carries dedupe key, retries with bounded delay and terminates',async()=>{
 const settle=jest.fn(async(..._args: any[])=>true), claim=jest.fn(async()=>[{id:'dedupe',leaseToken:'lease',attempts:5,payload:{}}]);
 const delivery=jest.fn(async()=>{throw Error('do not send email');});
 await drainBillingOutbox({claim,settle},delivery,new Date(0));expect(delivery).toHaveBeenCalledWith({},'dedupe');expect(settle.mock.calls[0][2]).toMatchObject({state:'FAILED'});
});
test('reconciliation defaults dry-run, requires reviewed immutable digest and CAS',async()=>{
 const plan=planReconciliation({id:'sub',version:3,providerId:'remote',cancelled:true},{providerId:'remote',paymentId:'paid',captured:true,start:new Date(1000),end:new Date(2000)});
 const apply=jest.fn(async()=>false);expect((await reconcile(plan,{apply})).outcome).toBe('dry-run');expect(apply).not.toHaveBeenCalled();
 await expect(reconcile(plan,{apply},{apply:true})).rejects.toThrow();expect((await reconcile(plan,{apply},{apply:true,reviewedDigest:plan.digest})).outcome).toBe('version-conflict');
 plan.evidence.end=new Date(4000);await expect(reconcile(plan,{apply})).rejects.toThrow('Plan changed');
});
test('legacy period cannot infer a month or accept uncaptured evidence',()=>{
 expect(()=>planReconciliation({id:'sub',version:0,providerId:'remote',cancelled:false},{providerId:'remote',paymentId:'paid',captured:false,start:new Date(1),end:new Date(2)})).toThrow();
});
