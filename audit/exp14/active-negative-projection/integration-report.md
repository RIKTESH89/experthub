# EXP-14 active negative-preference read integration

This extends candidate `3f83786` on the isolated branch `repair/exp14-negative-projection`, based on accepted `9f1d718548567fca3f1b66f89f77eb44ea1e818a`. The accepted checkout is untouched. It replaces the first-stage unused opt-in repair with a **default active local read path**, tested without live DB changes, providers, credentials or installs.

## Minimal integration and actual behavior

Stored temporal publication remains `literal-temporal-decision-v1`. Existing and newly published source rows use the unchanged v1 identity, nullable fields, immutable rows, same source locks and CAS. Both the existing source-publication caller and source rebuild continue to work without a coverage transition.

The active reader policy is `literal-temporal-authorized-replay-v2`. After `authorizedEvidenceSpans` freshly gates tenant, source version/content, audience, entitlement and permitted chunks, the existing SQL reader selects **only persisted v1** rows. For a negative preference without a case, the adapter replays the exact span using the already bounded literal grammar. It requires matching revision-relative offsets, attribution, speaker, every stance field/date, and the original v1 identity. Mismatch leaves the original null-field trace unchanged. Unsupported prose does not create new stances.

A matching replay gets a deterministic v2 view identity and exact literal situation/constraints/reasons/alternatives/tradeoffs/exceptions, with polarity still negative. Typed traces retain `storedStanceId`, `storedExtractorVersion` and `projectionBasis=authorized-span-replay`. Timeline output explicitly carries the **read policy**, not a false claim of persisted v2 coverage. Positive v1 rows remain v1; the policy describes this compatible read view. No rows are written and no versions are read twice.

Prompt serialization retains storage identities in typed traces and includes the replay basis/version. It omits exact duplicate situation/context and chosenAction/action transport values to leave room for the conflict relation. Complete typed fields and provenance remain available for citations/revalidation. Candidate/evidence/token/hop limits are unchanged at 100 / 12 / 4096 conservative UTF-8 units / one hop. Oversized evidence can still truncate with observable bounded gaps.

RecordedAt remains source ingestion time, and current/as-of/knownAt semantics are unchanged. This is a current deterministic interpretation of retained source bytes, not computation-time history or proof that an earlier system had already interpreted the negative fields.

## Exact callers and compatibility

| Caller / component | Effect |
| --- | --- |
| `src/lib/graph/evidence-store.ts:publishEvidence` | Still invokes default v1 `publishTemporal`; unchanged persisted rows for new indexing. |
| `src/lib/graph/evidence-store.ts:rebuildEvidenceSource` | Existing locked/current-source rebuild still publishes v1; no backfill is needed for read repair. |
| `src/lib/knowledge/lifecycle.ts:performIndexJob` and `src/app/api/expert/graph/evidence/[itemId]/route.ts` | Existing publication/rebuild entry points; unchanged. |
| `src/lib/retrieval/retrieve.ts:retrieveIntentEvidence` | Default call to `retrieveTemporalEvidence` now receives the active compatible replay. |
| `src/lib/ai/chat-engine-baseline.ts:runFrozenChatEngine` | Current default chat engine's intent retrieval uses the repaired reader. No model/generation policy changed. |
| `src/lib/ai/chat-engine.ts:runExperimentalChatEngine` | Its intent-retrieval branch also uses the repaired reader. |
| `src/lib/ai/dialogue/structured/local-retrieval.ts:retrieveLocalEvaluationEvidence` | Provider-free local evaluation uses the same real repaired reader. |
| `src/lib/ai/dialogue/revalidate.ts:revalidateDialogueEvidence` | Fresh access is rechecked; original read-policy pin is retained across generation/revalidation. Explicit conflicting pins fail. |
| `src/lib/persona/manifest.ts:scopeForRelease` | Retained v1 manifests explicitly select v1 and intersect exact current source pins with live scope. Unsupported algorithms/foreign tenant fail closed. |
| `src/lib/persona/store.ts:releasePersona` | New releases accurately stamp the active read policy; retained idempotent release results are unchanged. Rollback stamps the target's supported temporal policy rather than silently changing interpretation. |
| `src/lib/persona/store.ts:previewPersonaRollback` | Unsupported algorithm targets are blocked before rollback. Existing integrity, exact source pins, head and RAG-access checks remain. |
| `scripts/exp14/retrieval.integration.ts`, `scripts/launch-integration/retrieval.integration.ts` | Native acceptance specifications now assert active repaired read **and** explicit retained-v1 null-field behavior. Prior native limitation artifacts are not overwritten. These scripts were updated/type-checked, **not run**. |

