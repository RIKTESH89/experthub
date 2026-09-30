import prisma from "@/lib/prisma";
import { indexDocument, removeDocument } from "@/lib/vector/indexer";

/** Replay-safe: an event identifies a source; its old payload is never authoritative. */
export async function syncKnowledgeItem(expertProfileId: string, itemId: string) {
  const item = await prisma.knowledgeItem.findUnique({ where: { id: itemId }, include: { expertProfile: true } });
  if (!item || item.expertProfileId !== expertProfileId) return null;
  if (item.isIndexed && item.indexedVersion === item.sourceVersion) return item;
  const version = item.sourceVersion;
  try {
    const vectorIds = await indexDocument(item.expertProfile.vectorNamespace, item.id,
      `${item.title}\n\n${item.content}`, {
        ...((item.metadata as Record<string, unknown>) || {}),
        title: item.title, sourceType: item.sourceType, sourceId: item.sourceId,
        expertProfileId, knowledgeItemId: item.id, sourceVersion: version,
      });
    // Compare-and-set prevents delayed/reordered jobs from publishing an old revision.
    const published = await prisma.knowledgeItem.updateMany({
      where: { id: item.id, expertProfileId, sourceVersion: version },
      data: { vectorIds, isIndexed: true, indexedVersion: version, indexingError: null },
    });
    if (!published.count) {
      await removeDocument(item.expertProfile.vectorNamespace, vectorIds);
      return null;
    }
    // Old vectors remain harmless: retrieval authorizes only the current manifest.
    if (item.vectorIds.length) {
      await removeDocument(item.expertProfile.vectorNamespace, item.vectorIds.filter((id) => !vectorIds.includes(id)));
    }
    return { ...item, vectorIds, isIndexed: true, indexedVersion: version, indexingError: null };
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
  await prisma.knowledgeItem.deleteMany({ where: { id: itemId, expertProfileId } });
  await removeDocument(item.expertProfile.vectorNamespace, item.vectorIds);
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
    update: changed ? { title, content, metadata, sourceVersion: { increment: 1 }, isIndexed: false, indexingError: null } : {},
  });
  await syncKnowledgeItem(expert.id, item.id);
}

export async function removePostSource(postId: string, authorId: string) {
  const expert = await prisma.expertProfile.findUnique({ where: { userId: authorId } });
  if (!expert) return;
  const items = await prisma.knowledgeItem.findMany({ where: { expertProfileId: expert.id, sourceType: "post", sourceId: postId } });
  for (const item of items) await removeKnowledgeItem(expert.id, item.id);
}
