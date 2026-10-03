# Receiver repairs independently reviewed — accepted for local integration

Reviewed clean lane HEAD82e279b0fbe4f28637ee0462fd7669b105dc34a1. Repair commits preserved:

- d493920cf7dda4ca004bfa0bdc964b778a108447
- 771f3a35abbfc83d9fc29234d948142554f93cc1
- a51303dfc9f8b215ab56e588da7c136a2f7335fd
- 82e279b0fbe4f28637ee0462fd7669b105dc34a1

Base receiver commits da030b9879e5071c547c233d8a1f42726bb44f67 and0acd3241d811a15d3c2e483b2434c87d2dd19ef4; published base2fe72a1 unchanged. Independent work in fresh git archive /tmp/experthub-webhook-independent-82e279b with installed dependencies reused read-only. No hosted migration18, push, role creation, cloud resources, secrets or provider calls. Only synthetic login roles inside disposable local PG18, removed with owned cluster.

## Independent execution

30/30 receiver tests pass: lane26 plus four original independent reproductions adapted only for the transaction-aware adapter and configurable short deadline. Expired final/dead lease produces zero payment writes; lookalike host/wrong database rejects; aborted body opens no reader; stalled apply returns bounded503. Native lane cases additionally prove expiry during apply rolls back all domain effects, replaced tokens reject, abort/statement stalls close late tx capability, lost reply after atomic commit replays once, and concurrent contenders skip locked inbox.

86/86 existing native billing tests pass in seven suites with extracted reducer. Targeted receiver types and schema validation pass. Full standalone tsc emits exactly the nine already-documented baseline audit-copy diagnostics, no receiver/application diagnostics. Local audit fix9fc5b67e4abffd28d6c26406ac13ea2969606531 is not in this lane.

Broader unit run:75 suites/1155 executed tests pass; one suite cannot load: __tests__/exp26/staging-build.test.ts fails guard.migrations at import with MANIFEST because wrapper expects17 and lane adds18. This is the documented integration gate, not a passing full unit suite. Full builds were not run while this gate remains. Evidence: independent-unit-tests.json/log, independent-full-types.log, independent-targeted-types.log, audit/staging-webhook/tests.json/log and parity-tests.json/log. No listeners remain on owned ports55447/55439. Only PostgreSQL18.6 is installed; PostgreSQL16 compatibility unverified, no installation performed.

## Code review conclusions

- core.ts:58–65 locks/revalidates inbox token/state/lease, invokes shared inner reducer and completes inbox in one transaction; clock_timestamp avoids transaction-frozen now. Failed last fence throws, rolling back receipt, entitlement, counter, notification and outbox together. Claim/sweep and retry state remain separate bounded transactions. Only a valid owned lease may make business effects.
- Lock order is inbox→subscription→expert. Existing payment/cancellation/reconciliation paths never acquire inbox; transaction extraction changes no business logic. Same-subscription events serialize; inbox claim uses SKIP LOCKED. No reverse inbox lock dependency found. Contender coverage is finite, not a comprehensive concurrency/load proof.
- database.ts:25–42 races deadline/abort inside interactive transaction callback, sets statement/lock/idle transaction timeouts, awaits rollback and closes late transaction capability. No race around separately committed reducer effects. Bounded pool/connection settings and explicit Prisma instances are used. Runtime worker binds the transaction-aware reducer to its explicit restricted client; cached owner singleton is not the mutation client.
- core.ts:5–15 now pins exact verified c-4 pooled/direct host pair, neondb, designated role, credentials, default/5432 port and only one sslmode=require query. Direct URL cannot be pooled. Actual database identity still requires setup/control-plane attestation.
- core.ts:20–46 rejects invalid header and already-aborted requests before reader; body read has5s/256KiB/4096-read limits, mid-read abort and error handling, no awaited hung cancellation. Persistence has5s transaction budget and post-read abort check. Authentication remains raw-byte HMAC before insertion or JSON parsing.
- Duplicate raw digest and receipt payloadHash collision behavior retained. Distinct serialization remains a separate receipt/billingVersion increment; entitlement/counter/notification/outbox do not duplicate and old review CAS rejects. This documented operator-review inconvenience is not eliminated.

## Actual restricted-role evidence

Native test creates fresh non-owner synthetic receiver/worker clients. Receiver INSERT/duplicate succeeds; User SELECT and inbox UPDATE fail. Worker with specified grants successfully applies shared reducer and commits inbox; DELETE, unrelated User mutation, permanent/temp table creation and role creation fail. Worker has no superuser/CREATEDB/CREATEROLE/BYPASSRLS. PUBLIC schema CREATE and database TEMP are explicitly revoked for that local proof. Hosted default/schema/role-membership/RLS grants must be audited separately; tests do not prove the existing hosted database's grants. Tighten column grants wherever reducer queries permit (for example User id/name and ExpertProfile totalSubscribers UPDATE) during reviewed setup; full table SELECT User is broader than name lookup requires.

## Concrete next setup plan and limits

1. Separate local combined candidate: preserve audit fix9fc5b67 and all receiver commits; update wrapper/checksum/schema expectations and tests for exact predecessor17→18 (50 app tables plus ledger; inbox CHECK/index identity). Existing manifest parser recognizes quoted CREATE TABLE names only; new staging_webhook_inbox is unquoted, so its table identity must be explicitly included or safely parsed, keeping runtime flags off. Run final-tree full tsc, unit/native billing/receiver suites, real17→18 local migration and production/Preview builds/browser checks. Obtain PG16 evidence only from an already-authorized suitable test runtime; do not infer it from PG18 or use the hosted DB for this review.
2. Implement/package explicit public receiver route and private worker route with exact method/path policy, isolated processes, alias/generated Prisma engine resolution, lifecycle cleanup and bounded invocation. No deployable host adapters exist yet; core accepts POST on any path. Test packaged artifacts with role-specific pools and no owner credential fallback.
3. Before hosted action, verify exact Neon project/branch/endpoint/region/version/plan and actual Functions capability. Then request exact-commit staging publication/migration18 authorization, followed by separately approved two restricted roles/grants, distinct secrets/URLs and receiver/worker deployments. Production stays unchanged.
4. Verify hosted pooled/direct current_user/current_database/version and privilege denials using separately authorized read/test scope; raw inbox data retention/access, dead-letter owner and recovery procedure need explicit decisions.
5. Separately approve authenticated wake and recurring recovery sweep. Validate unknown outcomes and provider retries; no inline retry after uncertain mutation. Then separately approve Razorpay Test webhook registration/plans/transactions. No live provider lookup or production credentials.

No remaining independently reproduced local blocker in repaired component. Acceptance is for local integration, not hosted setup, packaging or public launch. Existing deployed2fe72a1/migration17 unchanged; natural-model and genuine tester acceptance are separate.
