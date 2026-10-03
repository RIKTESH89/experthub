-- Reference only; not a hosted migration instruction. Restore application/export audit
-- history first, and explicitly reconcile migration bookkeeping in a reviewed rollout.
BEGIN;
DROP TABLE "PersonaReleaseHead", "PersonaRelease", "CorrectionEvent", "CorrectionReview";
DROP FUNCTION exp16_append_only();
COMMIT;
