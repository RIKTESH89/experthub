import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { isEntitled } from "./access";

/** Apply before pagination/counting; entitlement is evaluated by the database on each read. */
export function readablePostsWhere(viewerId?: string, now = new Date()): Prisma.PostWhereInput {
  const publicPost = { status: "PUBLISHED" as const, isHidden: false, isPremiumOnly: false };
  if (!viewerId) return publicPost;
  return { OR: [publicPost, { authorId: viewerId }, {
    status: "PUBLISHED", isHidden: false,
    author: { expertProfile: { subscriptions: { some: {
      subscriberId: viewerId, status: "ACTIVE", tier: "PREMIUM",
      AND: [ { OR: [{ endDate: null }, { endDate: { gt: now } }] },
        { OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }] } ],
    } } } },
  }] };
}

export async function canReadPost(post: { authorId: string; status: string; isHidden: boolean; isPremiumOnly: boolean }, viewerId?: string): Promise<boolean> {
  if (viewerId === post.authorId) return true;
  if (post.status !== "PUBLISHED" || post.isHidden) return false;
  if (!post.isPremiumOnly) return true;
  if (!viewerId) return false;
  const expert = await prisma.expertProfile.findUnique({ where: { userId: post.authorId }, select: { id: true } });
  if (!expert) return false;
  return isEntitled(await prisma.expertSubscription.findUnique({ where: {
    subscriberId_expertProfileId: { subscriberId: viewerId, expertProfileId: expert.id },
  } }));
}
