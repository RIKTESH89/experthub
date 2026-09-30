# Phase0 real integration verification

Canonical checkout: `/Users/rikteshs20/Documents/Codex/2026-09-30/task-3/experthub`, branch `phase0-faithful-twin`.
Scope: user-approved EXP19 installations and disposable synthetic localhost DB/browser checks. No existing database, visitor data, production credential, user browser profile, hosted API, login service, push or deployment was used.

## Setup and isolation

- Homebrew installed PostgreSQL **18.6** and pgvector **0.8.6** with required dependency updates. Its package automatically initialized `/opt/homebrew/var/postgresql@18`; that default cluster was never started or used. No `brew services` invocation occurred.
- Approved pinned dev dependency: **@playwright/test 1.63.0**. Installation used `--ignore-scripts`; only three Playwright packages added. No browser download occurred. npm also normalized lockfile peer metadata; existing package versions were retained.
- Test cluster: repository `.phase0-runtime/pgdata`, initialized with distinct `phase0synthetic` role, synthetic-only local password, SCRAM host auth. Runtime directory is ignored; database files, password and logs are not committed. TCP bound only to **127.0.0.1:55432**, checked unused before start; Unix socket `/tmp` on that port. Database **experthub_phase0_test** was newly created there.
- `CREATE EXTENSION vector` succeeded and reported **0.8.6**. All **11** repository migrations applied successfully only to the new test database. Dedicated Prisma URL is hardcoded in integration setup; no `.env` or Groq secret file is loaded. Before fixture resets, tests assert `current_database()` exactly matches the disposable DB. All records are synthetic.
- Browser: existing installed Chrome **154.0.8037.59**, launched headless through `channel: "chrome"`. Each test uses a fresh nonpersistent context. Browser requests are restricted to the local HTTP harness. Contexts/browser/server close in teardown.
- All external-service fetches are blocked, except an in-process fake OpenAI response used by the real chat engine. Synthetic vectors replace embedding provider calls. Authentication is an in-process synthetic user stub; no OAuth login or provider is contacted.
- Cluster was stopped at the end. `pg_ctl status` reports no server running and port 55432 was successfully rebound/released. Artifacts are preserved. No persistent scheduler registration exists.

## Results

| Check | Result |
|---|---|
| Dedicated real PostgreSQL + fresh Chrome suite | **26/26 pass**, 2 suites |
| Separate stop/start persistence proof | **1/1 pass** |
| Offline Phase0 regressions | **103/103 pass**, 16 suites |
| Full existing + Phase0 offline suite | **709/721**, same original 12 failures |
| TypeScript | same **41** existing diagnostics, no added source/integration diagnostics |
| Next lint / diff whitespace | clean |

Evidence: `integration-jest.json/log`, `restart-jest.json/log`, `current-jest.json/log`, `phase0-jest.json/log`, `current-types.log`, `current-lint.log`, `localdb-latency.json`. The earlier `database-jest.json/log` preserves the initial 8/8 checkpoint. The 27 real checks are in a separate config and are **not counted** in the 721 offline total.

### Real database cases

Rollback of source mutation; index create/replay/edit/delete and orphan cleanup; delayed older indexing vs newer source CAS; deletion while embedding is in flight; two competing job claims; expired leases and late acknowledgment; retry backoff; scheduler reconstruction; native one-second scheduler tick and graceful shutdown; SQL vector/keyword pre-ranking tenant/audience constraints; post mutation and outbox rollback; concurrent identical enqueue; exact concurrent memories plus visitor/expert isolation; deletion cleanup failure after source row removal and later recovery; live entitlement downgrade, unpublish and delete; two experts × anonymous/ordinary/entitled/owner access; and duplicate-source migration failure in a rollback-only schema fixture.

### Browser cases

The actual `public/embed/widget.js` runs in Chrome against real widget config/chat routes through a local HTTP bridge. It persists the server-issued signed identity/token in localStorage, reuses it across reload, rejects forged identity, and selects the latest correction from >50 persisted messages with deterministic timestamp ties.

