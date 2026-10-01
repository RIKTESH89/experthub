-- Existing paid rows deliberately remain unverified until provider reconciliation.
ALTER TABLE "ExpertSubscription" ADD COLUMN "paidPeriodStart" TIMESTAMP(3), ADD COLUMN "renewalCancelledAt" TIMESTAMP(3);
ALTER TABLE "PaymentEvent" ADD COLUMN "paymentId" TEXT, ADD COLUMN "periodStart" TIMESTAMP(3), ADD COLUMN "periodEnd" TIMESTAMP(3);
ALTER TABLE "ExpertSubscription" ADD CONSTRAINT "verified_paid_period_order" CHECK ("paidPeriodStart" IS NULL OR "currentPeriodEnd" IS NULL OR "paidPeriodStart" < "currentPeriodEnd");
