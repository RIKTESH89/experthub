# H1/P2 repair candidate — ready for independent re-review

Original readiness commits bc8e6ab/e254235 and evidence remain preserved on codex/exp26-32-34-runtime-readiness. Published base remains exact 8897903fb7820532994a9f0f72c210449a46afb2. No integration/publication/provider activation performed. Independent review's native reproduction showed the actor SQL still pending at 6202ms despite Prisma timeout5000; original REVIEW.md is retained here as INDEPENDENT-REVIEW.md.

## Repair

Only production source change: src/lib/payments/billing-health.ts.

- Sets transaction-local PostgreSQL statement_timeout before any account/health table read and idle_in_transaction_session_timeout=5000ms.
- Uses a 4500ms total SQL budget from the transaction callback's start, leaving 500ms inside Prisma's 5000ms option for rollback. Before **each** persisted actor/aggregate/sample read it installs only the remaining statement timeout and lock_timeout=min(1000ms,remaining). Two slow sequential statements therefore cannot each consume a fresh full budget. Expired budget refuses another read.
- Retains RepeatableRead and persisted ADMIN/isActive/isBanned FOR SHARE check. All settings use SET LOCAL or set_config(...,true), not session-wide/global changes. Pool acquisition maxWait2000 remains separate; platform route maxDuration10 is not presented as SQL cancellation proof.
- Awaits transaction rejection/rollback. Non-domain SQL/driver failures become generic BillingRuntimeError('Billing health unavailable',503), without raw error/cause detail; existing intentional unauthorized/domain errors retain their status. HTTP response remains private/no-store.
- No queue settlement/replay/write, permission/role/schema changes, secret/provider operation, alert delivery or Preview bypass is added.

## Actual adversarial verification

105/105 native tests, ten suites, on the same owned disposable PG18 loopback fixture: original100 + original independent2 + new adversarial3. The independent reproducer was copied unchanged into scripts/exp32-34-continuation/health-independent-review.test.ts for permanent regression coverage and passed.

- Original independent blocked actor lookup: rejects at 1007ms, versus pending at6202ms before repair.
- HTTP while actor row is held FOR UPDATE: generic503/private-no-store at1010ms while the blocker is still held. No health FOR SHARE lock waiter remains.
- Aggregate blocked by an ACCESS EXCLUSIVE BillingOutbox table lock: rejects at1005ms. A bounded UPDATE of the actor succeeds **before** table blocker release, proving health's already acquired ADMIN share lock was rolled back.
- Two fixture views force successive3-second pg_sleep scans. Shared remaining statement budget rejects at4508ms instead of allowing both6 seconds. No active billing read or aborted-idle transaction remains, actor UPDATE succeeds, fixture schema restores, health succeeds again, and all transaction-local timeout settings read back at their prior0 defaults.

Synthetic fixture table renames/views/UPDATEs occur only in the owned disposable database and are restored in finally blocks. No hosted data was queried or mutated. Runner stopped its process. PostgreSQL16/hosted connectivity/ABI not exercised; SQL uses settings supported by the intended PG16 runtime. This is cancellation/lock/rollback evidence on local PG18, not a load test, network-outage bound, cardinality-independent scan guarantee or proof that the whole auth HTTP request always ends within5 seconds. Auth/session resolution and client/network/platform timing are separate. Aggregate scans can still be expensive and fail safely when the budget is exhausted.

An initial new observer test counted its own pg_stat_activity monitoring query; it was corrected to exclude pg_backend_pid(). Initial-adversarial.log preserves that test failure and already passing timing observations. No product change was needed for that probe correction.

Also passed: 199/199 EXP26 regressions, twelve suites; TypeScript noEmit; Prisma validation; focused health/API lint; git diff --check. Prior host5 readiness checks remain preserved; unchanged webhook/runtime code was not rerun in this repair. Full application build/default suite, live auth/provider/email/scheduler acceptance remain unrun and unchanged gates.

## Handoff

Review-ready H1 repair, not a claim of independent approval. Parent owns re-review/integration/Linear. Original proposal and progress checkpoint remain historical; carry forward approved staging host/client/operator/recipient/₹0 decisions and unresolved real-runtime/account/action gates. Changed-file manifest and machine-readable timing/test evidence are in this directory.
