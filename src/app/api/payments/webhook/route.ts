import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { sendNotificationEmail } from "@/lib/email/send-notification-email";

// Verify Razorpay webhook signature
function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    if (expectedSignature.length !== signature.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature || !process.env.RAZORPAY_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Missing signature or webhook secret" },
        { status: 400 }
      );
    }

    // Verify signature
    const isValid = verifyWebhookSignature(
      rawBody,
      signature,
      process.env.RAZORPAY_WEBHOOK_SECRET
    );

    if (!isValid) {
      console.error("Invalid Razorpay webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;

    console.log(`[Razorpay Webhook] Event: ${eventType}`);

    switch (eventType) {
      case "subscription.authenticated":
      case "subscription.activated": {
        // Subscription confirmed — activate in DB
        const subscriptionId =
          event.payload?.subscription?.entity?.id;
        if (!subscriptionId) break;

        const sub = await prisma.expertSubscription.findFirst({
          where: { razorpaySubscriptionId: subscriptionId },
        });

        if (sub) {
          const wasPending = sub.status === "PENDING";
          const currentPeriodEnd = new Date();
          currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

          // Atomic update — only set ACTIVE, prevents double processing
          const updateResult = await prisma.expertSubscription.updateMany({
            where: {
              id: sub.id,
              status: { not: "ACTIVE" }, // Skip if already ACTIVE (idempotent)
            },
            data: {
              status: "ACTIVE",
              startDate: new Date(),
              currentPeriodEnd,
            },
          });

          // Only increment count and notify if we actually changed the status
          if (updateResult.count > 0 && wasPending) {
            await prisma.expertProfile.update({
              where: { id: sub.expertProfileId },
              data: { totalSubscribers: { increment: 1 } },
            });

            // Get expert userId for notification
            const expertProfile = await prisma.expertProfile.findUnique({
              where: { id: sub.expertProfileId },
              select: { userId: true },
            });

            if (expertProfile) {
              const subscriber = await prisma.user.findUnique({
                where: { id: sub.subscriberId },
                select: { name: true },
              });

              await prisma.notification.create({
                data: {
                  userId: expertProfile.userId,
                  title: "New Premium Subscriber",
                  message: `${subscriber?.name || "Someone"} subscribed to your Premium plan!`,
                  link: "/expert/subscribers",
                },
              });

              sendNotificationEmail({
                type: "new_subscriber",
                recipientUserId: expertProfile.userId,
                data: { subscriberName: subscriber?.name || "Someone" },
              }).catch(() => {});
            }
          }
        }
        break;
      }

      case "subscription.charged": {
        // Payment succeeded (first payment or monthly recurring)
        const subscriptionId =
          event.payload?.subscription?.entity?.id;
        const paymentId =
          event.payload?.payment?.entity?.id;
        if (!subscriptionId) break;

        const chargedSub = await prisma.expertSubscription.findFirst({
          where: { razorpaySubscriptionId: subscriptionId },
        });

        if (chargedSub) {
          const wasPending = chargedSub.status === "PENDING";
          const currentPeriodEnd = new Date();
          currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

          await prisma.expertSubscription.update({
            where: { id: chargedSub.id },
            data: {
              status: "ACTIVE",
              razorpayPaymentId: paymentId || undefined,
              currentPeriodEnd,
            },
          });

          // First payment — increment subscriber count if was PENDING
          if (wasPending) {
            await prisma.expertProfile.update({
              where: { id: chargedSub.expertProfileId },
              data: { totalSubscribers: { increment: 1 } },
            });

            const expertProfile = await prisma.expertProfile.findUnique({
              where: { id: chargedSub.expertProfileId },
              select: { userId: true },
            });

            if (expertProfile) {
              const subscriber = await prisma.user.findUnique({
                where: { id: chargedSub.subscriberId },
                select: { name: true },
              });

              await prisma.notification.create({
                data: {
                  userId: expertProfile.userId,
                  title: "New Premium Subscriber",
                  message: `${subscriber?.name || "Someone"} subscribed to your Premium plan!`,
                  link: "/expert/subscribers",
                },
              });

              sendNotificationEmail({
                type: "new_subscriber",
                recipientUserId: expertProfile.userId,
                data: { subscriberName: subscriber?.name || "Someone" },
              }).catch(() => {});
            }
          }
        }
        break;
      }

      case "subscription.pending": {
        // Payment is being retried
        const subscriptionId =
          event.payload?.subscription?.entity?.id;
        if (!subscriptionId) break;

        await prisma.expertSubscription.updateMany({
          where: { razorpaySubscriptionId: subscriptionId },
          data: { status: "PAST_DUE" },
        });
        break;
      }

      case "subscription.halted": {
        // All payment retries failed
        const subscriptionId =
          event.payload?.subscription?.entity?.id;
        if (!subscriptionId) break;

        const sub = await prisma.expertSubscription.findFirst({
          where: { razorpaySubscriptionId: subscriptionId },
        });

        if (sub && (sub.status === "ACTIVE" || sub.status === "PAST_DUE")) {
          await prisma.expertSubscription.update({
            where: { id: sub.id },
            data: {
              status: "EXPIRED",
              endDate: new Date(),
            },
          });

          await prisma.expertProfile.update({
            where: { id: sub.expertProfileId },
            data: { totalSubscribers: { decrement: 1 } },
          });
        }
        break;
      }

      case "subscription.cancelled": {
        // Subscription was cancelled (from Razorpay dashboard or API)
        const subscriptionId =
          event.payload?.subscription?.entity?.id;
        if (!subscriptionId) break;

        const sub = await prisma.expertSubscription.findFirst({
          where: { razorpaySubscriptionId: subscriptionId },
        });

        if (sub && (sub.status === "ACTIVE" || sub.status === "PAST_DUE")) {
          await prisma.expertSubscription.update({
            where: { id: sub.id },
            data: {
              status: "CANCELLED",
              endDate: new Date(),
            },
          });

          await prisma.expertProfile.update({
            where: { id: sub.expertProfileId },
            data: { totalSubscribers: { decrement: 1 } },
          });
        } else if (sub && sub.status === "PENDING") {
          // PENDING subscription cancelled — just mark as cancelled, no count to decrement
          await prisma.expertSubscription.update({
            where: { id: sub.id },
            data: {
              status: "CANCELLED",
              endDate: new Date(),
            },
          });
        }
        break;
      }

      default:
        console.log(`[Razorpay Webhook] Unhandled event: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
