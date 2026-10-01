-- Additive, immutable snapshots. No foreign key to mutable/deletable source rows.
CREATE TABLE "EvidenceRevision" (
 "id" TEXT PRIMARY KEY, "expertProfileId" TEXT NOT NULL REFERENCES "ExpertProfile"("id") ON DELETE CASCADE,
 "itemId" TEXT NOT NULL, "sourceType" TEXT NOT NULL, "sourceId" TEXT, "sourceVersion" INTEGER NOT NULL,
 "contentHash" TEXT NOT NULL, "snapshotHash" TEXT NOT NULL, "content" TEXT NOT NULL,
 "publishedAt" TIMESTAMP(3), "publicationTimeBasis" TEXT NOT NULL, "sourceUpdatedAt" TIMESTAMP(3) NOT NULL, "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "authorId" TEXT, "uploaderId" TEXT NOT NULL, "audience" TEXT NOT NULL CHECK ("audience" IN ('public','premium','private')),
 "extractorVersion" TEXT NOT NULL, "retiredAt" TIMESTAMP(3),
 UNIQUE("expertProfileId","itemId","snapshotHash","extractorVersion")
);
CREATE INDEX "EvidenceRevision_source_idx" ON "EvidenceRevision"("expertProfileId","itemId");
CREATE TABLE "EvidenceSpan" (
 "id" TEXT PRIMARY KEY, "revisionId" TEXT NOT NULL REFERENCES "EvidenceRevision"("id") ON DELETE CASCADE,
 "start" INTEGER NOT NULL CHECK ("start" >= 0), "end" INTEGER NOT NULL CHECK ("end" > "start"), "text" TEXT NOT NULL,
 "chunkIds" TEXT[] NOT NULL, "speakerId" TEXT, "speakerRole" TEXT NOT NULL CHECK ("speakerRole" IN ('author','quoted','unknown')),
 UNIQUE("revisionId","start","end")
);
CREATE TABLE "EvidenceAssertion" (
 "id" TEXT PRIMARY KEY, "expertProfileId" TEXT NOT NULL REFERENCES "ExpertProfile"("id") ON DELETE CASCADE,
 "subject" TEXT NOT NULL, "predicate" TEXT NOT NULL, "object" TEXT NOT NULL,
 "kind" TEXT NOT NULL CHECK ("kind" IN ('explicit','inferred','unknown')),
 "endorsedByOwner" BOOLEAN NOT NULL DEFAULT FALSE, "extractorVersion" TEXT NOT NULL
);
CREATE TABLE "EvidenceSupport" (
 "assertionId" TEXT NOT NULL REFERENCES "EvidenceAssertion"("id") ON DELETE CASCADE,
 "spanId" TEXT NOT NULL REFERENCES "EvidenceSpan"("id") ON DELETE CASCADE,
 PRIMARY KEY("assertionId","spanId")
);
-- Edge identity = attributable assertion identity. Weight is DISTINCT active revisions,
-- never a rebuild counter. This administrative view is NOT an audience-authorized API.
CREATE VIEW "EvidenceEdge" AS
 SELECT a.*, count(DISTINCT r."id")::integer AS "weight"
 FROM "EvidenceAssertion" a JOIN "EvidenceSupport" s ON s."assertionId"=a."id"
 JOIN "EvidenceSpan" p ON p."id"=s."spanId" JOIN "EvidenceRevision" r ON r."id"=p."revisionId"
 JOIN "KnowledgeItem" i ON i."id"=r."itemId" AND i."expertProfileId"=r."expertProfileId"
 WHERE r."retiredAt" IS NULL AND i."sourceVersion"=r."sourceVersion"
 GROUP BY a."id";

CREATE FUNCTION evidence_immutable_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (to_jsonb(NEW) - 'retiredAt') IS DISTINCT FROM (to_jsonb(OLD) - 'retiredAt')
    OR (OLD."retiredAt" IS NOT NULL AND NEW."retiredAt" IS DISTINCT FROM OLD."retiredAt") THEN
   RAISE EXCEPTION 'Evidence revision snapshots are immutable; only first retirement is allowed';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "EvidenceRevision_immutable" BEFORE UPDATE ON "EvidenceRevision" FOR EACH ROW EXECUTE FUNCTION evidence_immutable_revision();
CREATE FUNCTION evidence_immutable_projection() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Evidence projections are append-only'; END $$;
CREATE TRIGGER "EvidenceSpan_immutable" BEFORE UPDATE ON "EvidenceSpan" FOR EACH ROW EXECUTE FUNCTION evidence_immutable_projection();
CREATE TRIGGER "EvidenceAssertion_immutable" BEFORE UPDATE ON "EvidenceAssertion" FOR EACH ROW EXECUTE FUNCTION evidence_immutable_projection();
CREATE TRIGGER "EvidenceSupport_immutable" BEFORE UPDATE ON "EvidenceSupport" FOR EACH ROW EXECUTE FUNCTION evidence_immutable_projection();
