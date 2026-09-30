# ExpertHub Phase 0 implementation handoff

Canonical checkout: `/Users/rikteshs20/Documents/Codex/2026-09-30/task-3/experthub`.
Branch: `phase0-faithful-twin`. Original source commit: `5a723b6bf7c7e0d8d02cab6279d786b63a73307e`.

## Verified results

Static audit and bounded implementation retain existing inputs and stack. No production DB connection, real visitor fixtures, hosted model/API calls, remote write, push, PR, or deployment occurred. Node v26.5.0 / npm 11.17.0; locked packages installed with lifecycle scripts disabled, then the locked Prisma client generated with an unreachable synthetic PostgreSQL URL. No migration, seed, DB push or application server executed.

| Check | Original baseline | Current |
|---|---:|---:|
| Full Jest | 608 passed / 620; 12 failed | 676 passed / 688; 12 failed |
| Dedicated Phase0 Jest | absent | 70/70 passed, 12 suites |
| TypeScript | 41 diagnostics | same 41 diagnostics (line shifts only) |
| Next lint | clean | clean |
| git diff whitespace | n/a | clean |

The twelve failing test names match the baseline exactly. They concern pricing defaults/subscriptions, trending expectation and the pre-existing source-display assertion. Full-suite success is **not** claimed. Existing route tests were adapted to the shared lifecycle boundary; separate service tests exercise the actual lifecycle implementation. Two old prefix-memory tests were replaced by exact keyed-memory coverage, giving a net increase of 68 full-suite tests. No new source diagnostics appeared; baseline types fail in existing test code/helpers/mocks.

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

Evidence: ten lifecycle regressions plus three indexer regressions cover create/replay/edit/reordered index completion/delete/unpublish/error/retry/tenant isolation/staging. Important unchecked items: real overlapping DB transactions and post upsert races; durable job/outbox retry; orphan-vector cleanup retry after a row has already been deleted. A cleanup failure is safe for serving (manifest revoked) but no durable cleanup queue exists. An existing source can be retried through the update path; this is not a background recovery system. These acceptance items remain open, rather than being silently treated as complete.

### EXP10 — recent conversation and isolated memory

Subscriber and widget routes fetch newest 20 ordered by `(createdAt DESC, id DESC)` and reverse into chronological prompt order. They retain source metadata for permission rechecks. Tests contrast the frozen old >50-message behavior with latest-correction selection, deterministic timestamp ties and both route histories.

`memory-manager.ts` hashes subscriber + expert + category + normalized complete fact into a unique memory key. Exact retries are idempotent; shared prefixes and equal facts belonging to different experts/users cannot collide. Legacy unkeyed memories are excluded. `memory-extractor.ts` sees only the visitor's message, not the assistant reply, and instructs quoted/hypothetical/other-person text not to become visitor memory. Semantic correction/conflict resolution is deferred to the later evidence-memory redesign.

`widget-identity.ts` issues a server-generated visitor ID and HMAC token bound to the widget configuration, using existing `AUTH_SECRET`; arbitrary client visitor IDs cannot reopen another anonymous history. Embed JavaScript persists the returned ID/token. Subscriber memory remains authenticated-only; widgets use isolated conversation history without pretending anonymous IDs are subscriber identities. Missing signing secret fails closed.

Evidence: conversation and memory regressions cover latest history, ordering, both routes, visitor-token forgery/config isolation, full-fact uniqueness, retry and user-only extraction. Real browser persistence, multi-instance deployment and concurrent DB upserts are not measured.

### EXP11 — honest hybrid retrieval

`retriever.ts` runs keyword retrieval independently of query embedding success and includes keyword-only evidence in the rerank candidate budget; authorized IDs are deduplicated. Embedding failure uses keyword fallback. `embeddings.ts` rejects missing key, HTTP failures, model mismatch, wrong dimensions, nonfinite and zero vectors; fabricated hash embeddings are removed. `indexer.ts` requires tenant/source/version identity and embeds all chunks before writing. Semantic query and upsert check the fixed embedding contract (`text-embedding-3-small`, 1536).

Optional diagnostics expose vector availability, candidate counts and retrieval time. `synthetic-latency.json` compares 100 mocked in-process runs: baseline median 0.015958 ms / p95 0.033125 ms, Phase0 median 0.019125 ms / p95 0.029500 ms. This measures the mock harness only; it cannot establish database/provider latency or production performance. Model/dimension mismatch, outage fallback, keyword-only survival, dedup and missing scope regressions pass.

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

## Local hosted-model test proposal (not implemented)

Production provider remains unchanged. Existing production code hardcodes OpenAI chat/helper/reranker/embedding endpoints; environment names are `OPENAI_API_KEY` and optional `OPENAI_MODEL`. A free chat provider is not compatible merely by substituting that key.

For a later explicitly configured local harness, accept separate `LOCAL_TEST_CHAT_BASE_URL`, `LOCAL_TEST_CHAT_MODEL`, and `LOCAL_TEST_CHAT_API_KEY` from the user's local secret configuration; never print the secret or persist it in fixtures. Explicit opt-in, an allowlisted endpoint/model, synthetic source snapshots only, maximum requests/tokens, bounded timeouts, and no fallback provider/paid model are required. Record endpoint/model/version/budget and source split with the run. Groq chat can be evaluated independently; retain mocked embeddings initially because no Groq embedding path is implemented. Strict structured-output testing should be non-streaming and without tools. Do not alter production environment variables, migrate embeddings, or interpret a free-tier label as a guarantee against all future billing. Parent handles provider setup confirmation; no credentials or external calls occurred here.

## Remaining handoff

The local implementation and mock verification are ready for review. Do not deploy before isolated migration/duplicate preflight, controlled reindexing, real DB concurrency/recovery tests, browser token integration and resolution of the stated open acceptance items. Baseline pricing/type/test defects remain separate work. Phase0 improves source/retrieval integrity; it does not yet implement assertion provenance, temporal person memory, decision cases, a grounded generation verifier, or demonstrate human-like person fidelity. Those later phases remain separate decisions.
