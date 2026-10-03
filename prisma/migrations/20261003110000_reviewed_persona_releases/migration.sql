-- Additive only. Never applies this migration to a hosted database automatically.
CREATE TABLE "CorrectionReview" (
 "id" TEXT PRIMARY KEY, "expertProfileId" TEXT NOT NULL REFERENCES "ExpertProfile"("id") ON DELETE CASCADE,
 "submittedBy" TEXT NOT NULL, "submissionKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "messageId" TEXT,
 "proposal" JSONB NOT NULL, "state" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("state" IN ('PENDING','ACCEPTED','REJECTED')),
 "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version">0), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE ("expertProfileId","submittedBy","submissionKey"), UNIQUE ("expertProfileId","id")
);
CREATE INDEX "CorrectionReview_expertProfileId_state_createdAt_idx" ON "CorrectionReview"("expertProfileId","state","createdAt");
CREATE TABLE "CorrectionEvent" (
 "id" TEXT PRIMARY KEY, "reviewId" TEXT NOT NULL, "expertProfileId" TEXT NOT NULL, "actorId" TEXT NOT NULL,
 "operationKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "action" TEXT NOT NULL CHECK ("action" IN ('SUBMIT','REVISE','ACCEPT','REJECT')),
 "version" INTEGER NOT NULL, "detail" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE ("expertProfileId","operationKey"), FOREIGN KEY ("expertProfileId","reviewId") REFERENCES "CorrectionReview"("expertProfileId","id") ON DELETE CASCADE
);
CREATE TABLE "PersonaRelease" (
 "id" TEXT PRIMARY KEY, "expertProfileId" TEXT NOT NULL REFERENCES "ExpertProfile"("id") ON DELETE CASCADE,
 "actorId" TEXT NOT NULL, "operationKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "manifestHash" TEXT NOT NULL,
 "manifest" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE ("expertProfileId","operationKey"), UNIQUE ("expertProfileId","id")
);
CREATE TABLE "PersonaReleaseHead" (
 "expertProfileId" TEXT PRIMARY KEY REFERENCES "ExpertProfile"("id") ON DELETE CASCADE,
 "releaseId" TEXT NOT NULL, "generation" INTEGER NOT NULL DEFAULT 1 CHECK ("generation">0),
 FOREIGN KEY ("expertProfileId","releaseId") REFERENCES "PersonaRelease"("expertProfileId","id")
);
CREATE FUNCTION exp16_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'EXP16 audit records are append-only'; END $$;
CREATE TRIGGER "CorrectionEvent_append_only" BEFORE UPDATE ON "CorrectionEvent" FOR EACH ROW EXECUTE FUNCTION exp16_append_only();
CREATE TRIGGER "PersonaRelease_append_only" BEFORE UPDATE ON "PersonaRelease" FOR EACH ROW EXECUTE FUNCTION exp16_append_only();
