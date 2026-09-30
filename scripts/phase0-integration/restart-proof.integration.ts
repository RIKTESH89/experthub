import prisma from "@/lib/prisma";
import {drainLifecycleJobs} from "@/lib/knowledge/lifecycle";
test("cluster restart preserves expired cleanup lease and orphan IDs; fresh worker recovers",async()=>{
 const db=await prisma.$queryRaw<{name:string}[]>`SELECT current_database() AS name`;expect(db[0].name).toBe("experthub_phase0_test");
 const job=await prisma.knowledgeLifecycleJob.findUniqueOrThrow({where:{id:"synthetic-restart-proof"}});expect(job.state).toBe("RUNNING");expect(job.leaseToken).toBe("synthetic-crashed-worker");
 await drainLifecycleJobs("synthetic-ada",20,new Date());expect((await prisma.knowledgeLifecycleJob.findUniqueOrThrow({where:{id:job.id}})).state).toBe("DONE");
 const rows=await prisma.$queryRaw<{count:bigint}[]>`SELECT count(*) AS count FROM "VectorChunk" WHERE "vectorId"='synthetic-restart-orphan'`;expect(rows[0].count).toBe(BigInt(0));
});
afterAll(async()=>{await prisma.$disconnect();});
