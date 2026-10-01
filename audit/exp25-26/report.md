# EXP25/26 local implementation and acceptance

Branch: exp25-26-launch-auth-payments. Base: fe3faa48236aee6544042f4409ae3617cb27e876. Local candidate verified; real Google OAuth and Razorpay sandbox acceptance remain BLOCKED by unavailable authorized setup. No push, deployment, production migration, account/provider configuration, real charge/refund, participant outreach, new dependency installation, or secret-file reads occurred.

## Implementation

EXP25 shares a whitelisted citation transport across streaming, persisted session reload and UI. Exact revision/span/attribution and temporal context survive fragmented UTF-8/SSE. Reload rechecks source eligibility and removes revoked/edited/unpublished/restricted citation metadata. Session previews no longer include raw source blobs. Stream completion follows assistant persistence and includes its actual message ID, making immediate feedback rating possible. Existing historical answer text is retained; this is not a retention purge.

EXP26 moves middleware into src so Next actually compiles it, uses segment-safe public exceptions and an Edge-safe auth configuration. Server auth resolves current database roles/account eligibility on each request. Server layouts enforce roles. Missing/deleted/banned/inactive accounts fail closed. Google sign-in requires verified email. Password registration is retired (410), avoiding an unsupported password login/account reservation path. Listings/search now enforce server auth independently.

Payment state is shared and transactional with row locking, durable hashed event receipts, deterministic in-app notification identity, counter updates and provider-ID cancellation CAS. Receipt replay is idempotent; changed payload identity is rejected. B1: authenticated/activated alone never grants paid access; confirmed captured charge plus valid provider interval is required. B2: renewal cancellation preserves access until verified paid expiry; feed/post/chat/retrieval use the same entitlement. B3: end is exclusive, with no unpaid grace. B4: missing/inverted dates and disjoint future periods are recorded for reconciliation, without fabricated monthly coverage. Delayed charges never restart canceled renewal. Unexpected confirmed post-cancellation charges are marked for reconciliation; refunds remain undecided and unimplemented. Cancellation errors are truthful and preserve local state.

## Acceptance status

| Criterion | Status | Evidence |
|---|---|---|
| Types, lint, unit baseline plus new cases | PASS | types-latest.log empty; lint-latest.log clean; full-jest-latest.json 772/772 across 48 suites |
| Fragmented stream, exact DB evidence, reload, persisted-ID rating | PASS | payment-integration.json: 2 citation integration tests; citation-wire.json |
| Signed events, replay/concurrency/ordering, rollback, B1–B4, cancellation failures/replacement | PASS | payment-integration.json: 16 payment integration tests |
| EXP13/EXP12/Phase0 regressions | PASS | exp13-regression.json 12/12; exp12-regression.json 14/14; phase0-regression.json 26/26 |
| Optimized Next build and compiled middleware | PASS | build.log; middleware manifest asserted by browser runner |
| Actual built UI/API with fresh existing Chrome and synthetic JWT/DB | PASS | built-browser.json: 9 scenarios, including role/account changes, anonymous boundaries, citation revocation and persisted feedback, canceled paid feed and expiry |
| Real Google OAuth handshake/callback/cookie/domain behavior | BLOCKED | No authorized real OAuth setup; synthetic encrypted sessions exercise actual NextAuth callbacks but do not substitute for provider acceptance |
| Real Razorpay sandbox checkout/cancellation/webhook payload lifecycle | BLOCKED | No authorized sandbox credentials/setup or provider traffic; local captured payloads and mocked cancellation boundary only |
| Real model faithfulness, volunteer feedback, load/cost, production rollout | NOT RUN | Outside this local implementation scope |

No new EXP13 semantic-review gate is asserted here; parent confirms its human review was approved. Historical EXP13 report remains unchanged.

## Baseline triage and resolved validation failures

Original EXP13 recorded 739/751 and 41 TypeScript errors. Twelve stale contract failures comprised six pricing expectations (three tiers versus current FREE/PREMIUM), four paid/default-tier direct subscribe expectations (current free endpoint/payment-required response), one raw-source SSE contract expectation, and a trending handler invocation without its required request. Original 41 type errors comprised 19 route-param shape errors, 19 wrong handler argument counts, one NextRequest RequestInit mismatch, and two recursive Prisma mock typing errors. Tests now reflect real contracts without relaxing permission/paid proof checks.

Intermediate runs are retained as historical failure evidence. Four later stream failures were caused by reset analytics mocks returning undefined rather than a Promise, throwing during flush; the async mock contract was corrected, not the done-event assertions. A citation fixture was expanded to include both literal assertion and temporal statement. Built browser testing exposed ignored root middleware and then a persistent synthetic application fixture collision; src middleware and isolated fixture cleanup address these independently. built-browser-failure.json is historical, not the final result. final-evidence.json hashes authoritative final artifacts.

## Rollout and remaining limits

Two additive migrations add event receipts/order watermarks and verified paid-period fields. Applied only to the existing disposable experthub_phase0_test PostgreSQL/pgvector cluster. Existing paid subscriptions have no newly verified paidPeriodStart and intentionally fail closed until provider reconciliation: do not deploy without reconciling legitimate existing charges/dates. Receipt rows do not store raw payload/customer data. Unexpected charge reconciliation is durable but no operator queue/automatic reconciliation scheduler is delivered.

Checkout creation remains a provider/DB boundary with best-effort orphan cancellation rather than a durable provisioning outbox; concurrent checkout creation and external recovery require separate acceptance. In-app notifications are transactional; email is best effort with no durable retry guarantee. Stored subscriber counters can become stale at clock expiry without a subsequent mutation; authorization computes current interval independently. Broader SSRF/digest/upload/privacy/ops work remains outside EXP25/26.

Validation used cleared explicit environments, the pre-existing disposable cluster, installed dependencies and existing Chrome. Runtime external traffic was blocked by the harness; browser telemetry tunnel traffic was aborted. Build used Next's offline font-response hook with a local system font, so typography/font-provider acceptance is not claimed. Test scripts contain harness-only fake model/embedding data, never an application auth/model bypass.

Commands: bash /tmp/exp25-final-unit.sh (equivalent tsc --noEmit --incremental false, next lint, offline jest --runInBand); env -i PATH=/opt/homebrew/bin:/usr/bin:/bin EXP25_26_REGRESSIONS=1 EXP25_26_BUILD=1 bash scripts/exp25-26/run-local.sh; final acceptance rerun with EXP25_26_BROWSER=1. Runner refuses an already-running/occupied cluster and stops it on exit.
