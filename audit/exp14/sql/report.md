# EXP14 native SQL verification and prompt-budget follow-up

Follow-up to original tested commit `aef201079e79e658ccfc84853642cfe8b638ed61`, on the same EXP14 branch/worktree. Base schema remains `c83bf907898d8a1ffc257888f5800f27a210e1d2`; no EXP16 schema changes, source extractor/publisher edits, migrations authored, generated clients, dependencies or builds. Existing base migrations were applied only to the new disposable database.

## Actual execution boundary

Independently initialized synthetic PostgreSQL cluster: `/tmp/experthub-exp14-task4-pg55438`, loopback `127.0.0.1:55438`, database `experthub_exp14_test`, synthetic role `exp14synthetic`. Installed PostgreSQL/pgvector only. `database-metadata.json` records exact versions, port/role/database and applied migration count. The runner checks port availability, refuses an already-running cluster or symlink, sets only this exact local URL, disables dotenv, and stops its owned cluster on exit. Every destructive synthetic fixture reset checks exact database/port/role before TRUNCATE. Canonical, staging and production data/URLs are untouched.

`setup.cjs` removes external provider credentials and blocks all fetch; embeddings are fixed in-process 1536-dimensional synthetic vectors. Real PostgreSQL keyword/vector searches, source publication transactions, revision/span/decision joins, tenant/audience gates and temporal resolution run through the actual application code. No model reranker, generated-model response or network/provider call ran. SQL test timings include mock embeddings plus disposable local SQL; they are not production latency estimates.

## Native coverage and new fix

**10/10 native SQL tests pass.** `jest.json`, `jest.log` and `traces.json` preserve results and exact typed evidence. The tests cover independent literal source variations: DeltaLake periods; Aerospike opposite-polarity sources; NATS documented decision fields; Pebble/RocksDB source-declared replacement under a warm scope and entitlement downgrade; DuckDB hidden/edit/delete/as-of/foreign-scope revocation; MeteorDB lexical noise; missing NebulaSQL history; LMDB deterministic ties at a fixed valid-time point; oversized GiantStore evidence; VoltDB prompt injection; JetStream projection loss; 102-source candidate saturation. These are handwritten synthetic fixtures beyond the original single rare-keyword saturation reproduction, not a trained or semantic/general-quality evaluation.

The first native run exposed full-row serialization crowding opposing evidence and effective supersession support out of the prompt budget. `before-fix-jest.json/log` retain the failed run. The fix compacts only the prompt: redundant transport chunk IDs, duplicate recorded timestamps, uploader IDs and null-valued fields are omitted; the **full typed bundle retains all original provenance and nulls**. Header rules explicitly treat source text/reasons as untrusted data. Missing fields remain unknown. Opposing native stance records and their inferred relation now fit and are asserted inside the actual prompt. No model-level attack resistance is claimed.

Record selection reserves 1024 bytes; relation serialization can use 256 of that reserve, leaving 768 bytes for bounded gap notes. Overall source evidence plus rendered gaps remains below the fixed 4096 UTF-8-byte/token upper bound. Candidate/record/hop caps and contract `intent-evidence-v1` are unchanged. Oversized records and candidate saturation report truncation rather than silently asserting exhaustive coverage.

Additional offline checks after the fix: **28/28 tests across 3 focused suites**, including original EXP14 selection/service checks and actual chat-engine access/history/bundle wiring. TypeScript exits 0; focused lint and whitespace checks pass. Original full-suite evidence of 957/957 belongs to the prior implementation snapshot; no full build ran in this follow-up. Updated per-intent traces and narrow offline comparison reflect compact serialization, still without model/database-serving quality claims.

## Existing negative-decision projection limitation

`projection-limitation.json` is a minimal real-SQL regression with exact source, persisted stance, raw EvidenceSpan, absent EvidenceDecisionCase and resulting retrieval trace:

- Positive: `In messaging, For small teams, I prefer JetStream because capacity; constraints: two engineers; exceptions: audited workloads.`
- Negative: `In messaging, For small teams, I do not prefer JetStream because maintenance; constraints: two engineers; exceptions: audited workloads.`

EXP13's literal extractor assigns `decisionType=null` to `do not prefer`. The existing publisher creates a decision case only when decisionType is non-null. The negative raw span therefore contains explicit reasons/constraints/exceptions but its retrieved structured fields are null; the positive case stores its fields. The timeline groups null versus explicit constraints separately, so it returns both source-backed positions without manufacturing a contradiction relation across those structured groups. Retrieval does not infer missing negative fields or rewrite this behavior. The new regression asserts the limitation rather than hiding it or claiming broad counterevidence completeness.

Proposed narrow follow-up for parent review: persist negative-preference decision fields under an explicitly versioned literal extraction/projection contract (for example, giving supported negative recommendations the appropriate recommendation case type), then test idempotent publication/rebuild and current-source CAS/revocation semantics using approved synthetic sources. Review extractor-version/backfill behavior before changing stored projections. No shared extractor, publisher, schema or data migration was changed in this lane.

## Remaining gaps

Pattern-based English routing, lexical anchors, exact rather than semantic near-duplicate clustering and bounded literal graph relationships remain limited. Saturation can omit relevant evidence beyond the manifest/span caps; no exhaustive counterevidence claim. Missing historical/negative decision fields remain unknown. Real generated-answer faithfulness, source-injection obedience, semantic paraphrase retrieval, broad independent recall/precision and serving latency remain untested. Existing EXP13 human review remains pending. The native access regressions cover warm downgrade and sequential live source revocation; they do not prove every race between retrieval completion and delivery.

Integration owner should cherry-pick this new commit after `aef2010`, preserving the existing read interfaces. No install, generation or new migration is needed. To reproduce SQL evidence, use `bash scripts/exp14/run-sql.sh`; it owns and stops only the disposable 55438 cluster. Final `pg_ctl status` reports no server running.
