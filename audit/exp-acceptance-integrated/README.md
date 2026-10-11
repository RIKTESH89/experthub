# Integrated ExpertHub acceptance candidate — 2026-10-11

Baseline: `0a2cd602646d7ae5689b195a4fbe6da05a5daa28`, verified against the existing staging branch and READY deployment before work. Six isolated branches/worktrees owned EXP-7, EXP-14, EXP-15, EXP-16, EXP-17 and EXP-25. Existing retrieval repair and rating UI were retained; this candidate covers remaining bounded implementation/acceptance work. All six exact Linear descriptions were read before scoping. All six issues remain In Progress.

## Implemented and independently reviewed

| Scope | Result | Reviewer |
| --- | --- | --- |
| EXP-7 | Audited source/time/family splits, implementation/prompt/budget freeze, repeat comparison, strict provider accounting and blank partially blinded human packet | EXP-16; integration review of final 35 protocol cases |
| EXP-14 | Late source anchors, contradiction visibility, author validation; versioned v3 selection preserves frozen v1/v2 replay | EXP-17 |
| EXP-15 | Task-scoped continuity, owner-authored style evidence, cancellation propagation | EXP-25 |
| EXP-16 | Server-owned receipt, strict account/source/release/session/subscription checks; buffered delivery after SQL commit; atomic widget messages/usage/config guards | EXP-7 native review and EXP-15 independent delivery review |
| EXP-17 | Conservative literal entailment, claim category/attribution/time checks, exact cited support and quote boundary repairs | EXP-14 |
| EXP-25 | Actionable sanitized release failures, safe ambiguous retry, owner-revocation cleanup and stale-preview invalidation | EXP-15 |

Review findings were repaired before integration: stale preview approval, cross-task goal carryover, expiry during trailing SQL reads, quoted contractions/possessives and incomplete provider accounting/static source closure. Nine independent delivery tests verify deferred/rejected COMMIT, cancellation, provider errors and source-title scrubbing with mocked boundaries. The SQL authorization linearization point is COMMIT; post-COMMIT cancellation or revocation cannot recall previously committed/delivered bytes.

## Combined evidence

At runtime source candidate `9b1fb79`: **1,825 tests / 151 suites pass**, TypeScript and Next lint pass. Baseline was 1,664 tests / 141 suites. These are repository synthetic/mocked checks, not hosted quality acceptance.

The optimized production-mode Preview build passed with external network blocked, an unreachable synthetic database and exact source local Geist assets. V2 writer flag is absent/default OFF. Seventeen isolated native Chrome checks passed against that build (desktop/mobile/reduced motion, Google-only provider/recovery routes, private anonymous guards and fixture refusal). They use synthetic credentials and no real OAuth or live DB. EXP-25 separately supplies 12 installed Auth.js synthetic scenario groups and seven React/native Chrome release-UX cases using intercepted HTTP.

Fresh integration native retrieval: **17/17 PostgreSQL 18 cases pass after all 18 checked-in migrations**, private Unix socket, actual SQL, fixed mocked embeddings. Fresh integration native persistence: **76/76 PostgreSQL 18 cases pass** against relevant real-FK/release/evidence fixtures (partial DMMF schema). These cover correction/adoption/replay/rollback/revocation/source drift/writer ordering/account loss/widget atomicity. Owned runtimes were stopped and removed; no TCP listeners or live credentials. The full-schema persistence subset also passes **56/56 selected cases**, with 20 legacy partial-fixture tests explicitly skipped, after all 18 migrations; original partial mode still passes all 76 separately. Author, independent reviewer and integration runs agree. Catalog metadata preserves 50 app tables, 50 foreign keys and 480 total constraints; migration ledger/checksums and catalog guard passed. PostgreSQL 16 parity remains unrun.

Two integrated frozen-protocol runs (`final-run-1`, `final-run-2`) each contain **116 traces**, 29 repeated pairs per run, zero contract failures, and matching timing-excluded SHA-256 `6c5ce87eb4a4c8fcfa00b4f89e6fb8838f364d336cc968f4a548aa4a7c954d39`. They use the same fixed native-kernel adapter under two labels. They do not compare model architectures or establish fidelity improvement. Local elapsed timing is reported separately. Provider token/dollar/network latency and human faithfulness/style/naturalness/usefulness scores are **NOT RUN**. Review forms remain blank; no human reviewers were contacted.

## Remaining acceptance and authorization

- Independent unseen human quality/entailment and false-positive/negative assessment, including paraphrases and unnecessary refusal.
- Same-input/model/budget real-provider repeats and qualified token/cost/end-to-end latency: require an explicitly bounded provider/data/budget authorization. Historical stopped calls do not authorize another call.
- Real Google-authenticated exact-candidate hosted journeys, ingestion/vector/provider paths, entitlement loss and rollback: require available authorized test identities and specific authorization for any live-data mutation.
- PostgreSQL 16 migration/runtime parity; only PostgreSQL 18 is installed locally.
- V2 deployment/downgrade inventory and separately authorized activation; experimental dialogue/verifier path and V2 writer stay OFF.

The staging-only publication is authorized after review/checks. It changes no production branch/domain, credential, environment or access-protection policy, and runs no live migration. Another task owns Razorpay/Resend; its browser and billing files were not used. No keep-awake process was needed. Publication receipt and post-deployment read-only smoke evidence will identify the exact commit and preserved configuration.

## Hosted portability finding and repair

The first pinned Preview `dpl_8g24yn5x4VrJGnpHRTT8ZaAbmmFg` at `f85897c` stopped in type checking because two independent audit tests imported a worker's absolute local path. Local TypeScript/Next checks could resolve the still-present worker directory; Vercel could not. The staging custom alias stayed on the prior READY deployment throughout. Imports now resolve relatively within this checkout, a portable independent-review Jest configuration is included, and the EXP14 review CLI defaults to this repository (optional explicit target) and records its actual reviewed commit. Eight review tests pass. No application runtime files changed. The first hosted failure is retained in `failed-preview.json`. Rebuilt/types/lint/independent review and a new pinned Preview are required before alias assignment.

Independent EXP14 reviewer cleared the exact portability diff: 8/8 review cases, 5/5 selector assertions, TypeScript and whitespace checks pass; 57 new/changed TypeScript files contain no machine-absolute imports. Root rebuilt Preview/types/lint and 17 isolated native Chrome checks pass. All application `src` files are unchanged from the reviewed candidate, so the 1,825 combined tests, native SQL results and frozen evaluation graph remain applicable. The first local portability typecheck overlapped Next clearing `.next/types`; it was rerun after the build completed and passed.
