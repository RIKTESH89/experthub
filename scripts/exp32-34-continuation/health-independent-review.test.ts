import prisma from '@/lib/prisma';
import { PrismaClient } from '@prisma/client';
import { billingHealth } from '@/lib/payments/billing-health';
const env={...process.env};
beforeEach(async()=>{
 if(process.env.DATABASE_URL!=='postgresql://billing_continuation@127.0.0.1:55439/billing_continuation')throw Error('Unsafe fixture');
 await prisma.$executeRawUnsafe('TRUNCATE "BillingOutbox", "BillingProvisioning", "User" CASCADE');
 await prisma.user.create({data:{id:'review-admin',email:'review@example.invalid',role:'ADMIN'}});
 process.env.BILLING_REVIEW_ENABLED='true';
});
afterEach(()=>{process.env={...env}});
afterAll(()=>prisma.$disconnect());
test('independent unresolved sample is capped and lookup treats hostile actor as a literal',async()=>{
 for(let i=0;i<35;i++)await prisma.$executeRaw`INSERT INTO "BillingProvisioning" ("id","subscriberId","expertProfileId","expectedVersion","tier","price","state") VALUES (${`review-${i}`},${`private-subscriber-${i}`},${`private-expert-${i}`},0,'PREMIUM',10,'UNKNOWN')`;
 const health=await billingHealth('review-admin');expect(health.provisioning.unknown).toBe(35);expect(health.unresolved).toHaveLength(25);expect(JSON.stringify(health)).not.toContain('private-subscriber');
 await expect(billingHealth("review-admin' OR 1=1 --")).rejects.toMatchObject({status:403});
 expect(await prisma.$queryRaw`SELECT "id" FROM "BillingProvisioning"`).toHaveLength(35);
});
test('independent blocked actor recheck observes the transaction budget',async()=>{
 const writer=new PrismaClient();let release!:()=>void;let acquired!:()=>void;
 const ready=new Promise<void>(r=>{acquired=r});const hold=new Promise<void>(r=>{release=r});
 const lock=writer.$transaction(async tx=>{await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id"='review-admin' FOR UPDATE`;acquired();await hold;},{timeout:15000});
 await ready;const start=Date.now();let timer:ReturnType<typeof setTimeout>|undefined;
 const health=billingHealth('review-admin').then(()=>({state:'returned'}),e=>({state:'rejected',code:e.code}));
 let result;
 try{result=await Promise.race([health,new Promise<{state:string}>(r=>{timer=setTimeout(()=>r({state:'pending-after-6200ms'}),6200)})]);console.log('INDEPENDENT_BUDGET_OBSERVATION',JSON.stringify({result,elapsedMs:Date.now()-start}));}
 finally{if(timer)clearTimeout(timer);release();await lock;await health;await writer.$disconnect();}
 expect(result?.state).toBe('rejected');
});
