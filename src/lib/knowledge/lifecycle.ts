import prisma from "@/lib/prisma";
import { publishEvidence, retireEvidence } from "@/lib/graph/evidence-store";
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
      const published = await tx.knowledgeItem.updateMany({
      where: { id: item.id, expertProfileId, sourceVersion: version },
      data: { vectorIds, isIndexed: true, indexedVersion: version, indexingError: null },
    });
      if (published.count) await publishEvidence(tx, item, item.expertProfile.userId);
      return published;
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
    await retireEvidence(tx,expertProfileId,itemId);
    await tx.knowledgeItem.deleteMany({ where: { id: itemId, expertProfileId } });
  });
}

export async function syncPostSource(postId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return;
  const expert = await prisma.expertProfile.findUnique({ where: { userId: post.authorId } });
  if (!expert) return;
  // Initial reads discover the tenant only. Never publish their content snapshot.
  // Match correction/release ordering: expert -> knowledge source -> authoritative post.
  const itemId = await prisma.$transaction(async tx => {
    const owners = await tx.$queryRaw<{userId:string}[]>`SELECT "userId" FROM "ExpertProfile" WHERE "id"=${expert.id} FOR UPDATE`;
    if (owners[0]?.userId !== post.authorId) throw new Error("Post source owner changed");
    const key = { expertProfileId: expert.id, sourceType: "post", sourceId: postId };
    const found = await tx.knowledgeItem.findUnique({where:{expertProfileId_sourceType_sourceId:key}});
    if (found) await tx.$queryRaw`SELECT "id" FROM "KnowledgeItem" WHERE "id"=${found.id} AND "expertProfileId"=${expert.id} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "Post" WHERE "id"=${postId} AND "authorId"=${post.authorId} FOR UPDATE`;
    const currentPost = await tx.post.findUnique({where:{id:postId}});
    if (currentPost && currentPost.authorId !== post.authorId) throw new Error("Post source owner changed");
    const existing = await tx.knowledgeItem.findUnique({where:{expertProfileId_sourceType_sourceId:key}});
    if (!currentPost || !currentPost.isRagEnabled) {
      if (existing) {
        await enqueueLifecycleJob({kind:"CLEANUP",expertProfileId:expert.id,itemId:existing.id,sourceVersion:existing.sourceVersion,namespace:expert.vectorNamespace,vectorIds:existing.vectorIds},tx);
        await retireEvidence(tx,expert.id,existing.id);
        await tx.knowledgeItem.deleteMany({where:{id:existing.id,expertProfileId:expert.id}});
      }
      return null;
    }
    const title = currentPost.title || "Untitled Post";
    const content = currentPost.content || "";
    const metadata = {postId,status:currentPost.status,isHidden:currentPost.isHidden,isPremiumOnly:currentPost.isPremiumOnly};
    const oldMetadata = existing?.metadata as Record<string, unknown> | null;
    const changed = existing && (existing.title !== title || existing.content !== content ||
      oldMetadata?.postId !== postId || oldMetadata?.status !== currentPost.status || oldMetadata?.isHidden !== currentPost.isHidden || oldMetadata?.isPremiumOnly !== currentPost.isPremiumOnly);
    const item = await tx.knowledgeItem.upsert({
      where:{expertProfileId_sourceType_sourceId:key},create:{...key,title,content,metadata},
      update:changed ? {title,content,metadata,sourceVersion:{increment:1},isIndexed:false,indexingError:null} : {sourceId:postId},
    });
    return item.id;
  });
  if (itemId) await syncKnowledgeItem(expert.id,itemId);
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
    const expert = await tx.expertProfile.findUnique({where:{userId:authorId}});
    // Acquire the parent lock before a post write/outbox FK can reverse sync's lock order.
    if (expert) {
      const owners = await tx.$queryRaw<{userId:string}[]>`SELECT "userId" FROM "ExpertProfile" WHERE "id"=${expert.id} FOR UPDATE`;
      if (owners[0]?.userId !== authorId) throw new Error("Post source owner changed");
    }
    const post = await mutate(tx);
    if (expert) await enqueueLifecycleJob({kind:"POST_SYNC",expertProfileId:expert.id,itemId:post.id,sourceVersion:null,namespace:expert.vectorNamespace,vectorIds:[]},tx);
    return post;
  });
}
