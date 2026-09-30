# ExpertHub Phase 0 implementation handoff

Canonical checkout: `/Users/rikteshs20/Documents/Codex/2026-09-30/task-3/experthub`.
Branch: `phase0-faithful-twin`. Original source commit: `5a723b6bf7c7e0d8d02cab6279d786b63a73307e`.

## Verified results

Static audit and bounded implementation retain existing inputs and stack. No production DB connection, real visitor fixtures, hosted model/API calls, remote write, push, PR, or deployment occurred. Node v26.5.0 / npm 11.17.0; locked packages installed with lifecycle scripts disabled, then the locked Prisma client generated with an unreachable synthetic PostgreSQL URL. No migration, seed, DB push or application server executed.

| Check | Original baseline | Current |
|---|---:|---:|
| Full Jest | 608 passed / 620; 12 failed | 709 passed / 721; 12 failed |
| Dedicated Phase0 Jest | absent | 103/103 passed, 16 suites |
| TypeScript | 41 diagnostics | same 41 diagnostics (line shifts only) |
| Next lint | clean | clean |
| git diff whitespace | n/a | clean |

The twelve failing test names match the baseline exactly. They concern pricing defaults/subscriptions, trending expectation and the pre-existing source-display assertion. Full-suite success is **not** claimed. Existing route tests were adapted to the shared lifecycle boundary; separate service tests exercise the actual lifecycle implementation. Two old prefix-memory tests were replaced by exact keyed-memory coverage, giving a net increase of 101 full-suite tests. No new source diagnostics appeared; baseline types fail in existing test code/helpers/mocks.

## Per-issue implementation and evidence

### EXP7 — reproducible baseline

`audit/phase0/frozen/manifest.json` freezes the original commit and file hashes. Original retrieval/embedding/message-route source snapshots are exercised by `__tests__/phase0/baseline-reproductions.test.ts`: old retrieval loses keyword-only evidence under vector budget saturation, missing embedding credentials generated fabricated vectors, and original earliest-50 query misses the latest correction. `fixtures.ts` defines two synthetic experts and whole-source 2025 training / 2026 holdout snapshots. `offline-setup.cjs` uses an unreachable synthetic DB URL, removes external-service credentials, and rejects unmocked fetch.

This establishes deterministic implementation tests, not measured person faithfulness, naturalness or model quality. Heldout fixtures and source/time partitions exist; no real generative evaluation was run.

### EXP8 — current tenant and audience authorization

`src/lib/knowledge/access.ts` resolves current entitlement and source rows on every retrieval. Unknown publication stays owner-only. Current public post evidence must be published, visible and RAG enabled; premium evidence requires active PREMIUM with valid expiry. Manifest version must match the source revision; copied post body/title must match the live post. Permission resolution failures stop generation. `src/lib/vector/client.ts` constrains tenant namespace, allowed vector IDs and expert metadata in SQL **before** rank/LIMIT. Missing scope fails closed.

`chat-engine.ts` excludes legacy unrestricted graph context and inferred personality summaries from visitor prompts. These legacy derivatives lack auditable audience lineage; disabling their use is an intentional temporary capability reduction. Owner settings/greeting remain the existing explicit configuration surface. Source citations and historical assistant messages are filtered against the current manifest. `shared-access.ts`, shared APIs and shared server page revalidate anonymous eligibility, including after revocation; legacy/unknown/owner-generated answers cannot be publicly shared.

`post-access.ts` applies the same live policy to direct post reads; list/trending/expert-profile/feed/bookmark queries constrain eligibility before returning bodies, and anonymous search excludes premium bodies. This closes the independent source-body bypass found during verification. Admin moderation endpoints remain existing administrative functionality and were not redesigned.

Evidence: `access.test.ts`, `chat-engine.test.ts`, `shared-access.test.ts`, `post-access.test.ts`, `vector-store.test.ts`. Two experts × anonymous/ordinary/entitled/owner, draft/hidden/premium denial, expiry fields, downgrade and permission failure are covered with mocks. Actual PostgreSQL relation/query behavior and browser end-to-end access remain unrun.

### EXP9 — source lifecycle

