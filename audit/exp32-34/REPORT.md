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

## Follow-up acceptance audit (after preserved commit 52b3162)

Focused Next lint of all ten changed production files: PASS, no warnings/errors (`lint.log`). Follow-up runner: 36/36 tests across four suites, schema validation and TypeScript pass; owned cluster stopped by runner. No full build/client generation or real provider/email calls.

### EXP32

Implemented: durable pre-call intent; CAS single claimant; open-pair dedupe; provider adapter wired to existing Razorpay create route; provider intent notes; PENDING-only atomic attachment; same-provider sequential retry; sticky uncertainty after plan/subscription timeout or DB response loss; reviewed recovery with persisted intent version and subscription version guards; synthetic-only CLI recovery requiring exact reviewed input digest.

Regression evidence: concurrent creators/claimants create one subscription; subscription timeout does not retry; plan success/timeout does not retry or create subscription; committed plan-save response loss remains IN_FLIGHT and supports reviewed recovery; committed attachment response loss returns review and subsequent retry returns durable provider ID without creating; real PostgreSQL reviewed recovery CLI attaches and increments subscription version exactly once.

Not implemented: automated provider lookup/reconciliation adapter for ambiguous operations, remote operator endpoint/UI, scheduled recovery worker, automatic cancellation/refund of uncertain objects. These need future provider evidence and operational authorization. The provider creation adapter is implemented, not merely an interface; reviewed recovery library and local operator CLI are implemented. Production activation is not performed.

### EXP33

Implemented: transactional notification intent plus durable PostgreSQL queue adapter; worker loop with injected delivery callback; atomic SKIP LOCKED leases, expiry/reclaim, fencing, unique intent key; retry delay and terminal failure state. Callback receives stable dedupe key. Webhook email side effect removed. No email is sent by any validation.

Regression evidence: six identical receipts produce one notification intent and one in-app notification; explicit duplicate enqueue produces one queue row; transaction rollback removes intent; five worker claims lease one job; stale lease cannot settle reclaimed work; callback failure reaches terminal state; ambiguous successful delivery before settlement retries same key and a synthetic deduplicating recipient observes exactly one send.

Not implemented: production email/notification transport adapter, durable downstream dedupe receiver, scheduler/HTTP worker entrypoint, terminal failure operator replay workflow. Worker and database adapters are implemented; the transport and scheduling layer are absent, not just switched off. Delivery is at-least-once, not exactly-once; dedupe relies on downstream honoring the supplied key. No remote receiver resources added.

### EXP34

Implemented: exact captured interval validation; immutable reviewed digest; default dry-run without instantiating Prisma; explicit apply guarded by reviewed digest and persisted billing version/provider/cancellation snapshot; already verified rows rejected; atomic evidence audit, subscription change, cancellation preservation, counter recomputation and outbox intent. Synthetic operator command is now implemented and permits apply only to `billing_synthetic@127.0.0.1:55438/billing_synthetic` with no URL query/hash.

Regression evidence: dry-run does not call store or depend on a database; unreviewed/tampered input rejected; remote apply refused; four simultaneous reviewed applies commit once; cancellation invalidates old reviewed version; verified cancellation retains exact paid interval with end-exclusive access; local CLI executes reviewed reconciliation on disposable rows.

Not implemented: production legacy-row scanner/provider evidence fetcher, operator UI/remote apply, review-role identity/signature storage. The digest records which input was approved; it is not proof of reviewer identity or provider authenticity. These entry points are local synthetic tools, not production administrative authorization.

### Cross-route version contract

Coverage includes payment vs repeated cancellation (one cancellation increment), reconciliation vs cancellation (stale CAS refuses), free activation vs unresolved provisioning (refused), free activation vs confirmed charge (one winner, verified access cannot be overwritten), repeated free transitions (no extra increments, counter correct), provisioning attachment vs sequential creation retry (one increment), and cancellation during provider creation (stale attachment rejected by subscription version). Pending/ignored events and duplicate receipts cannot grant access. This is one billingVersion contract; no competing counter was introduced.

Operator usage: `node scripts/exp32-34/operator.cjs reconcile|recover --input review.json` produces a dry-run digest. `--apply --reviewed-digest <digest>` is restricted to the synthetic database. Reconciliation input contains `{row,evidence}`; recovery contains `{intent,evidence:{intentId,providerId}}`. No .env loading; no provider calls. Tests exercise local applies only.

## Independent review repairs (supersedes earlier acceptance limitations)

Independent review of `52b3162`/`ec2615e` identified four integration blockers. They were reproduced locally before repair. `repairs-before.log` and `repairs-before.json` preserve the failing run: **6 failures, 36 passes, 42 tests**. Native failures cover persisted provider replacement, a sixth crashed lease attempt, stale absent-pair provisioning after waiting on expert lock, partial free-row commit after notification failure, and concurrent first free/paid notification intent missing. The contract failure additionally exposes batching without pre-delivery ownership verification. Final verification: **44/44 tests, five suites**, plus focused production lint, TypeScript noEmit, schema validation and diff checks. Same isolated PostgreSQL cluster was used; runner stopped its owned process.

1. **Persisted provider identity**: durable attach compares database `current.providerId` against proposed provider inside the subscription transaction; a supplied reviewed snapshot cannot hide a persisted identity. Durable save also refuses to replace a non-null provider ID. Version CAS still rolls back attachment if concurrent intent changes occur.
2. **Crash attempt bounds and leases**: claim accepts the worker's attempt cap, marks exhausted expired/ready rows FAILED, and only claims rows below that cap. Five crash leases exhaust the default policy; sixth claim cannot send. Worker claims one job immediately before delivery, then verifies state/token/non-expired lease through the database adapter. Two additional native tests expire ownership between claim and delivery (no send; bounded terminal state) and advance synthetic time by 61 seconds during first delivery (next job gets a fresh lease). A delivery already in progress can outlive its lease; at-least-once downstream dedupe remains required, and no exactly-once guarantee is made.
3. **Atomic new free subscriptions**: route delegates first-row creation to a transaction holding expert serialization, rereads pair, preserves paid/open-intent conflicts, computes counter and commits in-app notification plus unique outbox intent together. Removed free-route fire-and-forget email. Repeated concurrent first-free creates reuse the ACTIVE free row; changed paid/other rows return conflict. New-row version remains 0 under the existing version contract. Native SQL trigger injects notification failure: subscription/counter/outbox all roll back. Concurrent new free/paid creation has exactly one pair and a correct counter.
4. **Stale first provisioning read**: after expert lock, a previously absent pair is reread. If it appeared, transaction rolls back and retries (up to three attempts) so the existing subscription is acquired before expert, preserving global lock order. Deterministic native test holds expert lock, starts absent-pair provisioning and observes PostgreSQL lock wait, commits a first already-attached subscription/intent, then releases; second request returns that same intent and creates no extra row.

No new schema/migration change was necessary for repairs. Existing commits are preserved. Hosted resources, production data and provider APIs were untouched. Transport/scheduler/provider-lookup acceptance limitations above still apply.
