# EXP32–34 local payments lane

Worktree: `/Users/rikteshs20/Documents/Codex/2026-10-03/task-10/payments`
Branch: `codex/exp32-34-payments`; frozen base: `d8c4eb3acc2ee8a8595f3bc5bea67da763d48203`.
No repository AGENTS.md or .agents/skills exists at this base or its repository parent. Parent confirmed sole migration ownership and the additional free-subscription route.

## Changes and contracts

- EXP32: durable provisioning intent before provider creation; partial unique open subscriber/expert pair; single CAS claim. Provider timeout, local save failure or attachment failure requires reviewed recovery. No blind retry of uncertain remote creation. Reviewed recovery can also recover a crashed IN_FLIGHT intent; matching intent/version/provider identity is required. Pending attached retry returns the same provider ID. Attachment is atomic and PENDING only. Provider notes carry intent ID. No automatic orphan cancellation/refund policy.
- EXP33: billing notification intent commits with payment receipt, subscription, counter and in-app notification. Durable leased outbox uses SKIP LOCKED, dedupe primary key, fencing tokens, bounded retry backoff and terminal failures. Webhook no longer sends email. Worker accepts an injected delivery adapter; no email adapter, scheduler or remote receiver is installed. Delivery is at-least-once: downstream must honor dedupe key after crash between delivery and settlement.
- EXP34: reconciliation is dry-run by default. Explicit apply requires exact reviewed SHA-256 plan digest and CAS on subscription version, provider identity and cancellation state. Only previously unverified rows qualify. Exact captured provider interval required; no inferred month. Apply preserves cancellation, records reviewed evidence audit, increments version, recomputes counter and enqueues notification intent atomically. No production rows queried.
- `billingVersion`: new row starts at 0; each committed webhook state mutation, cancellation, provisioning attachment, reconciliation or existing free transition increments once. Receipt-only ignored/duplicate events and repeated already-cancelled/free operations do not increment. Row lock precedes expert lock for existing subscriptions. The free route refuses unresolved provisioning and cannot overwrite confirmed paid access.
- Shared files: schema; additive migration `20261003180000_billing_recovery_outbox`; payment state/create-subscription/webhook; existing free-subscription route. Cancellation uses changed common state transaction, no separate version counter.
- Prisma additions are accessed via parameterized transaction SQL so shared generated client/dependencies stay read-only. New schema models require client generation later in an isolated integrated build.

## Actual verification

28/28 tests across 3 suites passed. Includes copied frozen EXP25/26 payment route regressions with isolated DB guard/setup, six-way receipt race, outbox rollback/claim/expiry/fencing, provisioning race/sequential retry, reviewed apply race/cancellation version conflict, free mutation/provisioning and paid-state races. Synthetic provider timeouts and terminal notification failure use mocks only.

Disposable PostgreSQL 18 cluster under `.billing-runtime/pgdata`, loopback 55438, database/user `billing_synthetic`; freshly initialized by this lane (PID 37374 for first run). All 17 migrations applied to this empty synthetic database. Prisma validate, TypeScript noEmit and git diff --check passed. Logs/JSON in this directory. Repeat using `bash scripts/exp32-34/run-local.sh` with approved local process/network permissions; runner refuses an already running cluster and only stops the PID it starts.

## Limitations

Local implementation only: no push, deploy, full build, client generation, real provider requests, emails, real payments/payouts, credential changes or production data. Reviewed reconciliation/recovery are library entry points, not exposed operator HTTP routes or scheduled commands. A future authorized operator workflow must obtain trustworthy provider evidence before constructing reviewed input; synthetic tests do not establish live Razorpay semantics. Uncertain plan creation can orphan a provider plan; durable intent is blocked for review rather than attempting another plan. Unknown provisioning intentionally has no automatic expiration/retry. New SQL invariants/partial index are migration-managed. Free-new-row path retains baseline behavior; this lane hardens existing-row transitions interacting with billing. Outbox delivery activation and refund policy remain separate manual review work. Migration remains local for later integrated review; frozen release and hosted database were untouched.
