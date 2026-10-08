# EXP26 / EXP32–34 runtime readiness delivery

Base: exact published 8897903fb7820532994a9f0f72c210449a46afb2.
Checkout: /Users/rikteshs20/Documents/Codex/2026-10-08/task-3/recovery-readiness.
Branch: codex/exp26-32-34-runtime-readiness.
Previous auth/billing checkout/evidence remains preserved. Fresh clone uses existing dependencies read-only, no install. No AGENTS.md/.agents at this base. Parent owns Linear, independent review and integration.

## Delivered locally

- ADMIN GET /api/admin/billing/health: read-only repeatable transaction with persisted admin/activity/ban recheck. Default disabled and Preview blocked using existing BILLING_REVIEW_ENABLED flag. Explicit private/no-store response; 10-second route budget, five-second transaction budget/two-second acquisition wait.
- Aggregates due/ready/leased/expired-leased/failed outbox work and unresolved UNKNOWN/IN_FLIGHT provisioning. Shows attention before another worker claim when a READY row has exhausted the default five-attempt policy. Two samples are capped at 25 rows; message payloads, recipients, lease secrets and raw errors are excluded, known safe failure codes preserved. It does not claim, settle, replay, send alerts or email, or enable a worker. IN_FLIGHT is an unresolved observation, not proof of failure. Actual delivery of external alerts remains an EXP33 gate.
- Eight new native tests, including four concurrent signed webhook receipts → one payment/notification/outbox → four concurrent workers with injected permanent email rejection → one terminal failure exposed through health, with paid access/counter retained. Additional tests cover 30-row sample bound/redaction/no mutation, stale ADMIN demotion/ban/inactivity, anonymous denial, empty healthy snapshot, default/Preview blocking and exhausted READY visibility. Provider/email operations injected; all external fetch blocked.
- Metadata-only current provider readback, source boundary audit and a bounded, reviewable acceptance proposal. No new UI, accepted homepage, schema/migration, dependency manifest or release-serving changes.

Overlap notice was sent in commentary before edits and parent-message delivery attempted before edits; supplied parent thread again returned “thread not found”. Platform delegation handoff will carry this result. All edits are in the fresh isolated checkout.

## Verified provider facts versus limitations

provider-status.json contains only allowlisted metadata. Live Vercel readback: exact 8897903 deployment READY; scoped Google enabled=1/migration=0, no listed billing/Resend/Razorpay configuration keys. decrypt=false; sensitive values not inspected/persisted. Exact Preview DB endpoint and Production equality remain unverified.

Live Neon readback: experthub-staging project steep-wildflower-10013234, Singapore, PG16, free_v3; exact br-steep-pond-b3xfo61k branch is named production/default within that staging project. Endpoint ep-quiet-bread-b3rqji3g matches source pins, idle and pooler disabled. Both stagingreceiver/stagingworker Node24 deployment 2 completed, no triggers registered, no webhook/worker secret keys in listed function deployment environment. Enable values remain unread. Function deployment existence supersedes old undeployed uncertainty; OFF/NOLOGIN/connectivity/grants/migration/runtime acceptance are not inferred. No paused password diagnosis or role/password check resumed.

Razorpay and Resend account/configuration inspection was unavailable through exposed tools. No account login, runtime request, hosted SQL, sensitive credential read, mutation, schedule or provider action was performed. Public reachability remains prior evidence; this pass does not claim new authenticated hosted acceptance.

## Verification

- 100/100 native billing tests, eight suites (92 prior plus eight added), fresh checkout-owned PostgreSQL18 cluster, loopback55439/database billing_continuation. Existing migrations applied only locally; runner stopped owned process.
- 199/199 EXP26 tests, twelve suites, synthetic auth/gates/access regression scope.
- Five/five synthetic staging-webhook host routing/wake/trigger tests, one suite. No native webhook database suite/host ZIP build rerun because runner would install/download runtime dependencies; no installs authorized.
- TypeScript noEmit, Prisma validation, focused lint of both new source files and git diff --check pass.
- No full default suite, application build or deployment run in this pass; prior published combined baseline evidence is preserved and parent owns integration validation. PG16/native hosted runtime proof remains unrun; local database is PG18.
- An initial TypeScript fixture literal type was repaired before final validation. Earlier generated audit files were restored; fresh results stay in this lane directory.

Reproduce with existing dependencies only:

```sh
bash scripts/exp32-34-continuation/run-local.sh
node node_modules/jest/bin/jest.js --runInBand __tests__/exp26
node node_modules/jest/bin/jest.js --config staging-webhook/jest.config.cjs --runInBand staging-webhook/host.test.ts
```

Local SQL runner requires local socket/process approval; no hosted URL may be substituted. Source audit hashes, metadata, JSON and logs are alongside this report. MANIFEST.txt lists the exact changed paths. progress.json supplies proposed per-Linear-ID updates without writing Linear.

## Concrete owner decisions still needed

See ACCEPTANCE-PROPOSAL.md for per-account/runtime, bounded actions/data, ₹0 cap, sensitive configuration and existing coverage. Parent must supply a consenting Google tester; exact existing Razorpay Test application and reviewed isolated provisioning/runtime path; existing verified Resend sender and worker runtime; and exact separately applicable secret/worker/scheduler/action approvals. Carry forward approved hostname/client, operator and alert-recipient Gmail; don't request those decisions again.

Critical architecture blocker: existing Neon functions receive/drain signed Test receipts but do not create provisioning intents/provider subscriptions or consume billing emails. Existing Preview app prevents billing/provider/review/email/health even when flags are supplied. A billing/email runtime must be named and reviewed independently; no guard weakened or new runtime deployed here. Read-only plan does not authorize reconciliation apply; any apply needs exact staging row/actor/digest. Cost cap zero requires confirmed included allowance; Free metadata alone is insufficient. No automatic replay or customer reconciliation is proposed.
