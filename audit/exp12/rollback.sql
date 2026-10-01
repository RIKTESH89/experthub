-- Destructive evidence-only rollback; retain an owner-approved export FIRST.
-- Do not execute against production or shared DBs as part of local validation.
-- Revert app to pre-EXP12 before this schema rollback; otherwise indexing will fail closed.
DROP VIEW IF EXISTS "EvidenceEdge";
DROP TABLE IF EXISTS "EvidenceSupport", "EvidenceSpan", "EvidenceAssertion", "EvidenceRevision";
DROP FUNCTION IF EXISTS evidence_immutable_projection();
DROP FUNCTION IF EXISTS evidence_immutable_revision();
-- Prisma migration bookkeeping is NOT altered here. A future rollback deployment
-- must reconcile it explicitly; re-running migrate deploy does not restore dropped tables.