Fresh Chrome also posts to the actual subscriber message route. Real Prisma history, permission resolver, keyword retrieval and chat-engine prompt construction are exercised. It selects the newest correction beyond 50 messages; premium evidence is present when entitled, then removed from prompt/citations after a live downgrade on the warm session. A fake streamed model answer avoids external calls. These tests establish route/widget/retrieval behavior, not model faithfulness/naturalness.

Limit: the HTTP bridge serves actual route handlers and widget code without starting the full Next application or real OAuth. Full authenticated site UI/navigation and production hosting/scheduling remain untested and outside this isolated check's claim.

### Restart proof

A synthetic orphan vector plus an expired RUNNING cleanup job were inserted into the disposable DB. The cluster was stopped and restarted. A new Jest process verified persisted lease/IDs and invoked the real worker, which completed cleanup and removed the orphan. The expired job was explicitly due. Initial proof fixture failed because the default DB timezone and default `availableAt` generated a future naive timestamp; test server was then run in UTC and fixture due time made explicit. The successful separate proof is recorded. This is a clean cluster stop/start and fresh worker recovery, not an OS kill/crash stress test.

## Bugs found and fixed

1. **Concurrent memory upsert:** Prisma's empty-update upsert can emulate read/create, causing P2002 under concurrent extraction. The losing writer now acknowledges only a verified existing keyed row for the exact visitor/expert; it does not update recency. Other errors or foreign identity are rethrown. Real concurrency and a negative unit case pass.
2. **New outbox eligibility:** database-generated timestamp rounding could make a new job briefly later than the immediate claim, leaving a source unindexed in the owner matrix. Job creation now supplies an explicit JavaScript `availableAt`. Outbox uses a nonempty identity-preserving update to obtain atomic upsert behavior without resetting attempts/lease/state; ten concurrent enqueue calls create one row. Unchanged post projection upserts similarly include the unchanged source ID.
3. **Test tooling:** integration compiler target is ES2020 because Playwright serializes browser async functions; the repository's default ES5 transform injected unavailable `__awaiter`. Integration-only target changed; production tsconfig unchanged. Added integration BigInt literals/type inference errors were corrected; type diagnostics returned to baseline.

## Local SQL latency

20 iterations per variant on one synthetic vector. Saved JSON compares the earlier namespace-only SQL shape against current vectorStore query with authorization/client validation. Final timings are in `localdb-latency.json`; approximately sub-millisecond locally. Selected columns and client validation differ. This is a real local SQL harness measurement, **not** provider/end-to-end performance or a representative production load test; no conclusion about scalability or model quality follows.

## Reproduce

Install commands already executed:

```sh
brew install postgresql@18 pgvector
npm install --save-dev --save-exact @playwright/test@1.63.0 --ignore-scripts --no-audit --no-fund --cache /tmp/experthub-npm-cache
```

The preserved cluster can be started with the guarded runner, which refuses an already-running test cluster, checks the port, uses UTC, runs the 26 fixture checks, and stops on exit:

```sh
bash scripts/phase0-integration/run-local.sh
```

Integration command:

```sh
node node_modules/jest/bin/jest.js --config scripts/phase0-integration/jest.config.cjs --runInBand --testPathPattern '(database|browser).integration' --json --outputFile audit/phase0/integration-jest.json
```

Restart proof is intentionally separate: seed `synthetic-restart-proof` as an expired/due RUNNING cleanup job and `synthetic-restart-orphan`, stop/start only this cluster, then run the same config with `--testPathPattern restart-proof`. Ordinary test resets truncate synthetic rows and erase that marker; do not include the proof without reseeding it. Runtime logs retain the seed/restart commands' results; committed proof test asserts persistence before recovery.

## Remaining gates

The requested isolated Phase0 DB/Chrome behaviors above are verified. Original 12 failing tests and 41 test/helper type diagnostics remain; full checks are not green. Production rollout still needs a real-data duplicate preflight/reindex plan and deployment/scheduler decision, which were not authorized here. Model fidelity, temporal-person reasoning, naturalness and production latency remain later evaluations; the two prior Groq synthetic smoke requests were not repeated. Full Next UI/OAuth and abrupt-process/large-load fault stress are not claimed.

The guarded `run-local.sh` was itself executed successfully: 26/26 tests passed and its exit trap stopped the cluster (`guarded-run.log`). Lock comparison confirms exactly three added Playwright packages and zero existing dependency version changes.
