# EXP28 recovery and EXP29 synthetic reliability

Run from the isolated worktree root:

```sh
node scripts/exp28-29/run.cjs
```

Requirements: existing read-only node_modules containing the frozen Prisma client, Node, PostgreSQL 18 with pgvector, and permission for PostgreSQL shared memory. No installation, client generation or build is performed. `EXP28_PG_BIN` can select another installed PostgreSQL binary directory. The runner never takes a target database URL: it overwrites DATABASE_URL/DIRECT_URL, clears inherited PostgreSQL settings, initializes a unique temp cluster and opens only its private Unix socket. Trust authentication is for disposable synthetic data only.

Ownership: this lane owns scripts/exp28-29 and audit/exp28-29. Application lifecycle, persona, access, payment, chat and schema files are read-only. The billing lane's new migration is deliberately absent from this frozen-commit harness.

## Recovery sequence and contracts

1. Create owned cluster and synthetic database; deploy existing migrations without generating a client.
2. Execute bounded SQL integration scenarios: 10 contending claims, 100 jobs / 10 workers, failure/backoff, wrong tenant, persisted abandoned lease, stale worker, cleanup, rollback and guards. Each Jest test has a 20-second deadline; subprocesses have 120-second deadlines. No request uses a real provider; vector adapters are mocked and fetch rejects.
3. Capture canonical JSON for every public application table, sorted independently of physical row order. Immediately stop only this owned cluster, restart it, and verify exact equality. This exercises PostgreSQL crash recovery; abandoned worker recovery is separately simulated through persisted lease state and controlled time.
4. Produce a custom-format pg_dump; make one deliberately later synthetic write; restore into a new database, with no destructive clean flags; compare every table against the pre-backup snapshot and prove the later write is absent.
5. Stop only this owned cluster in finally. Print the retained cluster directory; snapshot.dump remains inside it. No automatic recursive deletion is performed. Inspect the printed directory and confirm the server is stopped before manually removing retained disposable data.

Every subprocess writes a diagnostic log under audit/exp28-29. Nonzero exit means failed or incomplete; inspect failure.txt and the named log. recovery.json is written only after recovery assertions pass, and failure.txt is removed on success. Existing summary files may be from a prior run if a new run fails; always require exit 0 and absence of failure.txt. The next run creates a new cluster and overwrites evidence. Never repoint this runner at hosted or production data.

Persona rollback uses releasePersona with owner, operationKey, expectedHead and rollbackTo: rollback appends a release, preserves source rows, and requires current source pins. It is not database restore or schema downgrade. Backups must be restored to an isolated target and reviewed before any real cutover; real cutover is outside this authorization.

## Interpretation and launch blockers

These timings include tiny synthetic SQL fixtures and mocked vector effects. They exclude HTTP, chat inference, network, real provider latency, resource saturation and production volume. Ten workers do not demonstrate ten concurrent users. One working day recovery / up to 24 hours data loss are planning targets, not validated service objectives. Restore loses writes after its snapshot; this harness demonstrates one such write, not a 24-hour backup policy.

Before launch, assign and validate a production worker/scheduler with monitoring, backlog alarms, expired-lease replay and a poison-job policy. local-scheduler.ts is explicitly never registered as an application service. outbox.ts retries with delays capped at one hour but has no terminal attempt limit; repeated failures need operator visibility. Lease tokens fence acknowledgements, not all remote side effects: long-running workers require idempotent provider operations and realistic crash tests. rate-limit.ts uses process memory and does not establish a distributed admission limit. Confirm backup retention, secure backup storage, object/upload coverage, secret recovery, vector rebuilding and deployment rollback against the intended infrastructure. No billing-recovery conclusions are made here.

The dedicated Jest transform transpiles TypeScript without diagnostics; these are runtime integration assertions, not a whole-repository typecheck. No full build was run to avoid shared client/build races. No push, deploy, real provider call, production access, credential change, external spend, shared-port use or unrelated process kill occurred.
