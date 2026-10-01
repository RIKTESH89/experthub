import type { Prisma } from "@prisma/client";
export interface SubscriptionAccess {
  status: string; tier: string; razorpayPaymentId?: string | null;
  paidPeriodStart?: Date | null; currentPeriodEnd?: Date | null;
}
/** B1–B4: only confirmed paid intervals authorize paid access; renewal state is independent.
 * Missing/legacy dates fail closed. End is exclusive. No unpaid grace or local month inference.
 */
export function hasPaidAccess(sub: SubscriptionAccess | null, now = new Date()): boolean {
  return !!sub && ["ACTIVE", "CANCELLED", "PAST_DUE", "EXPIRED"].includes(sub.status) &&
    !!sub.razorpayPaymentId && !!sub.paidPeriodStart && !!sub.currentPeriodEnd &&
    sub.paidPeriodStart <= now && sub.currentPeriodEnd > now;
}
export function hasSubscriptionAccess(sub: SubscriptionAccess | null, now = new Date()): boolean {
  if (!sub) return false;
  return sub.tier === "FREE" ? sub.status === "ACTIVE" : hasPaidAccess(sub, now);
}
export function paidAccessWhere(now = new Date()): Prisma.ExpertSubscriptionWhereInput {
  return { status: { in: ["ACTIVE", "CANCELLED", "PAST_DUE", "EXPIRED"] }, razorpayPaymentId: { not: null }, paidPeriodStart: { lte: now }, currentPeriodEnd: { gt: now } };
}
export function subscriptionAccessWhere(now = new Date()): Prisma.ExpertSubscriptionWhereInput {
  return { OR: [{ tier: "FREE", status: "ACTIVE" }, { tier: { in: ["STANDARD", "PREMIUM"] }, ...paidAccessWhere(now) }] };
}
