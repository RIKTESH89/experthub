ALTER TABLE "ExpertSubscription" ADD COLUMN "billingVersion" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "BillingOutbox" (
 "id" TEXT PRIMARY KEY, "payload" JSONB NOT NULL, "state" TEXT NOT NULL DEFAULT 'READY',
 "attempts" INTEGER NOT NULL DEFAULT 0, "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "leaseToken" TEXT, "leaseUntil" TIMESTAMP(3), "lastError" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK ("state" IN ('READY','LEASED','DELIVERED','FAILED')), CHECK ("attempts">=0)
);
CREATE INDEX "BillingOutbox_state_nextAttemptAt_idx" ON "BillingOutbox"("state", "nextAttemptAt");
CREATE TABLE "BillingProvisioning" (
 "id" TEXT PRIMARY KEY, "subscriberId" TEXT NOT NULL, "expertProfileId" TEXT NOT NULL,
 "subscriptionId" TEXT, "expectedVersion" INTEGER NOT NULL, "tier" TEXT NOT NULL, "price" DOUBLE PRECISION NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'READY', "version" INTEGER NOT NULL DEFAULT 0,
 "planId" TEXT, "providerId" TEXT UNIQUE, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK ("state" IN ('READY','IN_FLIGHT','UNKNOWN','ATTACHED'))
);
CREATE UNIQUE INDEX "BillingProvisioning_open_pair" ON "BillingProvisioning"("subscriberId", "expertProfileId") WHERE "state" <> 'ATTACHED';
CREATE TABLE "BillingReconciliation" (
 "id" TEXT PRIMARY KEY, "subscriptionId" TEXT NOT NULL, "reviewedDigest" TEXT NOT NULL UNIQUE,
 "previousVersion" INTEGER NOT NULL, "evidence" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
