# EXP28 / EXP29 local findings

Frozen base: d8c4eb3acc2ee8a8595f3bc5bea67da763d48203. Isolated checkout: /Users/rikteshs20/Documents/Codex/2026-10-03/task-9/exp28-exp29. No repository AGENTS.md or .agents/skills was present. Existing dependencies were symlinked read-only; no installation, client generation or shared build occurred. This lane owns only new scripts/exp28-29 and audit/exp28-29. Payment, chat, schema and application source files remain unchanged; the billing lane migration is outside this frozen-base test.

Executed `node scripts/exp28-29/run.cjs` successfully on the user's Mac. Initial sandbox initialization failed because shmget was prohibited; scoped elevated local runs succeeded. A missing sourceType fixture was corrected before successful runs. Final expanded result: **16 runtime integration tests in two suites passed**, existing migrations deployed, actual ingestion/native pgvector exercised, owned-worker SIGKILL recovery asserted, 46 application tables matched after database crash recovery/restore, and restored durable replay passed.

## Exact application-path coverage

The 100-job / ten-worker batch calls real enqueueLifecycleJob and runLifecycleJob against PostgreSQL with a synthetic index callback. It measures outbox claim/ack SQL, not ingestion or user capacity. The older reliability suite mocks vector cleanup and simulates abandoned leases; its separate limits are in load.json.

The new ingestion suite executes real syncKnowledgeItem, deterministic chunking/IDs, indexDocument, native pgvector upsert, source-manifest CAS, evidence/temporal publication, enqueueLifecycleJob, runLifecycleJob and drainLifecycleJobs. Only generateEmbedding returns deterministic nonzero 1536-dimensional vectors; real validation/model identity execute. Ten calls ingest ten distinct sources; twenty repeats produce no more embeddings/evidence. Ten contending calls on one source yield one embedding/index attempt and one current revision. These are application-function calls, not HTTP sessions/chat users.

Assertions additionally exercise embedding outage with persisted PENDING/error/backoff then attempt-2 success; real drain reconciliation of committed source without enqueue; actual owned-process SIGKILL after vector commit before publication; actual owned-process SIGKILL after publication before DONE ack; and a newer source revision after crashed old work. Replay preserves published evidence, avoids duplicate deterministic vectors, fences old revision and removes orphan vectors. Lease expiry uses controlled clocks rather than measured five-minute waiting. No shared reliability fixes were necessary for these scenarios.

## Explicit backup boundaries

| Boundary | Assertions |
| --- | --- |
| Before snapshot/dump | Complete ingestion is published. PENDING intent is attempt 0 without vector; SIGKILL-interrupted RUNNING intent is attempt 1 with committed vector and unpublished source. No worker is alive. |
| Database crash restart | Immediate stop/restart of the owned socket-only cluster preserves exact canonical contents of all 46 application tables. |
| Backup complete | pg_dump returns before the deliberately later after-backup job is written. |
| Restore before replay | Every table/full-row content matches pre-backup. Aggregate/per-table SHA-256 covers source contents, vector values, evidence/support, durable jobs, attempts and leases. The later job is absent. |
| Restored replay | Real drain publishes both sources with exact contents, one vector and one current evidence revision each. Pending/running jobs reach DONE at attempts 1/2. Completed work stays at attempt 1. |
| Twenty later sync replays | All 46 tables have an identical aggregate SHA-256 before/after: no vector values, evidence supports, source data, jobs or attempts change/duplicate. |

In-flight means persisted RUNNING intent whose worker was killed, not a live transaction during pg_dump. PostgreSQL interruption verifies committed fixtures; uncommitted transaction recovery and backups under live concurrent writes are not claimed. The dump includes actual native pgvector rows; uploads, secrets and hosted systems remain untested.

## Final measured observations

| Measurement | Observed |
| --- | --- |
| 100 outbox jobs / ten workers | 100 complete; 17.585 ms excluding enqueue |
| Outbox p50 / p95 | 1.575 / 2.692 ms |
| Ten distinct actual ingestion calls | 18.818 ms; all ten published |
| Ten contending actual calls, one source | 6.712 ms including verification; one embedding/index attempt |
| Database interruption/restart/content verification | 498.042 ms |
| Backup/restore/full-content verification | 413.949 ms |
| Restored intent replay and verification | 203.810 ms including child startup/idempotency |
| Post-backup data loss | One deliberately later job absent |
| Additional external spend | ₹0 |

These are one tiny local synthetic run, not sustained capacity/latency estimates. Retained stopped cluster: /var/folders/ft/53mtqdys19sgzwlht8kvvg8r0000gn/T/exp28-29-rNSiqC. All owned workers exited by SIGKILL at their checkpoints; cluster stopped in finally. Raw SQL diagnostics remain local and Git-ignored. Evidence: jest.json/jest.log, load.json, ingestion.json, recovery.json, checksums.json, restore-replay.json. Runbook: scripts/exp28-29/README.md.

## Launch blockers and limitations

Production scheduling/monitoring are unproved: local-scheduler.ts explicitly never registers an app service. Outbox delay caps at an hour, but attempts have no terminal cap; assign alerts, backlog/expired-lease recovery and a poison-job policy. Lease tokens fence acknowledgements; real provider idempotence/long-running effects remain untested. rate-limit.ts is process-local, so distributed admission remains unproved. No production scheduler, alert, hosted backup, credential or payment configuration was changed.

HTTP authentication/session concurrency, real chat/provider latency, sustained saturation, production-volume recovery, backup retention/security, uploads/secrets, hosted cutover and deployment rollback need further authorized validation. Persona rollback is an append-only audited release rollback, not schema/database downgrade. The accepted ten-user and one-working-day recovery/up-to-24-hour recoverable-data-loss targets remain unproved planning targets. TypeScript was transpiled without diagnostics; no whole-repository typecheck/full build was run. No push/deploy, real provider call, production access, external spending, shared TCP port or unrelated process kill occurred.