`knowledge/lifecycle.ts` centralizes create/edit/retry/delete and post create/edit/toggle/delete integration. Existing PDF/blog/manual inputs remain unchanged. Source identity has a unique expert/type/source-ID key; source revisions, published index revision and error state are explicit. Index publication uses a compare-and-set on the source version, and stale completed work cannot publish its manifest. Versioned tenant-qualified vector IDs and atomic vector writes prevent partial staged embeddings from becoming an authorized source. Current manifests make old vectors unreachable even before physical cleanup. Post event handling rereads current source rather than trusting an event payload. Editing a copied post source directly is rejected; edit the original post.

Schema/migration adds `sourceVersion`, `indexedVersion`, `indexingError`, unique source identity, memory key and widget source citations. Migration is additive and **not applied**. Existing duplicate post copies must be reconciled first; it intentionally fails instead of choosing/deleting a record. Legacy index revisions stay inaccessible until controlled reindexing.

Evidence: ten lifecycle regressions plus three indexer regressions cover create/replay/edit/reordered index completion/delete/unpublish/error/retry/tenant isolation/staging. Follow-up closes the mock-verifiable durable outbox and deleted-source cleanup gaps. `outbox.ts` persists deterministic jobs, CAS claims with lease tokens, expired-lease recovery, exponential backoff capped at one hour, and independent cleanup. Deletion locks the source row, rereads its final manifest and commits cleanup work together with row deletion. Cleanup survives source removal, excludes current manifest IDs, and can be rearmed if a late worker recreates orphan IDs. Index jobs record planned IDs before embedding; replay of a deleted/stale source queues those IDs for cleanup. Publication and old-vector cleanup enqueue share one transaction.

Post creation, edit and RAG toggle now commit `POST_SYNC` events with the mutation (`withPostOutbox`); newer events invalidate an old lease and force replay from the current post. The bounded `POST /api/knowledge/retry` endpoint authenticates the owner, derives their expert identity server-side, reconciles unindexed rows and drains up to 20 due jobs. No unauthenticated endpoint or production scheduler is enabled. Scheduled invocation of the service and actual DB transaction/row-lock behavior remain unverified. Crash recovery, backoff, foreign claims, lease replacement, source-delete cleanup, persistence failures, duplicate events, current-vector protection and route authorization are tested in `outbox.test.ts` and `recovery-route.test.ts`. Real overlapping transactions/post upsert races and the local scheduler with a real database still require isolated integration testing before rollout.

### EXP10 — recent conversation and isolated memory

Subscriber and widget routes fetch newest 20 ordered by `(createdAt DESC, id DESC)` and reverse into chronological prompt order. They retain source metadata for permission rechecks. Tests contrast the frozen old >50-message behavior with latest-correction selection, deterministic timestamp ties and both route histories.

`memory-manager.ts` hashes subscriber + expert + category + normalized complete fact into a unique memory key. Exact retries are idempotent; shared prefixes and equal facts belonging to different experts/users cannot collide. Legacy unkeyed memories are excluded. `memory-extractor.ts` sees only the visitor's message, not the assistant reply, and instructs quoted/hypothetical/other-person text not to become visitor memory. Semantic correction/conflict resolution is deferred to the later evidence-memory redesign.

`widget-identity.ts` issues a server-generated visitor ID and HMAC token bound to the widget configuration, using existing `AUTH_SECRET`; arbitrary client visitor IDs cannot reopen another anonymous history. Embed JavaScript persists the returned ID/token. Subscriber memory remains authenticated-only; widgets use isolated conversation history without pretending anonymous IDs are subscriber identities. Missing signing secret fails closed.

Evidence: conversation and memory regressions cover latest history, ordering, both routes, visitor-token forgery/config isolation, full-fact uniqueness, retry and user-only extraction. Real browser persistence, multi-instance deployment and concurrent DB upserts are not measured.

### EXP11 — honest hybrid retrieval

