# Local host packaging completed; hosted setup remains unapproved

Base accepted local repair commit: 82e279b. This followup changes only staging-webhook sources/tests and local audit evidence. No root package manifest, repository schema/migration, frozen checkout, deployment, role, credential, trigger, provider Test plan or hosted transaction was changed.

## Concrete entrypoints and request contract

- `neon-receiver.ts` exports `{fetch,close}` compatible with Neon Node24. Only **POST /razorpay-test**, no query string, trailing slash, alternate path or method. Route accepts Razorpay Test's original body untouched and x-razorpay-signature; no JSON parsing/HTTP relay. Missing or invalid signature cannot persist. Default disabled returns503; wrong route404, wrong method405.
- `neon-worker.ts` exports `{fetch,close}`. **POST /drain** requires exact Bearer STAGING_WEBHOOK_WORKER_SECRET, checked before lazy runtime/client initialization. Arbitrary x-neon-* headers cannot authorize drain. Claims, payment effects and inbox completion use bounded isolated transactions.
- **POST /recover** is supported ONLY by this entrypoint when directly deployed behind Neon edge, whose documented stripping of client-supplied X-Neon-* makes presence of X-Neon-Trigger-Invocation-Id trusted. It is disabled unless STAGING_WEBHOOK_RECOVERY_ENABLED=true and the actual approved trigger ID is pinned in STAGING_WEBHOOK_RECOVERY_TRIGGER_ID. Require version1 envelope, matching invocation_id/header, schedule type, exact trigger ID and valid UTC scheduled_at. It invokes the same worker handler internally with injected bearer credential; no outbound relay. Generic `workerAdapter` rejects /recover and never trusts caller-supplied trigger headers. Do not deploy the Neon-specific entrypoint behind an ordinary HTTP server/proxy where callers can spoof these headers; use generic authenticated /drain instead.
- No timer, recurring job or trigger declaration exists. Proposed recovery cadence is a future **30-minute UTC sweep** (`*/30 * * * *`) with function_path `/recover`. Duplicate trigger occurrences are safe because durable inbox leases/receipts govern effects; no schedule-occurrence state is needed.

## Isolated packages and reproducible local verification

Run `bash staging-webhook/verify-host-local.sh`. It downloads checksum-verified local Node24 plus pinned public runtime/engine dependencies as needed, builds ONLY this component, runs own disposable loopback PG18 suites and ZIP smoke, then stops/removes its cluster. No global install, app build, cloud CLI/API or deployment. Installed Prisma/esbuild build tools are read-only; WEBHOOK_ESBUILD_MODULE can select a separately installed esbuild module (default Mac Vercel CLI copy). A Mac arm64 Node24 download is intentional for the user's environment; other developer platforms must use their own Node24 binary.

`build-package.cjs` derives a temporary schema from unchanged prisma/schema.prisma, changes only its client output/binary targets, and generates under ignored `.package-runtime/client`. It never writes into release node_modules/.prisma or root manifests. Generated standalone client includes its OWN runtime/library.js; both artifacts instantiate that class explicitly, not the release/global cached class. Runtime is pinned Prisma6.19.2 and @neon/functions0.8.0; tarball SHA512 is checked before extraction. Library engines included: native Mac arm64 for smoke, Debian OpenSSL3 x64, RHEL OpenSSL3 x64, Linux arm64 OpenSSL3. Native Linux engines' presence is checked; Linux loading/actual host ABI remains untested on this Mac.

`dist/receiver/index.mjs` and `dist/worker/index.mjs` are self-contained ESM entrypoints with generated CJS clients and pinned dependency files, no external symlinks or root app node_modules dependency. Public bundle is checked to contain no shared worker reducer. Worker aliases @/lib/prisma to a throwing sentinel so accidental use of the ambient app wrapper fails closed; the existing applyPaymentSnapshotInTransaction is bundled unchanged and receives the isolated TransactionClient. No app reducer/schema edit in this followup.

`dist/receiver.zip` / `dist/worker.zip` contain index.mjs at archive root plus complete relative runtime dependencies, suitable for later approved prebuilt-source upload. BUILD.json records schema/source SHA256, versions and targets; ZIP checksums and file sizes are captured in audit. The verification-only `dist/verify-local.mjs` sits OUTSIDE both deploy ZIPs, rejects any DB except owned loopback55447/webhook_local, and proves own generated StagingWebhookInbox model plus synthetic shared-reducer commit. It is never an exposed route or deployment file.

ZIP smoke EXTRACTS both ZIPs to a separate temporary directory, checks dependency pins/engines/no symlinks, loads concrete fetch handlers with Node24 in disabled state, verifies routes, and runs own generated-client probe with fetch blocked. No hosted calls. Local request/response suite verifies enabled raw-body route, signature failure, default-off factories, method/path/query rejection, generic spoofed-header rejection, native trigger envelope gating, standalone bearer auth, and best-effort wake after commit.

## Required environment after separately approved setup

Each deployment must receive these trusted verified metadata values:

