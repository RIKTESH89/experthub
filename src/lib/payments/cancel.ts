import prisma from "@/lib/prisma";
import { getRazorpay } from "@/lib/razorpay";
import { completeCancellation, PaymentError } from "./state";
export async function cancelSubscription(id: string, subscriberId: string) {
  const sub = await prisma.expertSubscription.findUnique({ where: { id } });
  if (!sub) throw new PaymentError("Subscription not found", 404);
  if (sub.subscriberId !== subscriberId) throw new PaymentError("Forbidden", 403);
  if (sub.status === "CANCELLED") return completeCancellation(sub.id, subscriberId, sub.razorpaySubscriptionId);
  if (!["ACTIVE", "PAST_DUE", "PENDING"].includes(sub.status)) throw new PaymentError("Subscription is not active", 400);
  if (sub.razorpaySubscriptionId) {
    try {
      const result = await getRazorpay().subscriptions.cancel(sub.razorpaySubscriptionId, false);
      if (result.status !== "cancelled") throw new Error("Provider cancellation is not complete");
    } catch {
      throw new PaymentError("Payment provider cancellation failed. Your subscription has not been marked cancelled; retry or contact support.", 503);
    }
  }
  return completeCancellation(sub.id, subscriberId, sub.razorpaySubscriptionId);
}
