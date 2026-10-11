import { randomUUID, createHash } from "crypto";
import type { KnowledgeLifecycleJob, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { removeDocument } from "@/lib/vector/indexer";

type Store = Pick<Prisma.TransactionClient, "knowledgeLifecycleJob"|"$queryRaw">;
type Work = Pick<KnowledgeLifecycleJob,"kind"|"expertProfileId"|"itemId"|"sourceVersion"|"namespace"|"vectorIds"> & {
  /** Internal durable namespace receipt, never supplied by public request JSON. */
  namespaceReceiptJobId?: string;
};
export async function enqueueLifecycleJob(work: Work, store?: Store): Promise<KnowledgeLifecycleJob> {
  // No source FK is intentional: deleted sources still need vector cleanup. The
  // expert-first row lock instead fences enqueue against parent teardown. A
  // standalone caller must hold that lock through its upsert/reset transaction.
  if (!store || store === prisma) return prisma.$transaction(tx => enqueueLocked(work,tx));
  // Reject a different autocommit client; callers supply only an existing
  // interactive transaction, never a client whose row lock expires separately.
  if ("$transaction" in store) throw new Error("Lifecycle enqueue requires a transaction store");
  return enqueueLocked(work,store);
}
async function enqueueLocked(work: Work, store: Store): Promise<KnowledgeLifecycleJob> {
  const parents = await store.$queryRaw<{id:string;vectorNamespace:string}[]>`SELECT "id","vectorNamespace" FROM "ExpertProfile" WHERE "id"=${work.expertProfileId} FOR UPDATE`;
  if (!parents.length) throw new Error("Lifecycle expert no longer exists");
  if (parents[0].vectorNamespace !== work.namespace) {
    // A delayed index worker can finish in its former namespace after a parent
    // namespace change. Only an explicit same-tenant/source/version durable
    // INDEX/CLEANUP receipt authorizes cleanup there, never new indexing.
    const receipt = work.kind === "CLEANUP" && work.namespaceReceiptJobId
      ? await store.knowledgeLifecycleJob.findUnique({where:{id:work.namespaceReceiptJobId}}) : null;
    if (!receipt || !["INDEX","CLEANUP"].includes(receipt.kind) || receipt.expertProfileId !== work.expertProfileId ||
        receipt.itemId !== work.itemId || receipt.sourceVersion !== work.sourceVersion || receipt.namespace !== work.namespace ||
        work.vectorIds.some(id => !receipt.vectorIds.includes(id)))
      throw new Error("Lifecycle namespace is not currently or historically authorized");
  }
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
      const current = await prisma.knowledgeItem.findUnique({where:{id:job.itemId},include:{expertProfile:{select:{vectorNamespace:true}}}});
      // Vector identity is namespace-local. A current copy in a new namespace
      // cannot protect the same IDs left behind in a receipt-bound old namespace.
      const protectedIds = current?.expertProfileId === job.expertProfileId && current.expertProfile.vectorNamespace === job.namespace ? current.vectorIds : [];
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
