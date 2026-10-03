import { enqueueBilling } from "./billing-store";
import prisma from "@/lib/prisma";
import type { ExpertSubscription, Prisma, SubscriptionStatus } from "@prisma/client";
import { hasSubscriptionAccess, subscriptionAccessWhere } from "./access";

export class PaymentError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export type PaymentSnapshot = {
  eventType: string; providerSubscriptionId: string; occurredAt: Date;
  receipt: { id: string; payloadHash: string };
  paymentId?: string; paymentConfirmed?: boolean; currentStart?: Date; currentEnd?: Date;
};
const ranks: Record<string, number> = {
  "subscription.authenticated": 1, "subscription.activated": 2, "subscription.charged": 3,
  "subscription.pending": 4, "subscription.halted": 5, "subscription.cancelled": 6,
};
export const supportedPaymentEvent = (type: string) => Object.prototype.hasOwnProperty.call(ranks, type);
export function providerDate(seconds: unknown): Date | undefined {
  if (typeof seconds !== "number" || !Number.isSafeInteger(seconds) || seconds <= 0) return;
  const date = new Date(seconds * 1000); return Number.isNaN(date.getTime()) ? undefined : date;
}
const newer = (sub: ExpertSubscription, input: PaymentSnapshot) => !sub.lastPaymentEventAt ||
  input.occurredAt > sub.lastPaymentEventAt || (input.occurredAt.getTime() === sub.lastPaymentEventAt.getTime() && ranks[input.eventType] > sub.lastPaymentEventRank);