`retriever.ts` runs keyword retrieval independently of query embedding success and includes keyword-only evidence in the rerank candidate budget; authorized IDs are deduplicated. Embedding failure uses keyword fallback. `embeddings.ts` rejects missing key, HTTP failures, model mismatch, wrong dimensions, nonfinite and zero vectors; fabricated hash embeddings are removed. `indexer.ts` requires tenant/source/version identity and embeds all chunks before writing. Semantic query and upsert check the fixed embedding contract (`text-embedding-3-small`, 1536).

Optional diagnostics expose vector availability, candidate counts and retrieval time. `synthetic-latency.json` records a baseline/Phase0 comparison of 100 mocked in-process runs per variant. Timings are harness snapshots and vary on rerun; inspect the saved JSON for the final run. They cannot establish database/provider latency or production performance. Model/dimension mismatch, outage fallback, keyword-only survival, dedup and missing scope regressions pass.

## Exact verification commands

Run from the canonical checkout:

```sh
npm ci --ignore-scripts --no-audit --no-fund --fetch-timeout=30000 --fetch-retries=1 --cache /tmp/experthub-npm-cache
DATABASE_URL=postgresql://synthetic:synthetic@127.0.0.1:1/phase0 DIRECT_URL=postgresql://synthetic:synthetic@127.0.0.1:1/phase0 node node_modules/prisma/build/index.js generate
node node_modules/jest/bin/jest.js --runInBand --setupFiles ./audit/phase0/offline-setup.cjs --json --outputFile audit/phase0/current-jest.json
node node_modules/jest/bin/jest.js --runInBand --setupFiles ./audit/phase0/offline-setup.cjs --testPathPattern __tests__/phase0 --json --outputFile audit/phase0/phase0-jest.json
node node_modules/typescript/bin/tsc --noEmit --incremental false
NEXT_TELEMETRY_DISABLED=1 node node_modules/next/dist/bin/next lint
git diff --check
```

Baseline/current JSON and logs are adjacent to this report. Output redirection was used to save logs. Installation downloaded only locked repository dependencies; Prisma fetched its locked engine once. No new provider or test dependency was added.

## Local hosted-model test harness (implemented; network run deferred)

Production provider remains unchanged. Existing production code hardcodes OpenAI chat/helper/reranker/embedding endpoints; environment names are `OPENAI_API_KEY` and optional `OPENAI_MODEL`. A free chat provider is not compatible merely by substituting that key.

`scripts/local-test/groq-synthetic.cjs` is separate from production code and only accepts two fixed synthetic fixtures. Allowlist: `https://api.groq.com/openai/v1`, `openai/gpt-oss-120b`. Cap: two requests, each at most 256 output tokens, 15-second timeout, zero retries/fallback. It validates nonstreaming strict JSON schema and evidence IDs; no tools, application data, private source or embeddings are used. Nine mocked adapter cases pass. This validates transport/schema behavior, not model fidelity or free account status.

Credential-free template: `scripts/local-test/groq.env.example`. At the user's later explicit request, the actual repository-root `.env.local-test-groq` was created exclusively with a blank key and mode 0600. `git check-ignore` confirms ignored and `git ls-files` confirms untracked; existing files would not be read/overwritten. Names: `LOCAL_TEST_GROQ_API_KEY`, `LOCAL_TEST_GROQ_BASE_URL`, `LOCAL_TEST_GROQ_MODEL`. User enters their own key locally and confirms only configuration completion, never the key. After parent authorizes the bounded synthetic run: `node scripts/local-test/groq-synthetic.cjs --allow-synthetic-network`. Without that flag it makes no network request and does not load the secret file. No smoke run occurred. User must confirm free-tier/no-billing status in Console; an endpoint/model allowlist cannot establish account billing state.

## Remaining handoff

The local implementation and mock verification are ready for review. Do not deploy before isolated migration/duplicate preflight, controlled reindexing, real DB concurrency/recovery tests, browser token integration and verification of the stated integration acceptance items. Baseline pricing/type/test defects remain separate work. Phase0 improves source/retrieval integrity; it does not yet implement assertion provenance, temporal person memory, decision cases, a grounded generation verifier, or demonstrate human-like person fidelity. Those later phases remain separate decisions.


## Local integration availability and exact blockers

