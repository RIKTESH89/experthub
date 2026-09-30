import prisma from "@/lib/prisma";
import { indexDocument, plannedVectorIds } from "@/lib/vector/indexer";

import { enqueueLifecycleJob, runLifecycleJob } from "./outbox";
import type { KnowledgeLifecycleJob, Prisma } from "@prisma/client";

/** Replay-safe: an event identifies a source; its old payload is never authoritative. */
export async function syncKnowledgeItem(expertProfileId: string, itemId: string) {
  const item = await prisma.knowledgeItem.findUnique({ where: { id: itemId }, include: { expertProfile: true } });
  if (!item || item.expertProfileId !== expertProfileId) return null;
  if (item.isIndexed && item.indexedVersion === item.sourceVersion) return item;
  const job = await enqueueLifecycleJob({kind:"INDEX",expertProfileId,itemId,sourceVersion:item.sourceVersion,namespace:item.expertProfile.vectorNamespace,
    vectorIds:plannedVectorIds(expertProfileId,itemId,item.sourceVersion,`${item.title}\n\n${item.content}`)});
  await runLifecycleJob(job.id,expertProfileId,performIndexJob);
  return prisma.knowledgeItem.findUnique({where:{id:itemId}});
}

export async function performIndexJob(job: KnowledgeLifecycleJob): Promise<void> {
  const {expertProfileId,itemId} = job;
  if (job.kind === "POST_SYNC") {
    const post = await prisma.post.findUnique({where:{id:itemId}});
    if (post) {
      const expert = await prisma.expertProfile.findUnique({where:{id:expertProfileId},select:{userId:true}});
      if (!expert || expert.userId !== post.authorId) throw new Error("Post outbox tenant mismatch");
      await syncPostSource(itemId);
    }
    else {
      const copies = await prisma.knowledgeItem.findMany({where:{expertProfileId,sourceType:"post",sourceId:itemId}});
      for (const copy of copies) await removeKnowledgeItem(expertProfileId,copy.id);
    }
    return;
  }
  const item = await prisma.knowledgeItem.findUnique({where:{id:itemId},include:{expertProfile:true}});
  if (!item || item.expertProfileId !== expertProfileId || item.sourceVersion !== job.sourceVersion) {
    await enqueueLifecycleJob({...job,kind:"CLEANUP"});
    return;
  }
  if (item.isIndexed && item.indexedVersion === item.sourceVersion) return;
  const version = item.sourceVersion;
  try {
    const vectorIds = await indexDocument(item.expertProfile.vectorNamespace, item.id,
      `${item.title}\n\n${item.content}`, {
        ...((item.metadata as Record<string, unknown>) || {}),
        title: item.title, sourceType: item.sourceType, sourceId: item.sourceId,
        expertProfileId, knowledgeItemId: item.id, sourceVersion: version,
      });
    // Compare-and-set prevents delayed/reordered jobs from publishing an old revision.
    // Persist cleanup and publication in one transaction: crashes cannot lose old IDs.
    const published = await prisma.$transaction(async (tx) => {
      await enqueueLifecycleJob({kind:"CLEANUP",expertProfileId,itemId,sourceVersion:version,namespace:job.namespace,vectorIds:item.vectorIds},tx);
      return tx.knowledgeItem.updateMany({
      where: { id: item.id, expertProfileId, sourceVersion: version },
      data: { vectorIds, isIndexed: true, indexedVersion: version, indexingError: null },
    });
    });
    if (!published.count) {
      await enqueueLifecycleJob({kind:"CLEANUP",expertProfileId,itemId,sourceVersion:version,namespace:job.namespace,vectorIds});
      return;
    }
    // Durable cleanup is drained independently; serving uses only this manifest.
  } catch (error) {
    await prisma.knowledgeItem.updateMany({
      where: { id: item.id, expertProfileId, sourceVersion: version, OR: [{ indexedVersion: null }, { indexedVersion: { not: version } }] },
      data: { isIndexed: false, indexingError: error instanceof Error ? error.message : "Indexing failed" },
    });
    throw error;
  }
}

