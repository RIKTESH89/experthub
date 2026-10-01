CREATE TABLE "TemporalStance" (
 "id" TEXT PRIMARY KEY, "revisionId" TEXT NOT NULL REFERENCES "EvidenceRevision"("id") ON DELETE CASCADE,
 "spanId" TEXT NOT NULL REFERENCES "EvidenceSpan"("id") ON DELETE CASCADE,
 "expertProfileId" TEXT NOT NULL REFERENCES "ExpertProfile"("id") ON DELETE CASCADE,
 "speaker" TEXT NOT NULL, "origin" TEXT NOT NULL CHECK ("origin" IN ('expert-authored','third-party-description','quote','unattributed-upload','visitor-claim')),
 "domain" TEXT, "context" TEXT, "category" TEXT NOT NULL CHECK ("category" IN ('preference','principle','boundary','decision')),
 "polarity" TEXT NOT NULL CHECK ("polarity" IN ('positive','negative')), "action" TEXT NOT NULL,
 "validFrom" TIMESTAMP(3), "validUntil" TIMESTAMP(3), "certainty" TEXT NOT NULL CHECK ("certainty" IN ('source-explicit','source-reported','unknown')),
 "kind" TEXT NOT NULL CHECK ("kind" IN ('explicit','inferred','unknown')), "endorsedByOwner" BOOLEAN NOT NULL,
 "supersedes" TEXT, "extractorVersion" TEXT NOT NULL,
 CHECK ("validUntil" IS NULL OR ("validFrom" IS NOT NULL AND "validUntil">"validFrom")),
 UNIQUE ("revisionId","spanId","extractorVersion")
);
CREATE INDEX "TemporalStance_expert_idx" ON "TemporalStance"("expertProfileId");
CREATE TABLE "EvidenceDecisionCase" (
 "id" TEXT PRIMARY KEY, "stanceId" TEXT NOT NULL UNIQUE REFERENCES "TemporalStance"("id") ON DELETE CASCADE,
 "spanId" TEXT NOT NULL REFERENCES "EvidenceSpan"("id") ON DELETE CASCADE,
 "situation" TEXT, "constraints" TEXT, "chosenAction" TEXT NOT NULL, "documentedReasons" TEXT,
 "alternatives" TEXT, "tradeoffs" TEXT, "exceptions" TEXT,
 "decisionType" TEXT NOT NULL CHECK ("decisionType" IN ('recommendation','documented-choice')),
 "extractorVersion" TEXT NOT NULL
);
-- Recorded time comes from immutable supporting EvidenceRevision.ingestedAt;
-- source-declared valid time is stored separately, never inferred from ingestion.
CREATE TRIGGER "TemporalStance_immutable" BEFORE UPDATE ON "TemporalStance" FOR EACH ROW EXECUTE FUNCTION evidence_immutable_projection();
CREATE TRIGGER "EvidenceDecisionCase_immutable" BEFORE UPDATE ON "EvidenceDecisionCase" FOR EACH ROW EXECUTE FUNCTION evidence_immutable_projection();
