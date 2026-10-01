ALTER TABLE "ExpertSubscription" ADD COLUMN "lastPaymentEventAt" TIMESTAMP(3), ADD COLUMN "lastPaymentEventRank" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "PaymentEvent" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "providerSubscriptionId" TEXT NOT NULL,
 "payloadHash" TEXT NOT NULL,
 "eventType" TEXT NOT NULL,
 "occurredAt" TIMESTAMP(3) NOT NULL,
 "outcome" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PaymentEvent_providerSubscriptionId_idx" ON "PaymentEvent"("providerSubscriptionId");
