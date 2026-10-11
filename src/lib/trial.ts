import prisma from "@/lib/prisma";
import type { Prisma, ExpertSubscription } from "@prisma/client";
import { hasSubscriptionAccess } from "@/lib/payments/access";

export class UsageAccessChanged extends Error {
  constructor(message = "Chat access changed before recording usage") { super(message); }
}

type UsageIdentity = {
  ownerId: string;
  namespace: string;
  sessionId?: string;
  isTrial?: boolean;
  viewerRole?: string;
};

/** Counters have no FK: hold their parents through commit so cleanup cannot
 * finish first and a deferred upsert recreate an orphan. Match cleanup order. */
export async function authorizeUsageCounter(tx: Prisma.TransactionClient, userId: string, expertProfileId: string, expected: UsageIdentity) {
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" IN (${expected.ownerId},${userId}) ORDER BY "id" FOR NO KEY UPDATE`;
  await tx.$queryRaw`SELECT "id" FROM "ExpertProfile" WHERE "id"=${expertProfileId} FOR UPDATE`;
  if (expected.sessionId) await tx.$queryRaw`SELECT "id" FROM "ChatSession" WHERE "id"=${expected.sessionId} FOR UPDATE`;
  const expert = await tx.expertProfile.findUnique({where: {id: expertProfileId}});
  const users = await tx.user.findMany({where: {id: {in: [expected.ownerId, userId]}}});
  const owner = users.find(user => user.id === expected.ownerId), viewer = users.find(user => user.id === userId);
  if (!expert || expert.userId !== expected.ownerId || expert.vectorNamespace !== expected.namespace ||
    !owner || !viewer || owner.isBanned || !owner.isActive || viewer.isBanned || !viewer.isActive ||
    !["EXPERT", "ADMIN"].includes(owner.role) || (expected.viewerRole && viewer.role !== expected.viewerRole)) throw new UsageAccessChanged();
  let subscription: ExpertSubscription | null = null;
  if (expected.sessionId) {
    const current = await tx.chatSession.findUnique({where: {id: expected.sessionId}});
    if (!current || current.subscriberId !== userId || current.expertProfileId !== expertProfileId || current.isTrial !== expected.isTrial) throw new UsageAccessChanged();
    if (!current.isTrial) {
      // Payment writers can already hold subscription before expert; never
      // wait on the reverse edge while holding our expert/session parents.
      try {
        await tx.$queryRaw`SELECT "id" FROM "ExpertSubscription" WHERE "expertProfileId"=${expertProfileId} AND "subscriberId"=${userId} FOR UPDATE NOWAIT`;
      } catch { throw new UsageAccessChanged("Subscription is changing; please retry"); }
      subscription = await tx.expertSubscription.findUnique({where: {subscriberId_expertProfileId: {subscriberId: userId, expertProfileId}}});
      if (!hasSubscriptionAccess(subscription)) {
        if (userId !== expected.ownerId) throw new UsageAccessChanged("Your paid period has ended or is not confirmed");
        subscription = null;
      }
    }
  }
  return {expert, subscription};
}

export async function checkTrialAccess(userId: string, expertProfileId: string) {
  const expert = await prisma.expertProfile.findUnique({
    where: { id: expertProfileId },
    select: { freeTrialQuestions: true },
  });
  const limit = expert?.freeTrialQuestions ?? 3;

  const usage = await prisma.freeTrialUsage.findUnique({
    where: { userId_expertProfileId: { userId, expertProfileId } },
  });
  const used = usage?.questionCount ?? 0;

  return { allowed: used < limit, used, limit };
}

/** A supplied transaction is still independently guarded; callers must acquire
 * the same parent order before writing any child. No nested transaction. */
export async function incrementTrialUsage(userId: string, expertProfileId: string, tx?: Prisma.TransactionClient) {
  const increment = async (store: Prisma.TransactionClient) => {
    const expert = await store.expertProfile.findUnique({where: {id: expertProfileId}});
    if (!expert) throw new UsageAccessChanged("Expert profile no longer exists");
    await authorizeUsageCounter(store, userId, expertProfileId, {ownerId: expert.userId, namespace: expert.vectorNamespace});
    await store.freeTrialUsage.upsert({
      where: { userId_expertProfileId: { userId, expertProfileId } },
      create: { userId, expertProfileId, questionCount: 1, lastQuestionAt: new Date() },
      update: { questionCount: { increment: 1 }, lastQuestionAt: new Date() },
    });
  };
  if (tx) await increment(tx);
  else await prisma.$transaction(increment);
}
