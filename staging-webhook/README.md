# Local staging webhook receiver / worker

Branch `codex/staging-webhook-local`, base `2fe72a1a0b51450dd8b3fcfa929d04e0af7bfec8`. Frozen release checkout restored clean; no tracked files there changed. No repository AGENTS.md or applicable repository .agents directory found. Neon Functions/Postgres/overview skills reviewed.

## Ownership and schema contract

Parent authorized this component to own migration `20261004000100_staging_webhook_inbox` and model `StagingWebhookInbox` in the normal Prisma ledger. This is migration 18; future parent integration must coordinate release wrapper expected count 17→18. No wrapper edits here. Migration CHECK constraints and partial due index are SQL-owned features Prisma cannot represent. No hosted migration was applied. Inbox is dedicated to Razorpay Test staging only, never production.

Public receiver verifies HMAC on original Buffer before any JSON parse. SHA256 raw-body digest is the primary key; unsigned event-ID header is ignored entirely. An autocommit INSERT must resolve only after commit. Authenticated malformed and unsupported payloads are durably acknowledged then processed/dead-lettered; invalid signatures never reach storage. Limit 256KiB. Wake callback is injected, best effort after commit; no timers, jobs, URLs or outbound relay are configured.

Restricted worker claims using one UPDATE with SKIP LOCKED, two-minute lease, random UUID fencing token, bounded exponential retries capped at 30 minutes, default eight attempts. Expired final attempt leases become dead. Stale owners cannot acknowledge or reschedule replacement leases. Shared applyPaymentSnapshot owns atomic PaymentEvent, entitlement, counter, notification and billing-outbox effects; no reducer copy or protected Vercel relay. Crash between reducer commit and inbox acknowledgement replays the digest receipt. Shared supportedPaymentEvent/providerDate helpers are reused.

Different serializations produce different receipts. Current shared reducer retains entitlement/counter/notification/outbox idempotency but increments billingVersion for each accepted distinct charge receipt. This is existing shared behavior, not claimed as exactly-once processing. Tests check this boundary. No automatic dead-letter replay, deletion or retention job; operators must review and approve recovery. Raw bodies may contain payment/customer metadata; plan access and retention before hosted use.

## Runtime boundaries

`runtime.ts` supplies separate fetch-handler factories, default disabled. Production adapter must supply a fresh autocommit role-specific database pool through connect; core SQL interface is tested with Prisma raw queries. Receiver factory uses staging_webhook_receiver, worker factory staging_webhook_worker. Receiver is not handed the worker reducer. Configure separate processes/deployments, never initialize owner Prisma in receiver. Worker dynamically imports existing reducer after overwriting DATABASE_URL, DIRECT_URL and DATABASE_URL_UNPOOLED from explicit restricted WEBHOOK_DATABASE_URL/WEBHOOK_DIRECT_URL. Host must have exact `ep-quiet-bread-b3rqji3g` direct or pooler prefix, neon.tech suffix, sslmode=require. No ambient credential fallback.

Enable only with STAGING_WEBHOOK_ENABLED=true, STAGING_PAYMENT_MODE=razorpay-test, STAGING_PG_VERSION=16, STAGING_REGION=aws-ap-southeast-1, STAGING_PLAN=Free, and exact IDs: STAGING_PROJECT_ID=steep-wildflower-10013234, STAGING_BRANCH_ID=br-steep-pond-b3xfo61k, STAGING_ENDPOINT_ID=ep-quiet-bread-b3rqji3g. Branch name is not consulted. IDs are trusted deployment metadata, not remotely attested: future setup must verify project/branch/endpoint/region/version/plan from authorized control plane evidence before injection. Secrets STAGING_RAZORPAY_TEST_WEBHOOK_SECRET and STAGING_WEBHOOK_WORKER_SECRET must each be at least 32 characters.

Future least privilege: receiver CONNECT, schema USAGE, INSERT(digest,raw_body) plus SELECT(digest) for ON CONFLICT only; no worker state or business writes. Worker inbox SELECT/UPDATE and reducer-required SELECT/UPDATE ExpertSubscription/ExpertProfile, SELECT User, SELECT/INSERT PaymentEvent/Notification/BillingOutbox (audit enqueueBilling at integration). No CREATE, DELETE, role management, BYPASSRLS or owner credentials; dedicated migration owner separately. Existing grants/RLS must be audited before setup. No roles/keys/grants created here.

## Local verification

Run `bash staging-webhook/run-local.sh`: own mktemp cluster, loopback 55447, synthetic fixtures only, fresh 18-migration deployment, schema validation, Jest suite, owned-cluster cleanup. Mac has PG18, so PG16-specific compatibility is unverified. No Prisma client regeneration was needed: inbox SQL uses raw adapter and existing models use read-only base generated client. Dependencies are read-only symlink to installed release dependencies; no installs or writes to that dependency tree. No full build. Targeted component typecheck passes. Whole-repository typecheck remains blocked by pre-existing broken relative imports/implicit-any errors in audit/continuations-local independent review files; logs in audit/staging-webhook.

## Next exact setup approvals

1. Resolve hosting compatibility first: installed Neon Functions skill says beta availability only us-east-2, incompatible with approved Singapore staging project. Official docs fetch failed; no account/provider capability call made. Confirm availability through authorized read-only provider evidence, or approve a revised host/region architecture. Do not silently create another project.
2. Approve parent integration of migration 18/model and migration wrapper count 17→18, then applying it only to exact verified staging identity.
3. Approve creation and scoped grants of the two named roles and injection of distinct restricted pooled/direct URLs, Test webhook secret and worker auth secret; pin actual database name/metadata from verified staging evidence. Create nothing before approval.
4. Approve host adapters/dependency packaging and deploying one public receiver plus restricted worker; no protected Vercel relay. Verify timeouts and platform post-response wake lifecycle, retaining recovery sweep as correctness mechanism.
5. Separately approve an authenticated 30-minute recovery sweep and immediate wake transport. No recurring schedule currently exists.
6. Separately approve registering Razorpay Test webhook, provider test plans and transactions. None performed.
