# EXP15/17 review repair after 7385d47

Checkout: /Users/rikteshs20/Documents/Codex/2026-10-03/task-8/experthub-exp15-exp17-continuation.
Branch: codex/exp15-exp17-structured-local. Original continuation commit 7385d47ecd3e68adfe5ee6c07eb4fb452fa12bd6 is preserved; this repair is separate.

## Reproduced failures and repairs

The three independent regressions from /tmp/experthub-dialogue-independent-7385d47/__tests__/exp15/independent-review.test.ts were copied into the lane and run before repair: **all three failed**. After repair all pass.

1. A verifier-retained draft reference could mutate approved text while the final evidence read was pending. All adapter data inputs now receive detached, recursively frozen snapshots. Provider methods, current query and represented identity are captured before awaits. Parsed drafts/judgments/private evidence are detached/frozen separately from adapter inputs and raw adapter outputs. Retained input digests are checked after every asynchronous boundary and again before release; approved draft/judgment/state/evidence pins are rechecked at that point. Returned result snapshots are immutable. AbortSignal is deliberately a separate cancellation capability rather than approval data.

   Dates require special handling: normal setters on adapter snapshot Dates throw, and retained digest checks catch prototype-setter bypasses after async boundaries. Cross-realm Dates from structuredClone are detected by their Date brand, avoiding a false immutability guarantee from instanceof/Object.freeze alone. Returned diagnostic Dates use protected readable/JSON-serializable proxies; setters and direct Date.prototype setters reject mutation. structuredClone of these protected result Dates is intentionally unsupported; JSON can copy diagnostics. No adapter receives result snapshots. This protects local approval state, not arbitrary untrusted JavaScript execution in-process.

2. Live pins compared too few fields and allowed an undated stance to acquire invented current validity. Assertions and stances now have separate full immutable record pins with stable field ordering. Validity, polarity, context/domain, decisions, attribution, source/publication/recorded times and extractor identity are included. Only top-level derived visible support weight and temporalUncertainty are excluded. An original assertion cannot be promoted into a newly introduced stance. New invalidations remain available to restrict release. The final decision is recomputed after the last evidence read so a current validity interval expiring during that read cannot be carried forward as an earlier approval.

3. An accepted current query up to 8000 characters lost trailing constraints at a 2000-character slice. Accepted current queries now remain complete in generation and independent verification state. Retained history is preserved without per-message truncation. More than 12 messages, any history message over 8000 characters, history over 48000 UTF-8 bytes or adapter context over 200000 bytes is explicitly blocked with a budget reason before processing rather than silently sliced. The bounded dialogue-state user-turn window remains a continuity view; complete accepted history is also passed separately to adapters. Caller mutation after entry cannot rewrite the captured query/history.

## Adjacent contract checks

The new review regression suite has 22 tests: original three failures; immutable validity/context/polarity/domain/reason/constraint/exception/certainty/author/speaker/extractor pin changes; unchanged positive control; immutable result fields and Date prototype bypass; retained verifier Date mutation; raw generator/review output detachment; caller query/history mutation; full long history or explicit oversized-history refusal; and expiry during the final read.

Scope stayed limited to closing snapshot, immutable semantic-pin and constraint-preservation defects. No new response categories, provider integration, schema or production feature changes. src/lib/ai/chat-engine.ts and frozen baseline were not changed by this repair. The existing local/mock-only gate remains in force and real-model adapters remain rejected.

## Checks actually run

- Before repair: independent three-regression suite, 3/3 failed as reported.
- After repair: combined focused Jest **249/249 tests, 19 suites**. Included EXP15, phase0 chat-engine/retrieval/shared/post-access, EXP14, API chat/thinking-chat and EXP26 chat-access.
- TypeScript --noEmit --incremental false: passed.
- Focused lint for state, pipeline, live pins, snapshots and new review suite: no warnings/errors.
- Standalone synthetic runner: 25 turns, zero contract failures, zero real provider calls. Evaluation artifact remains byte-identical; model/human scores remain null.
- git diff --check: passed. EXP14 timing artifacts restored exactly.

These are deterministic/injected-judgment contract checks, not semantic truth, model entailment, clinical/investment safety or style-fidelity evidence. Atomic permission-to-delivery consistency and native concurrency proof remain unavailable; a permission change after the last read can still race delivery. No provider/model call, credential access, full build, schema/migration, hosted or production-data change, spending, push or deployment occurred.
