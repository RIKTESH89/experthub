CREATE TABLE "KnowledgeLifecycleJob" (
 "id" TEXT PRIMARY KEY, "kind" TEXT NOT NULL, "expertProfileId" TEXT NOT NULL,
 "itemId" TEXT NOT NULL, "sourceVersion" INTEGER, "namespace" TEXT NOT NULL,
 "vectorIds" TEXT[] NOT NULL, "state" TEXT NOT NULL DEFAULT 'PENDING',
 "attempts" INTEGER NOT NULL DEFAULT 0, "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "leaseUntil" TIMESTAMP(3), "leaseToken" TEXT, "lastError" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "KnowledgeLifecycleJob_expertProfileId_state_availableAt_idx" ON "KnowledgeLifecycleJob"("expertProfileId", "state", "availableAt");
