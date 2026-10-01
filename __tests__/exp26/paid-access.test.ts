import { hasPaidAccess, hasSubscriptionAccess } from "@/lib/payments/access";
const start = new Date("2026-10-01T00:00:00Z"), end = new Date("2026-11-01T00:00:00Z");
const paid = { tier: "PREMIUM", status: "ACTIVE", razorpayPaymentId: "confirmed", paidPeriodStart: start, currentPeriodEnd: end };
test("B1 requires a confirmed charge, not merely ACTIVE/authenticated", () => {
  expect(hasPaidAccess({ ...paid, razorpayPaymentId: null }, start)).toBe(false);
  expect(hasPaidAccess({ ...paid, status: "PENDING" }, start)).toBe(false);
});
test.each(["ACTIVE", "CANCELLED", "PAST_DUE", "EXPIRED"])("B2/B3 %s keeps only the verified period, start-inclusive/end-exclusive", status => {
  expect(hasPaidAccess({ ...paid, status }, new Date(start.getTime()-1))).toBe(false);
  expect(hasPaidAccess({ ...paid, status }, start)).toBe(true);
  expect(hasPaidAccess({ ...paid, status }, new Date(end.getTime()-1))).toBe(true);
  expect(hasPaidAccess({ ...paid, status }, end)).toBe(false);
  expect(hasPaidAccess({ ...paid, status }, new Date(end.getTime()+1))).toBe(false);
});
test("B4 missing either provider date and legacy expiry alone fail closed", () => {
  expect(hasPaidAccess({ ...paid, paidPeriodStart: null }, start)).toBe(false);
  expect(hasPaidAccess({ ...paid, currentPeriodEnd: null }, start)).toBe(false);
  expect(hasPaidAccess({ ...paid, paidPeriodStart: new Date("invalid") }, start)).toBe(false);
});
test("free follows remain free and do not grant premium entitlement", () => {
  expect(hasSubscriptionAccess({ status: "ACTIVE", tier: "FREE" }, start)).toBe(true);
  expect(hasSubscriptionAccess({ status: "CANCELLED", tier: "FREE" }, start)).toBe(false);
});
