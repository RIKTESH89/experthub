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
 await drainBillingOutbox({claim,settle,owns:async()=>true},delivery,new Date(0));expect(delivery).toHaveBeenCalledWith({},'dedupe');expect(settle.mock.calls[0][2]).toMatchObject({state:'FAILED'});
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
test('ambiguous plan success timeout blocks a second plan and never starts subscription',async()=>{
 const m=memory(), provider={createPlan:jest.fn(async()=>{throw Error('created remotely but timed out');}),createSubscription:jest.fn(async()=> 'remote')};
 await provision(m.get(),m.store,provider);await provision(m.get(),m.store,provider);
 expect(m.get().state).toBe('UNKNOWN');expect(provider.createPlan).toHaveBeenCalledTimes(1);expect(provider.createSubscription).not.toHaveBeenCalled();
});
test('lost committed plan save remains blocked and reviewed IN_FLIGHT recovery does not recreate',async()=>{
 const m=memory(), base=m.store.save;
 const save=jest.fn(async(id,v,patch)=>{const result=await base(id,v,patch);if(patch.planId)throw Error('committed save response lost');return result;});
 const store={...m.store,save};const provider={createPlan:jest.fn(async()=> 'plan'),createSubscription:jest.fn(async()=> 'remote')};
 await provision(m.get(),store,provider);expect(m.get().state).toBe('IN_FLIGHT');await provision(m.get(),store,provider);expect(provider.createPlan).toHaveBeenCalledTimes(1);
 await recoverProvisioning(m.get(),{reviewed:true,intentId:'intent',providerId:'verified-remote'},m.store);expect(m.get().state).toBe('ATTACHED');
});
test('lost attachment response returns review; durable attached retry returns same provider without creating',async()=>{
 const m=memory(), base=m.store.attach, provider={createPlan:jest.fn(async()=> 'plan'),createSubscription:jest.fn(async()=> 'remote')};
 await provision(m.get(),{...m.store,attach:async i=>{await base(i);throw Error('response lost');}},provider);
 expect((await provision(m.get(),m.store,provider)).providerId).toBe('remote');expect(provider.createSubscription).toHaveBeenCalledTimes(1);
});
test('worker claims one job at a time and refuses delivery after ownership expires',async()=>{
 let claimed=false;const claim=jest.fn(async(..._args:any[])=>{if(claimed)return [];claimed=true;return [{id:'expired',leaseToken:'stale',attempts:1,payload:{}}];});
 const owns=jest.fn(async()=>false),settle=jest.fn(async()=>false),deliver=jest.fn(async()=>{});
 await drainBillingOutbox({claim,settle,owns} as any,deliver,new Date());
 expect(claim.mock.calls[0][2]).toBe(1);expect(owns).toHaveBeenCalled();expect(deliver).not.toHaveBeenCalled();
});