export async function removeKnowledgeItem(expertProfileId: string, itemId: string) {
  const item = await prisma.knowledgeItem.findUnique({ where: { id: itemId }, include: { expertProfile: true } });
  if (!item || item.expertProfileId !== expertProfileId) return;
  // Revoke retrieval eligibility before cleanup; failed cleanup cannot expose the source.
  await prisma.$transaction(async (tx) => {
    // Serialize manifest publication/deletion so cleanup captures the final IDs.
    await tx.$queryRaw`SELECT "id" FROM "KnowledgeItem" WHERE "id" = ${itemId} AND "expertProfileId" = ${expertProfileId} FOR UPDATE`;
    const current = await tx.knowledgeItem.findUnique({where:{id:itemId},include:{expertProfile:true}});
    if (!current || current.expertProfileId !== expertProfileId) return;
    await enqueueLifecycleJob({kind:"CLEANUP",expertProfileId,itemId,sourceVersion:current.sourceVersion,namespace:current.expertProfile.vectorNamespace,vectorIds:current.vectorIds},tx);
    await tx.knowledgeItem.deleteMany({ where: { id: itemId, expertProfileId } });
  });
}

export async function syncPostSource(postId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return;
  const expert = await prisma.expertProfile.findUnique({ where: { userId: post.authorId } });
  if (!expert) return;
  const key = { expertProfileId: expert.id, sourceType: "post", sourceId: postId };
  const existing = await prisma.knowledgeItem.findUnique({ where: { expertProfileId_sourceType_sourceId: key } });
  if (!post.isRagEnabled) {
    if (existing) await removeKnowledgeItem(expert.id, existing.id);
    return;
  }
  const title = post.title || "Untitled Post";
  const content = post.content || "";
  const metadata = { postId, status: post.status, isHidden: post.isHidden, isPremiumOnly: post.isPremiumOnly };
  const oldMetadata = existing?.metadata as Record<string, unknown> | null;
  const changed = existing && (existing.title !== title || existing.content !== content ||
    oldMetadata?.postId !== postId || oldMetadata?.status !== post.status || oldMetadata?.isHidden !== post.isHidden || oldMetadata?.isPremiumOnly !== post.isPremiumOnly);
  const item = await prisma.knowledgeItem.upsert({
    where: { expertProfileId_sourceType_sourceId: key },
    create: { ...key, title, content, metadata },
    update: changed ? { title, content, metadata, sourceVersion: { increment: 1 }, isIndexed: false, indexingError: null } : {sourceId:postId},
  });
  await syncKnowledgeItem(expert.id, item.id);
}

export async function removePostSource(postId: string, authorId: string) {
  const expert = await prisma.expertProfile.findUnique({ where: { userId: authorId } });
  if (!expert) return;
  const items = await prisma.knowledgeItem.findMany({ where: { expertProfileId: expert.id, sourceType: "post", sourceId: postId } });
  for (const item of items) await removeKnowledgeItem(expert.id, item.id);
}

/** Bounded owner-scoped replay also reconciles the create/update-to-enqueue crash window. */
export async function drainLifecycleJobs(expertProfileId: string, limit = 20, now = new Date()) {
  const bounded = Math.min(20,Math.max(1,limit));
  const sources = await prisma.knowledgeItem.findMany({where:{expertProfileId,isIndexed:false},include:{expertProfile:true},take:bounded,orderBy:[{updatedAt:"asc"},{id:"asc"}]});
  for (const source of sources) await enqueueLifecycleJob({kind:"INDEX",expertProfileId,itemId:source.id,sourceVersion:source.sourceVersion,namespace:source.expertProfile.vectorNamespace,
    vectorIds:plannedVectorIds(expertProfileId,source.id,source.sourceVersion,`${source.title}\n\n${source.content}`)});
  const jobs = await prisma.knowledgeLifecycleJob.findMany({where:{expertProfileId,availableAt:{lte:now},OR:[{state:"PENDING"},{state:"RUNNING",leaseUntil:{lte:now}}]},take:bounded,orderBy:[{availableAt:"asc"},{id:"asc"}]});
  const result = {completed:0,failed:0};
  for (const job of jobs) {
    try { if (await runLifecycleJob(job.id,expertProfileId,performIndexJob,now)) result.completed++; }
    catch { result.failed++; }
  }
  return result;
}

/** Persist a post projection event atomically with the post mutation. */
export async function withPostOutbox<T extends {id:string}>(authorId:string, mutate:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T> {
  return prisma.$transaction(async(tx)=>{
    const post = await mutate(tx);
    const expert = await tx.expertProfile.findUnique({where:{userId:authorId}});
    if (expert) await enqueueLifecycleJob({kind:"POST_SYNC",expertProfileId:expert.id,itemId:post.id,sourceVersion:null,namespace:expert.vectorNamespace,vectorIds:[]},tx);
    return post;
  });
}
