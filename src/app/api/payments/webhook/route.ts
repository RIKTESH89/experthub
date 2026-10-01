import { sendNotificationEmail } from "@/lib/email/send-notification-email";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { applyPaymentSnapshot, PaymentError, providerDate, supportedPaymentEvent } from "@/lib/payments/state";
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return NextResponse.json({ error: "Webhook unavailable" }, { status: 503 });
    const raw = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";
    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    if (!/^[a-f0-9]{64}$/i.test(signature) || !crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
    const event = JSON.parse(raw);
    if (!supportedPaymentEvent(event.event)) return NextResponse.json({ received: true, outcome: "unsupported" });
    const entity = event.payload?.subscription?.entity;
    const occurredAt = providerDate(event.created_at);
    if (typeof entity?.id !== "string" || !entity.id || !occurredAt) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    const hash = crypto.createHash("sha256").update(raw).digest("hex");
    const result = await applyPaymentSnapshot({
      providerSubscriptionId: entity.id, eventType: event.event, occurredAt,
      receipt: { id: request.headers.get("x-razorpay-event-id") || `body-${hash}`, payloadHash: hash },
      paymentId: typeof event.payload?.payment?.entity?.id === "string" ? event.payload.payment.entity.id : undefined,
      paymentConfirmed: event.payload?.payment?.entity?.status === "captured",
      currentStart: providerDate(entity.current_start), currentEnd: providerDate(entity.current_end),
    });
    if ("notification" in result && result.notification) {
      sendNotificationEmail({ type: "new_subscriber", recipientUserId: result.notification.recipientUserId, data: { subscriberName: result.notification.subscriberName } }).catch(() => {});
    }
    return NextResponse.json({ received: true, outcome: result.outcome });
  } catch (error) {
    const status = error instanceof PaymentError ? error.status : error instanceof SyntaxError ? 400 : 500;
    return NextResponse.json({ error: error instanceof PaymentError ? error.message : "Webhook processing failed" }, { status });
  }
}
