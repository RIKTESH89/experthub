import { hasPaidAccess, type SubscriptionAccess } from "@/lib/payments/access";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface RetrievalScope {
  expertProfileId: string;
  namespace: string;
  viewerId?: string;
  isOwner: boolean;
  allowedVectorIds: string[];
  /** Internal release pin; never supplied by public request JSON. Missing means current read policy. */
  temporalReadVersion?: string;
}

export function isEntitled(subscription: SubscriptionAccess | null, now = new Date()): boolean {
  return !!subscription && subscription.tier === "PREMIUM" && hasPaidAccess(subscription, now);
}

/** Resolve from current source/entitlement rows on every request. Never cache this scope. */
export async function resolveRetrievalScope(expertProfileId: string, namespace: string, ownerId: string, viewerId?: string): Promise<RetrievalScope> {
  const isOwner = viewerId === ownerId;
  const subscription = !isOwner && viewerId ? await prisma.expertSubscription.findUnique({
    where: { subscriberId_expertProfileId: { subscriberId: viewerId, expertProfileId } },
  }) : null;
  const premium = isEntitled(subscription);
  const items = await prisma.knowledgeItem.findMany({ where: { expertProfileId, isIndexed: true } });
  const postIds = items.filter((item) => item.sourceType === "post" && item.sourceId).map((item) => item.sourceId!);
  const posts = postIds.length ? await prisma.post.findMany({ where: { id: { in: postIds }, authorId: ownerId } }) : [];
  const postMap = new Map(posts.map((post) => [post.id, post]));
  const allowedVectorIds: string[] = [];
  for (const item of items) {
    // Fail closed on legacy, stale or half-indexed records.
    if (item.indexedVersion !== item.sourceVersion) continue;
    let allowed = isOwner;
    if (item.sourceType === "post") {
      const post = item.sourceId ? postMap.get(item.sourceId) : undefined;
      if (!post || !post.isRagEnabled) continue;
      // A live post edit cannot expose an outdated copied source.
      if (item.title !== (post.title || "Untitled Post") || item.content !== (post.content || "")) continue;
      allowed = isOwner || (post.status === "PUBLISHED" && !post.isHidden && (!post.isPremiumOnly || premium));
    } else if (!isOwner) {
      const metadata = item.metadata as Prisma.JsonObject | null;
      // Existing metadata is the explicit publication channel; unspecified stays owner-only.
      allowed = metadata?.audience === "public" || (metadata?.audience === "premium" && premium);
    }
    if (allowed) allowedVectorIds.push(...item.vectorIds);
  }
  return { expertProfileId, namespace, viewerId, isOwner, allowedVectorIds: Array.from(new Set(allowedVectorIds)).sort() };
}