```
STAGING_WEBHOOK_ENABLED=true
STAGING_PAYMENT_MODE=razorpay-test
STAGING_PROJECT_ID=steep-wildflower-10013234
STAGING_BRANCH_ID=br-steep-pond-b3xfo61k
STAGING_ENDPOINT_ID=ep-quiet-bread-b3rqji3g
STAGING_PG_VERSION=16
STAGING_REGION=aws-ap-southeast-1
STAGING_PLAN=Free
```

Leave STAGING_WEBHOOK_ENABLED absent/false until approvals and guards are verified. Per deployment, WEBHOOK_DATABASE_URL must be exact pooled host `ep-quiet-bread-b3rqji3g-pooler.c-4.ap-southeast-1.aws.neon.tech`, WEBHOOK_DIRECT_URL exact direct host `ep-quiet-bread-b3rqji3g.c-4.ap-southeast-1.aws.neon.tech`, database neondb, role staging_webhook_receiver or staging_webhook_worker respectively, nonempty password, default/5432 port and sole sslmode=require. Owner role forbidden. Runtime explicitly overwrites all automatically injected DATABASE_URL, DATABASE_URL_UNPOOLED and Prisma DIRECT_URL before any use; each new client receives its explicit restricted URL. Do not reuse an ambient pool/client.

Receiver needs STAGING_RAZORPAY_TEST_WEBHOOK_SECRET (32+ chars), worker needs STAGING_WEBHOOK_WORKER_SECRET (32+ chars). Real values are neither supplied nor created here. Distinct secrets are required for wake. Narrowed exact role/column-grant contract, read-only PUBLIC/default/RLS preflight, denial/race tests and setup SQL are in PERMISSIONS.md plus permission-grants.sql/permission-audit.sql. No hosted PUBLIC revocation is authorized or automated; stop for separate owner approval if inherited/default rights undermine column isolation.

Optional immediate best-effort wake remains default off: after actual worker URL is verified against branch identity, set STAGING_WEBHOOK_WAKE_ENABLED=true, STAGING_WEBHOOK_WORKER_HOST=<verified full host>, STAGING_WEBHOOK_WORKER_URL=https://<same host>/drain, STAGING_WEBHOOK_WORKER_BRANCH_ID=br-steep-pond-b3xfo61k and inject the worker bearer secret into receiver too. Host equality, HTTPS/no userinfo/port/query/hash and exact /drain are enforced; these values are trusted deployment configuration from actual control-plane evidence, never a caller-controlled URL or guessed function hostname. Request is POST, bearer-authenticated, redirect:error, 5-second abort deadline. Neon receiver uses waitUntil for wake lifecycle; failures do not reverse committed acknowledgement. Wake is optional latency help, recovery sweep is correctness fallback.

## Next setup sequence requiring user approval

1. Parent integration owns candidate root audit fixes, manifest/migration-wrapper17→18 and full-app checks. Independently accept this followup ZIP/source and verify PG16 compatibility and actual Linux/runtime ABI/size quotas before hosted changes.
2. Approve migration18 to the verified staging identity only, then creation of two restricted roles/grants and secret injection (no owner credentials). Verify database/role/endpoint/control-plane identities on both URLs; audit public/default/RLS privileges. No grants applied here.
3. Approve deploying proposed slugs `stagingreceiver` / `stagingworker` (both lowercase alphanumeric ≤20) on the existing staging branch. Existing resources must be checked first to avoid replacing unrelated functions. Use prebuilt ZIP upload or documented `neon functions deploy <slug> --src staging-webhook/dist/<receiver|worker> --no-bundle --runtime nodejs24` with explicit authorized project/branch targeting; inspect resulting upload includes relative dependency tree. Do not run neon deploy/config apply/checkout implicitly; no neon.ts infrastructure manifest is supplied.
4. Verify actual URLs/routing, env gates, 401/400/no-insert behavior and restricted DB current_user on the deployed native host before enabling traffic. Disable by env on any capability, routing, identity, quota or billing restriction; no paid fallback.
5. Separately approve the30-minute trigger, initially disabled and targeting worker `/recover`; obtain its actual trigger ID, pin it, then enable recovery only after verifying direct Neon edge-header contract. Optional authenticated wake needs its own verified actual URL and approved secret propagation. No recurring job is configured now.
6. Separately approve Razorpay Test webhook registration at actual receiver URL + `/razorpay-test`, Test plans and synthetic test transactions. Never send production webhooks or payments to this staging receiver.

Current official docs read2026-10-04 (public documentation only): [deploy](https://neon.com/docs/compute/functions/deploy), [runtime](https://neon.com/docs/compute/functions/reference/runtime-limits), [env](https://neon.com/docs/compute/functions/environment-variables), [trigger trust](https://neon.com/docs/compute/functions/triggers/overview), [schedule](https://neon.com/docs/compute/functions/triggers/schedule). Singapore/all-plan support remains documented; actual usage/quotas are a later authorized capability check. Installed skill's beta/Ohio-only notes are superseded by these official docs.