No current app caller invokes `scopeForRelease`; its existing use is in integration tooling. This patch does not invent a new release-serving feature. Any future stored-release read must apply its manifest policy via that helper plus freshly resolved live scope/pins. Retained v1 semantics are tested through actual reader calls, not only the scope helper.

## Local validation completed

301/301 tests pass across 25 suites: EXP12/13/14/15/16; phase0 access, post access, shared access, default chat engine and lifecycle. TypeScript (`tsc --noEmit`), lint (`next lint`) and whitespace checks pass. Logs and compact suite summary are beside this report.

Active acceptance is separate from the earlier opt-in fixture tests:

- `__tests__/exp14/active-projection.test.ts` (9 tests): actual **default** publisher INSERT values -> actual authorization-gate SQL construction -> actual **default** intent reader or provider-free local evaluation reader -> timeline/bundle/citations. Only SQL execution and search/embedding channels are mocked. Real nonzero source offsets, retained v1 read, malformed identity/provenance refusal, quote attribution, missing fields, warm entitlement downgrade, private/owner/foreign tenant, current/as-of/knownAt, unknown topic, read-policy pinning and revocation during actual revalidation are covered.
- `active-read-fixture.json`: default path selects both preferences, restores exact negative maintenance reason, two-engineer constraint and audited-workload exception; inferred context-specific conflict is in typed trace **and prompt**. 2 candidates, 2 records, 1 hop, **3110/4096 units**, no truncation. Stored v1 tables are unchanged and still contain no negative decision case.
- `prior-native-row-replay.json`: offline replay of the retained prior native SQL rows with real-length identities; both preferences and relation serialize at **3320/4096 units**, no truncation. This is not a newly executed native SQL test.
- `__tests__/exp16/temporal-read-policy.test.ts` (4 tests): actual release/scope/rollback code with a transaction mock proves accurate new policy stamping, retained v1 policy, target-policy rollback, unknown-policy refusal and live-scope/pin intersection.

SQL mocks are not a PostgreSQL engine. No new native constraint/trigger/transaction-concurrency proof or native paid-access proof is claimed. Existing prior native evidence remains labeled prior. No human fidelity acceptance or provisional 14-string holdout acceptance is claimed. Older audits regenerated by existing tests were restored byte-for-byte; the first-stage row artifact is retained as historical evidence.

## Migration, deployment and rollback conditions

**For this reader adapter:** no DDL, data migration, v2 projection backfill, re-embedding, source rebuild or release activation is needed. Existing v1 source coverage is sufficient for the same supported grammar. Zero-output/unsupported sources remain gaps, missing or retired projections remain unavailable, and source edits continue to be governed by the existing live gate/CAS. This closes the specified projected-field loss locally without asserting completeness outside the fixed retrieval budget.

**If persisted v2 serving is later desired:** treat it as a separate approved data-projection rollout. It still requires dual publication while v1 is served, exact source-pinned/CAS/idempotent replay and immutable-content checks, zero-output/partial/failed-batch/concurrent-edit handling, fresh coverage validation, one-version serving, algorithm-compatible releases and rollback proof. The current candidate does not switch SQL to v2 or run such a migration.

**Code-policy rollback:** change `ACTIVE_TEMPORAL_READ_VERSION` in `read-policy.ts` to v1 while retaining both supported read implementations and release compatibility checks. New ordinary reads/releases then use v1; retained adapter-policy manifests still select their adapter interpretation. No DB rows or historical manifests need alteration. Do not blindly deploy pre-adapter code and claim exact replay of adapter-stamped releases: old code does not know that policy. Rollback to a stored v1 release remains subject to current head, integrity, exact source pins, supported algorithm and current RAG permission; it never restores historical source access.

No live database, deployment, activation, credential work, installs, pushes, tracker writes or provider calls were performed. Parent owns Linear updates and any later deployment/native acceptance decision.