Read-only inspection found no `psql`, `postgres`, `initdb` or `docker` on PATH, no PostgreSQL/Docker application at the inspected standard locations, and no Playwright/Puppeteer package in locked dependencies. Process inventory was unavailable (`pgrep: Cannot get process list`); this is not proof no server exists elsewhere. No connection was attempted and no environment values were inspected.

To run the outstanding integration checks: provision/authorize a **new disposable** PostgreSQL instance with pgvector and a dedicated synthetic-only database; provide its isolated URL using a separate test secret, and authorize applying repository migrations solely there. Never reuse an existing application database. Install/provide explicitly approved browser test tooling/runtime if required, then start the app with synthetic auth/storage/provider stubs and a test-only signing secret. Verify duplicate-source preflight, transactional rollback and deletion-vs-publication row locking, two-worker lease/retry races, pgvector pre-ranking tenant filters, source updates/deletion/unpublish, signed widget browser persistence and permission downgrade. The local scheduler is mock-tested; its real database integration and production invocation remain unverified. None is deployed by this patch. These remain blocked on unavailable isolated tooling/services, rather than waived acceptance.


## Local scheduler follow-up

Automatic scheduler code was **missing** at commit `1d1fb7f`; it was not merely an unverified installed service. `src/lib/knowledge/local-scheduler.ts` now implements an explicitly started local runner with an injected drain function and clock. Native runtime clock is provided; importing the module starts no timer and connects to no database. Allowlist requires 1–10 explicit `synthetic-*` expert IDs; batch is 1–20 and interval at least one second. Duplicate IDs are removed. Sequential draining and a single active promise prevent overlap. Delayed ticks do one bounded pass rather than replaying every missed interval. Errors do not prevent remaining experts or future ticks. Shutdown cancels the timer, waits for current work and skips later experts. Restart requires a new runner and reads durable state through the drain dependency rather than an in-memory work cursor.

`local-scheduler.test.ts` adds six tests: invalid/empty allowlist and batch rejection; repeated start/delayed current-time tick; overlapping ticks/missed intervals; error continuation; shutdown cancellation/wait; new-instance restart using synthetic persisted drain state. Tests demonstrate scheduling behavior with mocks, not actual process-crash/DB durability. The local integration harness can inject `drainLifecycleJobs` only after the disposable DB/provider mocks are approved and configured. No process/service registration, OS cron, background daemon, production scheduler, new dependency, database start or provider call occurred.

Verification after this slice: dedicated 102/102 across 16 suites; full 708/720 with precisely the original 12 failures; same 41 baseline TypeScript diagnostics; clean lint and diff checks. Remaining scheduler blocker is isolated real-DB integration/runtime invocation; production scheduled deployment remains a separate decision.

## Authorized Groq smoke follow-up

After the user confirmed saved key and Free plan, the existing bounded harness was run once. Two synthetic responses succeeded, passed schema/model/evidence checks, and accurately restated Ada/Ben evidence; exit 0. No private data, tools, retries/fallback, production configuration changes or further requests. See `groq-smoke.md` for responses and the explicit latency-instrumentation limitation. Earlier statements that smoke was deferred describe the prior checkpoint; it has now passed this narrow access/schema check. DB/browser setup is still pending approval.


## EXP19 approved integration follow-up

The user approved Homebrew PostgreSQL/pgvector, pinned Playwright and a disposable localhost cluster. Completed **26/26** real DB/fresh-Chrome checks plus **1/1** actual cluster-restart cleanup proof. Concurrent memory upsert and initial outbox timestamp eligibility defects exposed by real DB testing were fixed. Offline Phase0 now **103/103**; full offline **709/721** with the same 12 baseline failures, unchanged 41 types, clean lint. Earlier statements that isolated tools/integration were unavailable describe prior checkpoints; those setup gates are now cleared. See `integration-report.md` for exact scope, artifacts, installations, fixes, shutdown confirmation and remaining limits. The existing Chrome/widget and actual route handlers were exercised through a test HTTP bridge with real Prisma/retrieval and mocked auth/model; full Next UI/OAuth and production deployment were not tested. All ephemeral processes stopped; database artifacts preserved and ignored. No additional Groq requests occurred.
