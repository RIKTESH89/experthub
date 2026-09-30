-- Additive only. Existing derived data is intentionally not trusted until reindexed.
ALTER TABLE "KnowledgeItem" ADD COLUMN "sourceVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "KnowledgeItem" ADD COLUMN "indexedVersion" INTEGER;
ALTER TABLE "KnowledgeItem" ADD COLUMN "indexingError" TEXT;
ALTER TABLE "SubscriberMemory" ADD COLUMN "memoryKey" TEXT;
CREATE UNIQUE INDEX "SubscriberMemory_memoryKey_key" ON "SubscriberMemory"("memoryKey");
-- Existing duplicate post sources must be reconciled before this index is applied.
-- Migration fails instead of deleting or arbitrarily selecting existing content.
CREATE UNIQUE INDEX "KnowledgeItem_expertProfileId_sourceType_sourceId_key"
  ON "KnowledgeItem"("expertProfileId", "sourceType", "sourceId");

ALTER TABLE "WidgetMessage" ADD COLUMN "sources" JSONB;