async function lockSubscription(tx: Prisma.TransactionClient, providerId: string) {
  const ids = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "ExpertSubscription" WHERE "razorpaySubscriptionId"=${providerId} FOR UPDATE`;
  if (ids.length !== 1) throw new PaymentError("Subscription unavailable; retry after reconciliation", 503);
  return tx.expertSubscription.findUniqueOrThrow({ where: { id: ids[0].id } });
}
async function updateCounter(tx: Prisma.TransactionClient, expertProfileId: string) {
  const count = await tx.expertSubscription.count({ where: { expertProfileId, ...subscriptionAccessWhere() } });
  await tx.expertProfile.update({ where: { id: expertProfileId }, data: { totalSubscribers: count } });
}
async function transition(tx: Prisma.TransactionClient, sub: ExpertSubscription, input: PaymentSnapshot) {
  if (!supportedPaymentEvent(input.eventType)) throw new PaymentError("Unsupported payment event", 400);
  if (["subscription.authenticated", "subscription.activated"].includes(input.eventType)) {
    return { status: sub.status, outcome: "awaiting-confirmed-charge" };
  }
  const isNewer = newer(sub, input);
  const charged = input.eventType === "subscription.charged";
  if (!charged && !isNewer) return { status: sub.status, outcome: "older-event-ignored" };
  if (charged && (!input.paymentConfirmed || !input.paymentId)) return { status: sub.status, outcome: "unconfirmed-charge-reconciliation" };
  if (charged && (!input.currentStart || !input.currentEnd || input.currentStart >= input.currentEnd)) {
    return { status: sub.status, outcome: "missing-period-reconciliation" };
  }
  // A single interval cannot safely represent a future disjoint paid period. Preserve known access,
  // record the provider dates, and reconcile rather than invent coverage across the unpaid gap.
  if (charged && sub.currentPeriodEnd && sub.currentPeriodEnd > new Date() && input.currentStart! > sub.currentPeriodEnd) {
    return { status: sub.status, outcome: "disjoint-period-reconciliation" };
  }
  await tx.$queryRaw`SELECT "id" FROM "ExpertProfile" WHERE "id"=${sub.expertProfileId} FOR UPDATE`;
  const data: Prisma.ExpertSubscriptionUpdateInput = {};
  if (isNewer) { data.lastPaymentEventAt = input.occurredAt; data.lastPaymentEventRank = ranks[input.eventType]; }
  let status: SubscriptionStatus = sub.status;
  let outcome = "applied";
  if (charged) {
    if (!sub.currentPeriodEnd || input.currentEnd! > sub.currentPeriodEnd) {
      data.currentPeriodEnd = input.currentEnd;
      data.paidPeriodStart = sub.paidPeriodStart && sub.currentPeriodEnd && input.currentStart! <= sub.currentPeriodEnd
        ? new Date(Math.min(sub.paidPeriodStart.getTime(), input.currentStart!.getTime())) : input.currentStart;
      data.razorpayPaymentId = input.paymentId;
    } else if (!sub.paidPeriodStart || !sub.razorpayPaymentId) {
      // A legacy unverified expiry is not proof. Adopt only the exact confirmed provider interval.
      data.currentPeriodEnd = input.currentEnd; data.paidPeriodStart = input.currentStart; data.razorpayPaymentId = input.paymentId;
    }
    // Late charge delivery grants only its verified interval; it never restarts renewal.
    status = sub.renewalCancelledAt || sub.status === "CANCELLED" ? "CANCELLED" : isNewer || sub.status === "PENDING" ? "ACTIVE" : sub.status;
    data.status = status;
    if (status === "CANCELLED") data.endDate = (data.currentPeriodEnd as Date | undefined) || sub.currentPeriodEnd;
    if (sub.renewalCancelledAt && input.occurredAt > sub.renewalCancelledAt) outcome = "confirmed-charge-after-cancellation-reconciliation";
  } else if (input.eventType === "subscription.cancelled") {
    status = "CANCELLED"; data.status = status;
    data.renewalCancelledAt = sub.renewalCancelledAt || input.occurredAt;
    data.endDate = sub.currentPeriodEnd || input.occurredAt;
  } else if (sub.renewalCancelledAt || sub.status === "CANCELLED") {
    return { status: sub.status, outcome: "renewal-cancelled-ignored" };
  } else {
    status = input.eventType === "subscription.pending" ? "PAST_DUE" : "EXPIRED";
    data.status = status;
  }
  await tx.expertSubscription.update({ where: { id: sub.id }, data });
  await tx.$executeRaw`UPDATE "ExpertSubscription" SET "billingVersion"="billingVersion"+1 WHERE "id"=${sub.id}`;
  await updateCounter(tx, sub.expertProfileId);
  let notification: { recipientUserId: string; subscriberName: string } | undefined;
  const notificationId = `payment-activation-${sub.id}-${input.providerSubscriptionId}`;
  if (charged && !await tx.notification.findUnique({ where: { id: notificationId } })) {
    const expert = await tx.expertProfile.findUniqueOrThrow({ where: { id: sub.expertProfileId }, select: { userId: true } });
    const subscriber = await tx.user.findUnique({ where: { id: sub.subscriberId }, select: { name: true } });
    notification = { recipientUserId: expert.userId, subscriberName: subscriber?.name || "Someone" };
    await tx.notification.create({ data: { id: notificationId, userId: expert.userId, title: "New Subscriber", message: `${notification.subscriberName} subscribed to your ${sub.tier} plan!`, link: "/expert/subscribers" } });
  }
  if (notification) await enqueueBilling(tx, notificationId, { type: "new_subscriber", ...notification });
  return { status, outcome };
}
export async function applyPaymentSnapshot(input: PaymentSnapshot) {
  return prisma.$transaction(async tx => {
    const existingReceipt = await tx.paymentEvent.findUnique({ where: { id: input.receipt.id } });
    if (existingReceipt) {
      if (existingReceipt.payloadHash !== input.receipt.payloadHash) throw new PaymentError("Event ID payload mismatch", 409);
      return { outcome: "duplicate" };
    }
    const sub = await lockSubscription(tx, input.providerSubscriptionId);
    const receipt = await tx.paymentEvent.findUnique({ where: { id: input.receipt.id } });
    if (receipt) {
      if (receipt.payloadHash !== input.receipt.payloadHash) throw new PaymentError("Event ID payload mismatch", 409);
      return { status: sub.status, outcome: "duplicate" };
    }
    const result = await transition(tx, sub, input);
    await tx.paymentEvent.create({ data: {
      id: input.receipt.id, payloadHash: input.receipt.payloadHash,
      providerSubscriptionId: input.providerSubscriptionId, eventType: input.eventType,
      occurredAt: input.occurredAt, outcome: result.outcome, paymentId: input.paymentId,
      periodStart: input.currentStart, periodEnd: input.currentEnd,
    } });
    return result;
  });
}
export async function completeCancellation(id: string, subscriberId: string, providerId: string | null) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "ExpertSubscription" WHERE "id"=${id} FOR UPDATE`;
    const sub = await tx.expertSubscription.findUniqueOrThrow({ where: { id } });
    if (sub.subscriberId !== subscriberId) throw new PaymentError("Forbidden", 403);
    if (sub.razorpaySubscriptionId !== providerId) throw new PaymentError("Subscription changed; retry cancellation", 409);
    if (sub.status !== "CANCELLED") {
      await tx.$queryRaw`SELECT "id" FROM "ExpertProfile" WHERE "id"=${sub.expertProfileId} FOR UPDATE`;
      await tx.expertSubscription.update({ where: { id }, data: { status: "CANCELLED", renewalCancelledAt: new Date(), endDate: sub.currentPeriodEnd || new Date() } });
      await tx.$executeRaw`UPDATE "ExpertSubscription" SET "billingVersion"="billingVersion"+1 WHERE "id"=${sub.id}`;
      await updateCounter(tx, sub.expertProfileId);
    }
    const current = await tx.expertSubscription.findUniqueOrThrow({ where: { id } });
    return { cancelled: true, status: current.status, hasAccess: hasSubscriptionAccess(current), currentPeriodEnd: current.currentPeriodEnd, renewalCancelled: true };
  });
}
