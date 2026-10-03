import { requireBillingAdmin } from "./billing-admin-store";
import { enqueueBilling } from "./billing-store";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import type { ProvisioningIntent, ProvisioningStore } from "./provisioning";
import { hasSubscriptionAccess } from "./access";
type StoredIntent = ProvisioningIntent & { subscriberId: string; expertProfileId: string; subscriptionId: string; expectedVersion: number; tier: "STANDARD" | "PREMIUM"; price: number };
class RetryPairRead extends Error {}
async function beginProvisioningOnce(subscriberId: string, expertProfileId: string, tier: "STANDARD" | "PREMIUM", price: number) {
  return prisma.$transaction(async tx => {
    // Existing rows always lock subscription before expert. If the absent-row read
    // becomes stale while waiting on expert, rollback and retry in that same order.
    await tx.$queryRaw`SELECT "id" FROM "ExpertSubscription" WHERE "subscriberId"=${subscriberId} AND "expertProfileId"=${expertProfileId} FOR UPDATE`;
    const existing = await tx.expertSubscription.findUnique({ where: { subscriberId_expertProfileId: { subscriberId, expertProfileId } } });
    if (hasSubscriptionAccess(existing)) throw new Error("Existing subscription has access");
    await tx.$queryRaw`SELECT "id" FROM "ExpertProfile" WHERE "id"=${expertProfileId} FOR UPDATE`;
    if (!existing && await tx.expertSubscription.findUnique({ where: { subscriberId_expertProfileId: { subscriberId, expertProfileId } } })) throw new RetryPairRead();
    const open = await tx.$queryRaw<StoredIntent[]>`SELECT * FROM "BillingProvisioning" WHERE "subscriberId"=${subscriberId} AND "expertProfileId"=${expertProfileId} AND "state"<>'ATTACHED'`;
    if (open.length) {
      if (open[0].tier !== tier || open[0].price !== price) throw new Error("Unresolved provisioning differs; review required");
      return open[0];
    }
    if (existing?.status === "PENDING" && existing.razorpaySubscriptionId) {
      const attached = await tx.$queryRaw<StoredIntent[]>`SELECT * FROM "BillingProvisioning" WHERE "subscriptionId"=${existing.id} AND "providerId"=${existing.razorpaySubscriptionId} AND "state"='ATTACHED'`;
      if (!attached.length || attached[0].tier !== tier || attached[0].price !== price) throw new Error("Existing pending provider requires review");
      return attached[0];
    }
    const sub = existing || await tx.expertSubscription.create({ data: { subscriberId, expertProfileId, tier, price, status: "PENDING" } });
    const versions = await tx.$queryRaw<{ billingVersion: number }[]>`SELECT "billingVersion" FROM "ExpertSubscription" WHERE "id"=${sub.id}`;
    const id = randomUUID();
    const rows = await tx.$queryRaw<StoredIntent[]>`INSERT INTO "BillingProvisioning" ("id", "subscriberId", "expertProfileId", "subscriptionId", "expectedVersion", "tier", "price") VALUES (${id}, ${subscriberId}, ${expertProfileId}, ${sub.id}, ${versions[0].billingVersion}, ${tier}, ${price}) RETURNING *`;
    return rows[0];
  });
}
export async function beginProvisioning(subscriberId: string, expertProfileId: string, tier: "STANDARD" | "PREMIUM", price: number) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await beginProvisioningOnce(subscriberId, expertProfileId, tier, price); }
    catch (error) { if (!(error instanceof RetryPairRead) || attempt === 2) throw error; }
  }
  throw new Error("Subscription changed; retry");
}
export const provisioningStore: ProvisioningStore = {
  claim: async (id, version) => {
    const rows = await prisma.$queryRaw<StoredIntent[]>`UPDATE "BillingProvisioning" SET "state"='IN_FLIGHT', "version"="version"+1 WHERE "id"=${id} AND "version"=${version} AND "state"='READY' RETURNING *`;
    return rows[0] || null;
  },
  save: async (id, version, patch) => {
    const rows = await prisma.$queryRaw<StoredIntent[]>`UPDATE "BillingProvisioning" SET "state"=COALESCE(${patch.state || null},"state"), "planId"=COALESCE(${patch.planId || null},"planId"), "providerId"=COALESCE(${patch.providerId || null},"providerId"), "version"="version"+1 WHERE "id"=${id} AND "version"=${version} AND "state" IN ('IN_FLIGHT','UNKNOWN') AND (${patch.providerId || null}::text IS NULL OR "providerId" IS NULL OR "providerId"=${patch.providerId || null}) RETURNING *`;
    if (!rows.length) throw new Error("Provisioning version conflict");
    return rows[0];
  },
  attach: intent => attachIntent(intent),
};
function attachIntent(intent:ProvisioningIntent,review?:{actorId:string;digest:string}) {
 return prisma.$transaction(async tx => {
    if(review)await requireBillingAdmin(tx,review.actorId);
    const rows = await tx.$queryRaw<StoredIntent[]>`SELECT * FROM "BillingProvisioning" WHERE "id"=${intent.id}`;
    const current = rows[0];
    if (!current || current.version !== intent.version || !intent.providerId || !['IN_FLIGHT','UNKNOWN'].includes(current.state)) throw new Error("Provisioning version conflict");
    if (current.providerId && current.providerId !== intent.providerId) throw new Error("Provider identity mismatch");
    await tx.$queryRaw`SELECT "id" FROM "ExpertSubscription" WHERE "id"=${current.subscriptionId} FOR UPDATE`;
    const sub = await tx.expertSubscription.findUniqueOrThrow({ where: { id: current.subscriptionId } });
    if (hasSubscriptionAccess(sub)) throw new Error("Paid access changed during provisioning");
    const changed = await tx.$executeRaw`UPDATE "ExpertSubscription" SET "razorpaySubscriptionId"=${intent.providerId}, "status"='PENDING', "tier"=${current.tier}::"SubscriptionTier", "price"=${current.price}, "paidPeriodStart"=NULL, "currentPeriodEnd"=NULL, "razorpayPaymentId"=NULL, "renewalCancelledAt"=NULL, "endDate"=NULL, "lastPaymentEventAt"=NULL, "lastPaymentEventRank"=0, "billingVersion"="billingVersion"+1, "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${current.subscriptionId} AND "billingVersion"=${current.expectedVersion}`;
    if (changed !== 1) throw new Error("Subscription version conflict");
    const attached = await tx.$executeRaw`UPDATE "BillingProvisioning" SET "state"='ATTACHED', "providerId"=${intent.providerId}, "version"="version"+1 WHERE "id"=${intent.id} AND "version"=${intent.version}`;
    if (attached !== 1) throw new Error("Provisioning version conflict");
    if(review)await enqueueBilling(tx,`billing-review-recovery-${intent.id}-${intent.version}`,{type:'billing_review_audit',actorId:review.actorId,reviewedDigest:review.digest,intentId:intent.id,providerId:intent.providerId});
  });
}
export function reviewedProvisioningStore(actorId:string,digest:string):ProvisioningStore {
 return {...provisioningStore,attach:intent=>attachIntent(intent,{actorId,digest})};
}
