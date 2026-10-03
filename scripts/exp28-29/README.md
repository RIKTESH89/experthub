# EXP28 recovery and EXP29 synthetic reliability

Run from the isolated worktree root:

```sh
node scripts/exp28-29/run.cjs
```

Requirements: existing read-only node_modules containing the frozen Prisma client, Node, PostgreSQL 18 with pgvector, and permission for PostgreSQL shared memory. No installation, client generation or build is performed. `EXP28_PG_BIN` can select another installed PostgreSQL binary directory. The runner never takes a target database URL: it overwrites DATABASE_URL/DIRECT_URL, clears inherited PostgreSQL settings, initializes a unique temp cluster and opens only its private Unix socket. Trust authentication is for disposable synthetic data only.

Ownership: this lane owns scripts/exp28-29 and audit/exp28-29. Application lifecycle, persona, access, payment, chat and schema files are read-only. The billing lane's new migration is deliberately absent from this frozen-commit harness.

## Recovery sequence and contracts

1. Create owned cluster and synthetic database; deploy existing migrations without generating a client.
2. Execute bounded outbox/guard scenarios. The 100-job / ten-worker batch calls real enqueueLifecycleJob/runLifecycleJob with a synthetic index callback; it measures SQL claim/ack, not ingestion.
3. Execute actual ingestion in ingestion.integration.ts: syncKnowledgeItem, chunking, indexDocument, native pgvector writes, source-manifest CAS, evidence/temporal publication and drainLifecycleJobs run unchanged. Only generateEmbedding returns deterministic nonzero 1536-dimensional synthetic values; real validation/model identity execute. Test ten sources concurrently, ten contending calls on one source, replay, embedding failure/backoff and missing-job reconciliation. Fetch rejects external calls.
4. Start owned IPC children through native-worker.cjs. SIGKILL only those children after vector commit before publication, and after atomic publication before DONE ack. Recover expired RUNNING intent with a controlled clock; assert no duplicate vectors/evidence. A newer source revision fences old work and cleans orphan vectors. Tests have 20-second deadlines, subprocesses 120 seconds, IPC checkpoints 10 seconds.
5. Prepare the backup boundary: completed published work; PENDING job at attempt 0 with no vector; killed worker's RUNNING job at attempt 1 with a committed vector and unpublished source. No worker remains alive. Capture every table's canonical full-row JSON. Immediately stop/restart only the owned cluster and compare exact contents. This verifies committed-fixture crash recovery, not in-flight SQL transaction recovery.
6. Produce a custom-format pg_dump. Only after dump completion, insert a later synthetic job. Restore into a new database with no destructive clean flags; compare all contents and SHA-256 digests and prove the later write absent. checksums.json includes aggregate/per-table digests and dump checksum, covering source contents, vector values, evidence/support and durable intent, not counts alone.
7. After restore equality, replay the actual drain in the restored database. Check saved PENDING/RUNNING states, attempts, vectors and source content, then DONE at attempts 1/2 with exact source/evidence publication. Previously completed work stays at attempt 1. Twenty more sync calls and a drain leave the SHA-256 of all application-table contents unchanged; restore-replay.json retains the assertions and hashes. RUNNING denotes persisted interrupted intent, not a live transaction during pg_dump.
8. Stop only this owned cluster in finally. Print its retained directory; snapshot.dump remains inside. No automatic recursive deletion is performed. Confirm the server is stopped and inspect ownership before manually deleting disposable data.

Every subprocess writes a diagnostic log under audit/exp28-29. Nonzero exit means failed/incomplete; inspect failure.txt and the named log. recovery.json is written only after all recovery assertions pass; failure.txt is removed on success. Summaries can remain from a prior run after failure: require exit 0, successful jest.json and absence of failure.txt. ingestion.json contains observations, not an independent suite result. Each run creates a new cluster and overwrites evidence. Never repoint this runner at hosted or production data.

Persona rollback uses releasePersona with owner, operationKey, expectedHead and rollbackTo: rollback appends a release, preserves source rows, and requires current source pins. It is not database restore or schema downgrade. Backups must be restored to an isolated target and reviewed before any real cutover; real cutover is outside this authorization.

## Interpretation and launch blockers

These timings use tiny synthetic SQL fixtures. reliability.integration.ts mocks vector effects; ingestion.integration.ts and restore replay use native pgvector with synthetic embeddings. They exclude HTTP, chat inference, network, real provider latency, saturation and production volume. Ten workers or application-function calls do not demonstrate ten concurrent users. One-working-day recovery / up-to-24-hour data loss are unvalidated planning targets. Restore demonstrates loss of one post-backup write, not a 24-hour backup policy.

Before launch, assign and validate a production worker/scheduler with monitoring, backlog alarms, expired-lease replay and a poison-job policy. local-scheduler.ts is explicitly never registered as an application service. outbox.ts retries with delays capped at one hour but has no terminal attempt limit; repeated failures need operator visibility. Lease tokens fence acknowledgements, not all remote side effects: long-running workers require idempotent provider operations and realistic crash tests. rate-limit.ts uses process memory and does not establish a distributed admission limit. Confirm backup retention, secure backup storage, object/upload coverage, secret recovery, vector rebuilding and deployment rollback against the intended infrastructure. No billing-recovery conclusions are made here.

The dedicated Jest transform transpiles TypeScript without diagnostics; these are runtime integration assertions, not a whole-repository typecheck. No full build was run to avoid shared client/build races. No push, deploy, real provider call, production access, credential change, external spend, shared-port use or unrelated process kill occurred.
