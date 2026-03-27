-- Add new subscription statuses
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAST_DUE';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PENDING';

-- Add Razorpay fields to ExpertSubscription
ALTER TABLE "ExpertSubscription" ADD COLUMN IF NOT EXISTS "razorpaySubscriptionId" TEXT;
ALTER TABLE "ExpertSubscription" ADD COLUMN IF NOT EXISTS "razorpayPaymentId" TEXT;
ALTER TABLE "ExpertSubscription" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExpertSubscription_razorpaySubscriptionId_idx" ON "ExpertSubscription"("razorpaySubscriptionId");
