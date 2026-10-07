# EXP-14 negative-preference projection candidate

Historical first-stage report for commit `3f83786`. Its unused-candidate limitation is superseded by the active local read integration in [../active-negative-projection/integration-report.md](../active-negative-projection/integration-report.md). Prior evidence below is retained as the first-stage record.

Base: `9f1d718548567fca3f1b66f89f77eb44ea1e818a`, the accepted homepage checkout. Isolated local clone and branch: `repair/exp14-negative-projection`. The original accepted checkout was clean and was not modified.

`c60a2ca8e8ecf3c42b3f4a940a71b38132208137` exists in local Git objects but is **not an ancestor** of this accepted base. Its repair plan was read through `git show`. The extractor, publisher, reader and timeline at that commit and the accepted base are identical (`git diff` for these four files is empty), so its causal reproduction applies here. No plan commit was cherry-picked.

## Cause and change

The existing literal parser recognizes `I do not prefer`, preserving negative polarity, reasons and labeled constraints/exceptions in its extraction. It sets `decisionType=null`, so `publishTemporal` emits no EvidenceDecisionCase. The reader's existing LEFT JOIN consequently returns null decision fields, and constraints-based timeline grouping cannot associate an explicit-constraint positive row with the null-constraint negative row.

The opt-in `literal-temporal-decision-v2` assigns `recommendation` only to the already supported literal negative-preference grammar. The linked stance still has category `preference` and polarity `negative`; the case's `chosenAction` is its literal object, not a positive endorsement or a new choice. Explicit version parameters flow through extraction, identity, persisted stance and case labels. Span/revision identities do not change. Unsupported runtime versions fail before publication. Default calls still produce v1. Reader filtering and persona manifest stamping still use v1.

No new grammar, nullable-field inference, retrieval-policy changes, schema edits, backfill command or deployment were added. `I will not` boundary cases remain unchanged, including their existing lack of a decision case. This candidate addresses only the specified negative-preference projection gap.

For a local or separately approved staged transaction, the new call is `publishTemporal(tx, revisionId, item, ownerId, content, authorId, TEMPORAL_PROJECTION_CANDIDATE_VERSION)`. Do not change only the global active constant: that would hide unreplayed v1 evidence. No application call site is switched by this patch.

## Evidence and validation

- `__tests__/exp14/fixtures/negative-projection.json`: raw literal sources; positive/negative same-context pair, absent fields, boundary, unsupported prose.
- `negative-projection-v1-golden.json`: v1 parser outputs and exact identities generated from immutable accepted-base Git source, with source SHA-256.
- `__tests__/exp14/negative-projection.test.ts`: 13 local tests capture actual publisher parameterized INSERT column/value pairs, join emitted matching stance/span/case rows in an adapter, then exercise the real timeline and bundle.
- `row-fixture.json`: raw-source to emitted v1/v2 rows and bundles. Both v2 polarities, negative maintenance reason, two-engineer constraint and audited-workload exception fit at **3173 conservative UTF-8 token units**, 2 candidates, 2 selected evidence records, 1 graph hop, no truncation. The fixed limits remain 100 candidates / 12 evidence records / 4096 token units / 1 hop.
- v1 negative gap remains reproduced; v1 outputs/identities match accepted-base fixtures byte for byte. Repeated v2 publication produces identical captured rows, shared span IDs and distinct versioned stance/case IDs, with v1 unchanged.
- Missing fields stay null; unsupported grammar abstains. Different constraints/context and quoted visitor attribution do not manufacture expert contradiction. Current/as-of/known-at filtering and unknown-topic gaps pass. Unauthorized negative chunks are excluded before bundle candidates, prompt, relations and citations.
- 98/98 tests across 11 suites pass: EXP12, EXP13, EXP14, EXP16, phase0 access/post-access/shared-access. `jest.json` and `jest.log` record this run. Existing tests that regenerate older EXP14 audit files were allowed to execute, then those older tracked files were restored byte-for-byte from the base; their claims were not revised.
- `tsc --noEmit` passes (empty `types.log`); `next lint` passes (`lint.log`); `git diff --check` passes. Existing dependency runtime reused via ignored node_modules symlink; no install or generation.

## Remaining limits and parent handoff

This is a **candidate projection repair, not an activated end-to-end production repair**. The active v1 reader still exhibits the original null-field limitation. The row capture is not a PostgreSQL engine: SQL constraints, native join execution, concurrent source CAS, failed batches and coverage/cutover have not been newly proven. Existing local access regressions pass, but this does not establish new native premium/private/tenant authorization proof. Reader, live gate, intent routing, entitlement policy and persona release code are unchanged.

Before production activation, coordinate EXP13/EXP14/EXP16 ownership for dual publication, bounded source-pinned/CAS replay with exact immutable-row checks, zero-output and partial-coverage handling, coverage validation, one-version serving, persona algorithm compatibility and rollback. These broader operational/design tasks were not expanded into this bounded local repair. No broad quality estimate, new human acceptance, or acceptance of the provisional 14-string holdout is claimed.

No model/provider calls, credentials, role activation, live DB migrations, installs, pushes, deployment or tracker writes. Credential diagnosis remains paused. Parent owns Linear updates.
