import { NextRequest } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { applyPaymentSnapshot, completeCancellation } from "@/lib/payments/state";
import { hasPaidAccess } from "@/lib/payments/access";
const mockCancel = jest.fn(), mockFetch = jest.fn();
jest.mock("@/lib/razorpay", () => ({ getRazorpay: () => ({ subscriptions: { cancel: mockCancel, fetch: mockFetch } }) }));
jest.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "synthetic-visitor", role: "SUBSCRIBER" } }) }));
jest.mock("@/lib/email/send-notification-email", () => ({ sendNotificationEmail: jest.fn().mockResolvedValue(undefined) }));
import { POST as webhook } from "@/app/api/payments/webhook/route";
import { POST as verify } from "@/app/api/payments/verify/route";
import { POST as cancel } from "@/app/api/payments/cancel/route";
import { POST as toggle } from "@/app/api/experts/[expertId]/subscribe/route";
const providerId = "synthetic-rzp";
const at = (seconds: number) => new Date(seconds * 1000);
let baseTime: number;
const input = (eventType: string, id: string, offset = 0) => ({ providerSubscriptionId: providerId, eventType, occurredAt: at(baseTime + offset), currentStart: at(baseTime - 60), currentEnd: at(baseTime + 3600), paymentConfirmed: true, paymentId: "synthetic-payment", receipt: { id, payloadHash: id } });
beforeAll(async () => {
 const db = await prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
 if (db[0]?.name !== "billing_synthetic" || !process.env.DATABASE_URL?.includes("127.0.0.1:55438")) throw new Error("Unsafe test database");
});
beforeEach(async () => {
 baseTime = Math.floor(Date.now()/1000) - 60;
 await prisma.$executeRawUnsafe('TRUNCATE "BillingOutbox", "BillingProvisioning", "BillingReconciliation", "PaymentEvent", "User" CASCADE');
 await prisma.user.create({ data: { id: "synthetic-owner", email: "owner@example.invalid", role: "EXPERT", expertProfile: { create: { id: "synthetic-expert", displayName: "Synthetic Expert", specialty: [], vectorNamespace: "synthetic-payments" } } } });
 await prisma.user.create({ data: { id: "synthetic-visitor", name: "Visitor", email: "visitor@example.invalid" } });
 await prisma.expertSubscription.create({ data: { id: "synthetic-sub", subscriberId: "synthetic-visitor", expertProfileId: "synthetic-expert", status: "PENDING", tier: "PREMIUM", price: 10, razorpaySubscriptionId: providerId } });
 mockCancel.mockReset(); mockFetch.mockReset(); process.env.RAZORPAY_WEBHOOK_SECRET = "synthetic-webhook-secret";
});
afterAll(async () => { delete process.env.RAZORPAY_WEBHOOK_SECRET; await prisma.$disconnect(); });
const sub = () => prisma.expertSubscription.findUniqueOrThrow({ where: { id: "synthetic-sub" } });
const count = async () => (await prisma.expertProfile.findUniqueOrThrow({ where: { id: "synthetic-expert" } })).totalSubscribers;
const request = (path: string, body: object) => new NextRequest(`http://localhost${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
function signed(eventType = "subscription.charged", id = "signed-1", signature?: string, period = true) {
 const body = JSON.stringify({ event: eventType, created_at: baseTime, payload: { subscription: { entity: { id: providerId, ...(period ? { current_start: baseTime-60, current_end: baseTime+3600 } : {}) } }, payment: { entity: { id: "synthetic-payment", status: "captured" } } } });
 return new NextRequest("http://localhost/api/payments/webhook", { method: "POST", body, headers: { "x-razorpay-signature": signature ?? crypto.createHmac("sha256", "synthetic-webhook-secret").update(body).digest("hex"), "x-razorpay-event-id": id } });
}
test("unsigned/invalid signatures and missing configuration never mutate payments", async () => {
 expect((await webhook(signed("subscription.charged", "bad", "f".repeat(64)))).status).toBe(400);
 expect((await webhook(signed("subscription.charged", "bad", "not-hex"))).status).toBe(400);
 delete process.env.RAZORPAY_WEBHOOK_SECRET; expect((await webhook(signed())).status).toBe(503);
 expect((await sub()).status).toBe("PENDING"); expect(await prisma.paymentEvent.count()).toBe(0);
});
test("B1 authenticated/activated and verify polling never grant paid access", async () => {
 await webhook(signed("subscription.authenticated", "auth")); await webhook(signed("subscription.activated", "active"));
 expect((await sub()).status).toBe("PENDING"); expect(hasPaidAccess(await sub())).toBe(false); expect(await count()).toBe(0);
 expect((await (await verify(request("/api/payments/verify", { razorpaySubscriptionId: providerId }))).json()).verified).toBe(false);
 expect(mockFetch).not.toHaveBeenCalled(); expect(await prisma.notification.count()).toBe(0);
});
test("signed concurrent charge replay commits one receipt, verified interval, counter and notification", async () => {
 const responses = await Promise.all(Array.from({ length: 6 }, () => webhook(signed())));
 expect(responses.every(response => response.status === 200)).toBe(true); expect(hasPaidAccess(await sub())).toBe(true); expect(await count()).toBe(1);
 expect(await prisma.paymentEvent.count()).toBe(1); expect(await prisma.notification.count()).toBe(1);
 const originalEnd = (await sub()).currentPeriodEnd; await webhook(signed()); expect((await sub()).currentPeriodEnd).toEqual(originalEnd);
});
test("changed payload with reused event ID is rejected", async () => {
 await webhook(signed()); expect((await webhook(signed("subscription.cancelled"))).status).toBe(409);
 expect((await sub()).status).toBe("ACTIVE"); expect(await count()).toBe(1);
});
test("B2/B3 pending/halted/cancelled cannot remove verified paid interval or add unpaid grace", async () => {
 await applyPaymentSnapshot(input("subscription.charged", "charge", 0));
 await applyPaymentSnapshot(input("subscription.pending", "past-due", 10));
 expect((await sub()).status).toBe("PAST_DUE"); expect(hasPaidAccess(await sub())).toBe(true);
 await applyPaymentSnapshot(input("subscription.halted", "halt", 20)); expect(hasPaidAccess(await sub())).toBe(true);
 await applyPaymentSnapshot(input("subscription.cancelled", "cancel", 30));
 const current = await sub(); expect(current.status).toBe("CANCELLED"); expect(current.renewalCancelledAt).toEqual(at(baseTime+30));
 expect(hasPaidAccess(current, at(baseTime+3599))).toBe(true); expect(hasPaidAccess(current, at(baseTime+3600))).toBe(false);
 expect(await count()).toBe(1); expect(await prisma.notification.count()).toBe(1);
});
test("delayed pre-cancellation charge grants exact paid period without restarting renewal", async () => {
 await applyPaymentSnapshot(input("subscription.cancelled", "cancel-first", 30)); expect(hasPaidAccess(await sub())).toBe(false);
 await applyPaymentSnapshot(input("subscription.charged", "delayed-charge", 0));
 const current = await sub(); expect(current.status).toBe("CANCELLED"); expect(current.renewalCancelledAt).toEqual(at(baseTime+30)); expect(hasPaidAccess(current)).toBe(true); expect(await count()).toBe(1);
});
test("a confirmed charge after cancellation preserves paid access but flags reconciliation, no automatic refund or renewal", async () => {
 await applyPaymentSnapshot(input("subscription.cancelled", "cancel", 0));
 const result = await applyPaymentSnapshot(input("subscription.charged", "unexpected-charge", 10));
 expect(result.outcome).toBe("confirmed-charge-after-cancellation-reconciliation"); expect((await sub()).status).toBe("CANCELLED"); expect(hasPaidAccess(await sub())).toBe(true);
});
test("B4 missing/inverted dates or unconfirmed payment remain pending reconciliation without invented month", async () => {
 await webhook(signed("subscription.charged", "missing-period", undefined, false));
 expect((await sub()).currentPeriodEnd).toBeNull(); expect((await sub()).paidPeriodStart).toBeNull(); expect(hasPaidAccess(await sub())).toBe(false);
 expect((await prisma.paymentEvent.findUniqueOrThrow({ where: { id: "missing-period" } })).outcome).toBe("missing-period-reconciliation");
 await applyPaymentSnapshot({ ...input("subscription.charged", "inverted"), currentStart: at(baseTime+4000) });
 await applyPaymentSnapshot({ ...input("subscription.charged", "unconfirmed"), paymentConfirmed: false });
 expect((await sub()).status).toBe("PENDING"); expect(await count()).toBe(0); expect(await prisma.notification.count()).toBe(0);
});
test("out-of-order/same-second retry events cannot resurrect renewal or shrink paid coverage", async () => {
 await applyPaymentSnapshot(input("subscription.pending", "pending-new", 20));
 await applyPaymentSnapshot(input("subscription.charged", "charge-old", 10)); expect((await sub()).status).toBe("PAST_DUE"); expect(hasPaidAccess(await sub())).toBe(true);
 await applyPaymentSnapshot(input("subscription.cancelled", "cancel", 30));
 await applyPaymentSnapshot(input("subscription.activated", "late-active", 40)); await applyPaymentSnapshot(input("subscription.pending", "late-pending", 40));
 expect((await sub()).status).toBe("CANCELLED"); expect((await sub()).currentPeriodEnd).toEqual(at(baseTime+3600));
});
test("failed notification insert rolls back receipt, entitlement and counter; retry succeeds", async () => {
 await prisma.$executeRawUnsafe(`CREATE FUNCTION synthetic_payment_notification_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic notification failure'; END $$`);
 await prisma.$executeRawUnsafe('CREATE TRIGGER synthetic_payment_notification_fail BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION synthetic_payment_notification_fail()');
 try { await expect(applyPaymentSnapshot(input("subscription.charged", "rollback"))).rejects.toThrow();
   expect((await sub()).status).toBe("PENDING"); expect(await count()).toBe(0); expect(await prisma.paymentEvent.count()).toBe(0);
 } finally { await prisma.$executeRawUnsafe('DROP TRIGGER synthetic_payment_notification_fail ON "Notification"'); await prisma.$executeRawUnsafe('DROP FUNCTION synthetic_payment_notification_fail()'); }
 await applyPaymentSnapshot(input("subscription.charged", "rollback")); expect(hasPaidAccess(await sub())).toBe(true); expect(await count()).toBe(1);
});
test("concurrent verify/charge/cancel replay is read-only verification and one paid enrollment", async () => {
 mockCancel.mockResolvedValue({ status: "cancelled" });
 await Promise.all([verify(request("/api/payments/verify", { razorpaySubscriptionId: providerId })), webhook(signed()), cancel(request("/api/payments/cancel", { subscriptionId: "synthetic-sub" }))]);
 expect((await sub()).status).toBe("CANCELLED"); expect(hasPaidAccess(await sub())).toBe(true); expect(await count()).toBe(1); expect(await prisma.notification.count()).toBe(1); expect(mockFetch).not.toHaveBeenCalled();
});
test("failed provider cancel returns 503 and retains entitlement in cancel and toggle routes", async () => {
 await applyPaymentSnapshot(input("subscription.charged", "start")); mockCancel.mockRejectedValue(new Error("synthetic timeout"));
 expect((await cancel(request("/api/payments/cancel", { subscriptionId: "synthetic-sub" }))).status).toBe(503);
 expect((await toggle(request("/api/experts/synthetic-owner/subscribe", {}), { params: Promise.resolve({ expertId: "synthetic-owner" }) })).status).toBe(503);
 expect((await sub()).status).toBe("ACTIVE"); expect(hasPaidAccess(await sub())).toBe(true); expect(await count()).toBe(1);
});
test("successful concurrent cancellation is idempotent, truthful and preserves paid access", async () => {
 await applyPaymentSnapshot(input("subscription.charged", "start")); mockCancel.mockResolvedValue({ status: "active" });
 expect((await cancel(request("/api/payments/cancel", { subscriptionId: "synthetic-sub" }))).status).toBe(503);
 mockCancel.mockResolvedValue({ status: "cancelled" });
 const responses = await Promise.all([cancel(request("/api/payments/cancel", { subscriptionId: "synthetic-sub" })), cancel(request("/api/payments/cancel", { subscriptionId: "synthetic-sub" }))]);
 for (const response of responses) { expect(response.status).toBe(200); expect((await response.json()).hasAccess).toBe(true); }
 expect((await sub()).status).toBe("CANCELLED"); expect(await count()).toBe(1); expect(mockCancel).toHaveBeenCalledWith(providerId, false);
});
test("slow cancellation cannot affect replacement subscription; missing subscription receipt is retryable", async () => {
 await prisma.expertSubscription.update({ where: { id: "synthetic-sub" }, data: { razorpaySubscriptionId: "synthetic-replacement" } });
 await expect(completeCancellation("synthetic-sub", "synthetic-visitor", providerId)).rejects.toMatchObject({ status: 409 });
 expect((await webhook(signed())).status).toBe(503); expect(await prisma.paymentEvent.count()).toBe(0);
});
test("two subscribers racing commit one exact expert counter", async () => {
 await prisma.user.create({ data: { id: "synthetic-second", email: "second@example.invalid" } });
 await prisma.expertSubscription.create({ data: { id: "synthetic-sub-second", subscriberId: "synthetic-second", expertProfileId: "synthetic-expert", status: "PENDING", tier: "PREMIUM", price: 10, razorpaySubscriptionId: "synthetic-rzp-second" } });
 await Promise.all([applyPaymentSnapshot(input("subscription.charged", "first")), applyPaymentSnapshot({ ...input("subscription.charged", "second"), providerSubscriptionId: "synthetic-rzp-second" })]);
 expect(await count()).toBe(2); expect(await prisma.notification.count()).toBe(2);
});
test("expired paid interval and future disjoint interval never invent unpaid coverage", async () => {
 await applyPaymentSnapshot({ ...input("subscription.charged", "expired"), currentStart: at(baseTime-5000), currentEnd: at(baseTime-100) });
 expect(hasPaidAccess(await sub())).toBe(false); expect(await count()).toBe(0);
 const result = await applyPaymentSnapshot({ ...input("subscription.charged", "gap"), currentStart: at(baseTime+1000), currentEnd: at(baseTime+5000) });
 expect(result.outcome).toBe("applied"); expect(hasPaidAccess(await sub())).toBe(false);
 expect(hasPaidAccess(await sub(), at(baseTime+999))).toBe(false); expect(hasPaidAccess(await sub(), at(baseTime+1000))).toBe(true);
});
