# Guarded staging migration build wrapper

Base: 9e252032080aa3aa5c4e980845a498b2d0652f95. Local implementation only; no push, deployment, credentials inspection, provider call, database connection, or migration execution.

## Selection and target boundary

`npm run build` runs `scripts/staging/build.cjs`. Migration selection requires all three exact values: `VERCEL_ENV=preview`, `VERCEL_GIT_COMMIT_REF=exp25-26-launch-auth-payments`, and `EXPERTHUB_STAGING_MIGRATE=1`. Production, unrelated branches, and absent/other flag values run the previous build (`prisma generate && next build`) without constructing a migration client. Selection additionally validates the system `VERCEL_BRANCH_URL` through the existing canonical Preview host validator before connecting.

Allowlist corresponds to Neon project `steep-wildflower-10013234`, branch `br-steep-pond-b3xfo61k` (metadata supplied by parent). DIRECT_URL accepts only `ep-quiet-bread-b3rqji3g.c-4.ap-southeast-1.aws.neon.tech`; DATABASE_URL accepts that direct host or `ep-quiet-bread-b3rqji3g-pooler.c-4.ap-southeast-1.aws.neon.tech`. Both require database `neondb`, role `neondb_owner`, a password, PostgreSQL scheme, default/5432 port, and sslmode require/verify-ca/verify-full. Query parameters are narrowly allowed and duplicates/host overrides rejected. These checks do not independently discover Neon project identity; endpoint assignment is the supplied allowlist.

## Execution and verification

Installed Prisma and client must both be 6.19.2. Before the engine, read-only preflight verifies actual database/user identity, PostgreSQL 16, CREATE privileges, and available vector >=0.5. An untracked database must contain zero public base tables. Existing history must already match all 15 completed migration checksums and expected schema; partial/failed/drifted history stops for manual investigation.

The standard installed Prisma engine runs `migrate deploy --schema prisma/schema.prisma`, owning history and migration locking. After it succeeds, the wrapper verifies all 15 SQL SHA-256 checksums, completed/non-rolled-back history, all 42 expected application tables, vector extension, EvidenceEdge view, six immutable triggers, and four paid-period/event-order columns. Only then does the application build run. No reset, automatic retry, seed, custom ledger, or migration resolve is included. Migration count/schema expectations deliberately require review when future migrations are added.

Engine child environment includes only PATH, NODE_ENV, database URLs, and disabled dotenv-config path; provider keys are not forwarded. Engine stdout/stderr are captured and never forwarded. Driver, constructor, engine, and disconnect failures produce static sanitized errors. Prisma's own .env loading remains standard CLI behavior; no repository .env exists in this checkout. Real staging credentials remain an external configuration prerequisite.

## Local evidence

- Full Jest: 839/839 tests, 55 suites (`full.log`, `full.json`).
- Focused wrapper: 34/34 tests (`focused.log`, `focused.json`), mocked database/engine only. Covers target rejection before connection, fresh/successful and completed-history paths, partial/drifted history, schema failures, sanitized errors, no retry, and production/unrelated branch pass-through.
- TypeScript and lint pass (`types.log`, `lint.log`).
- Actual Preview build-only and production build with migration flag=1 both pass (`preview-build.log`, `production-build.log`). Synthetic local database URLs, offline font fixture, and network guard were used. No selected migration build was executed.
- Vercel CLI is absent on PATH and in node_modules/.bin. Authentication availability is therefore unverified; no installation, login, token access, or account change occurred.

## Remaining gate

Parent must complete staging credential isolation before any push/deployment. The explicit migration flag and branch-scoped URLs have not been set by this implementation. A future authorized selected Preview deployment must validate real database execution and clean rerun; local mocks and builds do not prove live migration success. Production remains untouched.
