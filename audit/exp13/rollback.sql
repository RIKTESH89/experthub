-- Evidence-only EXP13 rollback. Export required temporal evidence before any real rollback.
-- Revert application to EXP12 first; this proof never commits destructive schema removal.
DROP TABLE IF EXISTS "EvidenceDecisionCase", "TemporalStance";
-- Shared EvidenceRevision/Span/Assertion/Support tables, their triggers and vectors remain.
-- Prisma bookkeeping is not changed; migration state must be reconciled explicitly on deployment.
