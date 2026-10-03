# EXP28 / EXP29 local findings

Frozen base: d8c4eb3acc2ee8a8595f3bc5bea67da763d48203. Isolated checkout: /Users/rikteshs20/Documents/Codex/2026-10-03/task-9/exp28-exp29. No repository AGENTS.md or .agents/skills was present. Existing integration dependencies were symlinked read-only; no client generation, installation or shared build was performed.

Executed `node scripts/exp28-29/run.cjs` successfully on the user's Mac. PostgreSQL initialization initially failed under the sandbox because shmget was prohibited; the explicitly scoped elevated local run succeeded. One fixture error (missing sourceType) was corrected before the final successful run.

Final result: eight runtime integration tests passed against disposable local PostgreSQL, existing migrations deployed, crash restart and restore matched all 46 application tables. Evidence: jest.json, jest.log, load.json, recovery.json. Retained stopped cluster: /var/folders/ft/53mtqdys19sgzwlht8kvvg8r0000gn/T/exp28-29-OKI8VB.

| Measurement | Observed |
| --- | --- |
| Ten simultaneous claims | One winner; 5.413 ms |
| 100 jobs / ten workers | 100 complete; 17.454 ms execution |
| Per-job p50 / p95 | 1.591 / 2.396 ms |
| Immediate database interruption, restart and verification | 623.959 ms |
| Backup, restore and verification | 410.171 ms |
| Post-backup data loss | One deliberately later row absent |
| Additional external test spend | ₹0 |

Load timings exclude fixture enqueue. PostgreSQL restart verified committed fixtures, not in-flight transaction durability. Worker interruption is simulated by a persisted abandoned lease; stale-worker overlap is exercised with two live promises. Cleanup's vector adapter is mocked; database revocation and outbox persistence are real. Persona rollback calls the existing release implementation against SQL and verifies audited lineage/source preservation. Guard tests verify stale revisions are excluded, unspecified audience is private, tenant claims are denied, rate-limit request eleven is rejected and scheduler limits refuse unsafe inputs.

Reviewed durable ingestion: publication and cleanup enqueue share a transaction; stale sourceVersion publication is gated; deletion locks source, retires evidence and persists cleanup before deleting. Current vector IDs are protected during cleanup. outbox acknowledgements use token/state CAS, attempts persist, five-minute leases can be reclaimed, and initial retry backoff is two seconds. No shared application fixes were made. The 100-job test exercises runLifecycleJob, not drainLifecycleJobs reconciliation or provider ingestion.

Launch blockers/limitations: production scheduler and operational alerting are unproved; attempts have no terminal cap; remote effects may duplicate after lease expiry; rate limits are process-local. Real-user chat/HTTP load, provider failure behavior, production-scale recovery, backup retention/security, upload/secret coverage and deployment rollback require further authorized validation. Payment algorithms and the coordinated billing migration were untouched. The ten-user target and 24-hour recovery/data-loss planning targets remain unproved. Runbook: scripts/exp28-29/README.md.
