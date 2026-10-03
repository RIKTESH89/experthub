import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import type { BillingOutboxStore, BillingDelivery } from "./outbox";
import type { ReconciliationStore } from "./reconciliation";
import { subscriptionAccessWhere } from "./access";
export async function enqueueBilling(tx: Prisma.TransactionClient, id: string, payload: unknown) {
  await tx.$executeRaw`INSERT INTO "BillingOutbox" ("id", "payload") VALUES (${id}, ${JSON.stringify(payload)}::jsonb) ON CONFLICT ("id") DO NOTHING`;
}
export const billingOutboxStore: BillingOutboxStore = {
  claim: (now, until, limit, maxAttempts = 5) => prisma.$transaction(async tx => {
    if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || !Number.isSafeInteger(limit) || limit < 1 || until <= now) throw new Error("Invalid lease policy");
    await tx.$executeRaw`UPDATE "BillingOutbox" SET "state"='FAILED', "lastError"='attempt-limit-exhausted', "leaseToken"=NULL, "leaseUntil"=NULL WHERE "attempts">=${maxAttempts} AND ("state"='READY' OR ("state"='LEASED' AND "leaseUntil"<=${now}))`;
    const token = randomUUID();
    return tx.$queryRaw<BillingDelivery[]>`WITH due AS (SELECT "id" FROM "BillingOutbox" WHERE "attempts"<${maxAttempts} AND (("state"='READY' AND "nextAttemptAt"<=${now}) OR ("state"='LEASED' AND "leaseUntil"<=${now})) ORDER BY "nextAttemptAt", "id" FOR UPDATE SKIP LOCKED LIMIT ${limit}) UPDATE "BillingOutbox" b SET "state"='LEASED', "leaseToken"=${token}, "leaseUntil"=${until}, "attempts"=b."attempts"+1 FROM due WHERE b."id"=due."id" RETURNING b."id", b."payload", b."leaseToken", b."attempts"`;
  }),
  owns: async (id, token, now) => (await prisma.$queryRaw<{ id: string }[]>`SELECT "id" FROM "BillingOutbox" WHERE "id"=${id} AND "state"='LEASED' AND "leaseToken"=${token} AND "leaseUntil">${now}`).length === 1,
  settle: async (id, token, result) => (await prisma.$executeRaw`UPDATE "BillingOutbox" SET "state"=${result.state === "RETRY" ? "READY" : result.state}, "nextAttemptAt"=${result.nextAttemptAt || new Date()}, "lastError"=${result.error || null}, "leaseToken"=NULL, "leaseUntil"=NULL WHERE "id"=${id} AND "state"='LEASED' AND "leaseToken"=${token}`) === 1,
};
export const reconciliationStore: ReconciliationStore = {
  apply: plan => prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "ExpertSubscription" WHERE "id"=${plan.row.id} AND "billingVersion"=${plan.row.version} AND "razorpaySubscriptionId"=${plan.row.providerId} AND ("renewalCancelledAt" IS NOT NULL OR "status"='CANCELLED')=${plan.row.cancelled} FOR UPDATE`;
    if (!rows.length) return false;
    const sub = await tx.expertSubscription.findUniqueOrThrow({ where: { id: plan.row.id } });
    if (sub.paidPeriodStart && sub.currentPeriodEnd && sub.razorpayPaymentId) return false;
    // Serialize counter recomputation in the same order as webhook/cancellation.
    await tx.$queryRaw`SELECT "id" FROM "ExpertProfile" WHERE "id"=${sub.expertProfileId} FOR UPDATE`;
    await tx.expertSubscription.update({ where: { id: sub.id }, data: { paidPeriodStart: plan.evidence.start, currentPeriodEnd: plan.evidence.end, razorpayPaymentId: plan.evidence.paymentId, status: plan.row.cancelled ? "CANCELLED" : "ACTIVE", ...(plan.row.cancelled ? { endDate: plan.evidence.end } : {}) } });
    await tx.$executeRaw`UPDATE "ExpertSubscription" SET "billingVersion"="billingVersion"+1 WHERE "id"=${sub.id}`;
    await tx.$executeRaw`INSERT INTO "BillingReconciliation" ("id", "subscriptionId", "reviewedDigest", "previousVersion", "evidence") VALUES (${randomUUID()}, ${sub.id}, ${plan.digest}, ${plan.row.version}, ${JSON.stringify(plan.evidence)}::jsonb)`;
    const count = await tx.expertSubscription.count({ where: { expertProfileId: sub.expertProfileId, ...subscriptionAccessWhere() } });
    await tx.expertProfile.update({ where: { id: sub.expertProfileId }, data: { totalSubscribers: count } });
    await enqueueBilling(tx, `reconciliation-${plan.digest}`, { type: "billing_reconciled", subscriptionId: sub.id });
    return true;
  }),
};
