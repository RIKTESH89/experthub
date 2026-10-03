// Verification-only bundle, kept outside deploy directories. Never an HTTP endpoint.
import {createHmac} from 'node:crypto';
import {isolatedClient,database} from './database';
import {receiver,drainOne} from './core';
import {applyPaymentSnapshotInTransaction} from '../src/lib/payments/state';
export async function verify(url:string){
 const parsed=new URL(url);if(parsed.hostname!=='127.0.0.1'||parsed.port!=='55447'||parsed.pathname!=='/webhook_local')throw new Error('Unsafe package probe DB');
 const client=isolatedClient(url),db=database(client),secret='packaged-synthetic-webhook-secret-32';
 try{
  await client.user.create({data:{id:'package-owner',email:'package-owner@example.invalid',role:'EXPERT',expertProfile:{create:{id:'package-expert',displayName:'Package Synthetic',specialty:[],vectorNamespace:'package-synthetic'}}}});
  await client.user.create({data:{id:'package-visitor',email:'package-visitor@example.invalid'}});
  await client.expertSubscription.create({data:{id:'package-sub',subscriberId:'package-visitor',expertProfileId:'package-expert',status:'PENDING',tier:'PREMIUM',price:10,razorpaySubscriptionId:'package-rzp'}});
  const time=Math.floor(Date.now()/1000),body=JSON.stringify({event:'subscription.charged',created_at:time,payload:{subscription:{entity:{id:'package-rzp',current_start:time-10,current_end:time+3600}},payment:{entity:{id:'package-pay',status:'captured'}}}});
  const response=await receiver(db,secret)(new Request('http://localhost/razorpay-test',{method:'POST',body,headers:{'x-razorpay-signature':createHmac('sha256',secret).update(body).digest('hex')}}));if(response.status!==200)throw new Error('Packaged receiver failed');
  while(await drainOne(db,applyPaymentSnapshotInTransaction)){}
  const sub=await client.expertSubscription.findUniqueOrThrow({where:{id:'package-sub'}});
  // This model is absent from release's generated client: proves our own generation is used.
  const inbox=await (client as any).stagingWebhookInbox.findMany({where:{state:'done'}});
  if(sub.status!=='ACTIVE'||!inbox.length||await client.paymentEvent.count({where:{providerSubscriptionId:'package-rzp'}})!==1)throw new Error('Packaged reducer/client failed');
  return {generatedInboxModel:true,subscription:sub.status,receiptCount:1,ambientPrisma:'denied',externalCalls:0};
 }finally{await client.$disconnect();}
}
