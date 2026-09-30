import { randomUUID, createHash } from "crypto";
import type { KnowledgeLifecycleJob, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { removeDocument } from "@/lib/vector/indexer";

type Store = Pick<Prisma.TransactionClient, "knowledgeLifecycleJob">;
type Work = Pick<KnowledgeLifecycleJob,"kind"|"expertProfileId"|"itemId"|"sourceVersion"|"namespace"|"vectorIds">;
export async function enqueueLifecycleJob(work: Work, store: Store = prisma) {
  const vectorIds = Array.from(new Set(work.vectorIds)).sort();
  const id = createHash("sha256").update(JSON.stringify([work.kind,work.expertProfileId,work.itemId,work.sourceVersion,work.namespace,vectorIds])).digest("hex");
  const job = await store.knowledgeLifecycleJob.upsert({where:{id},create:{id,kind:work.kind,expertProfileId:work.expertProfileId,itemId:work.itemId,sourceVersion:work.sourceVersion,namespace:work.namespace,vectorIds,availableAt:new Date()},update:{id}});
  // A later expired index worker can recreate previously cleaned orphan IDs.
  if (work.kind === "CLEANUP") await store.knowledgeLifecycleJob.updateMany({where:{id,state:"DONE"},data:{state:"PENDING",availableAt:new Date(),lastError:null}});
  if (work.kind === "POST_SYNC") await store.knowledgeLifecycleJob.updateMany({where:{id},data:{state:"PENDING",availableAt:new Date(),leaseToken:null,leaseUntil:null,lastError:null}});
  return job;
}

/** Claim using a token/CAS; an expired worker cannot acknowledge another worker's lease. */
export async function runLifecycleJob(id: string, expertProfileId: string, index: (job: KnowledgeLifecycleJob) => Promise<void>, now = new Date()) {
  const token = randomUUID();
  const claimed = await prisma.knowledgeLifecycleJob.updateMany({where:{id,expertProfileId,availableAt:{lte:now},OR:[
    {state:"PENDING"},{state:"RUNNING",leaseUntil:{lte:now}},
  ]},data:{state:"RUNNING",leaseToken:token,leaseUntil:new Date(now.getTime()+300_000),attempts:{increment:1}}});
  if (!claimed.count) return false;
  const job = await prisma.knowledgeLifecycleJob.findUnique({where:{id}});
  if (!job || job.leaseToken !== token) return false;
  try {
    if (job.kind === "INDEX" || job.kind === "POST_SYNC") await index(job);
    else if (job.kind === "CLEANUP") {
      // An expired/indexing worker can leave IDs also in a current manifest.
      const current = await prisma.knowledgeItem.findUnique({where:{id:job.itemId}});
      const protectedIds = current?.expertProfileId === job.expertProfileId ? current.vectorIds : [];
      await removeDocument(job.namespace,job.vectorIds.filter((value)=>!protectedIds.includes(value)));
    } else throw new Error("Unknown lifecycle job kind");
    await prisma.knowledgeLifecycleJob.updateMany({where:{id,leaseToken:token,state:"RUNNING"},data:{state:"DONE",leaseToken:null,leaseUntil:null,lastError:null}});
    return true;
  } catch (error) {
    const delay = Math.min(3_600_000,1000 * 2 ** Math.min(job.attempts,12));
    await prisma.knowledgeLifecycleJob.updateMany({where:{id,leaseToken:token,state:"RUNNING"},data:{state:"PENDING",leaseToken:null,leaseUntil:null,availableAt:new Date(now.getTime()+delay),lastError:error instanceof Error?error.message:"Lifecycle work failed"}});
    throw error;
  }
}
