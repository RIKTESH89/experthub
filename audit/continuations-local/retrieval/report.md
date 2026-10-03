# EXP14 local retrieval handoff

Native SQL and prompt-budget follow-up: see `audit/exp14/sql/report.md`. The original remaining-native-validation gap below describes the initial commit; the follow-up documents real SQL coverage and the preserved negative-projection limitation.

Base `c83bf907898d8a1ffc257888f5800f27a210e1d2`; branch `codex/exp14-retrieval-task4-20261003`; worktree `/Users/rikteshs20/Documents/Codex/2026-10-03/task-4/exp14`.

Implemented a bounded, source-backed read path and wired actual chat evidence assembly to it. No schema, source publisher/extractor, permission policy, generated client, dependencies, release manifest or other lane changed. Parent approved chat-engine and its Phase0 test ownership. Existing installed dependencies are accessed through a read-only-use node_modules symlink; no install, setup, generation, remote/provider requests, database mutations, deployment, push or Linear state change occurred.

## Versioned read contract

`intent-evidence-v1` consumes existing `RetrievalScope`, `EvidenceTrace`, `TemporalStanceTrace`, `TemporalRetrievalResult`, `retrieveEvidenceTrace` and `retrieveTemporalEvidence`. EXP16 retains their shapes; correction/release manifests must never bypass current live source CAS/authorization. No stale release is read here.

The returned `EvidenceBundle` includes plan/intent/needs, exact source revision/span/source-version/hash identities, speaker/author/endorsement, publication/ingestion/valid timestamps, scoped decision fields, conflict relations, missing information, and bounded prompt plus diagnostic trace. Existing chat evidenceTrace/temporalTrace/sources fields remain available. Returned source bodies are selected exact-span text; raw chunks are not duplicated into the generation prompt. Citations and inferred relations contain only selected authorized supports. The legacy unprovenanced KnowledgeNode/KnowledgeEdge graph remains quarantined.

Routing recognizes factual, stance, decision, biography, comparison and greeting/conversational requests through deterministic English patterns. Explicit `As of YYYY-MM-DD` and typed TemporalQuery use EXP13 valid-time/knownAt selection. Current never means newest ingestion wins. As-of never resurrects retired or revoked source revisions. Assertions without valid-time information declare that gap; knownAt additionally filters their recorded time. Invalid explicit dates fail closed.

Existing semantic embedding and keyword search are bounded and interleaved; no new model reranker is called. Deterministic scoring combines lexical anchors, original bounded channel scores and visible assertion support. Exact duplicate spans retain attribution/context/valid-time distinctions and do not crowd out opposing polarity. Source-backed graph expansion is at most one hop through EXP13 conflicts/replacements or same documented domain/speaker/origin for decision cases. Constraints/exceptions remain attached to their source context. Topic absence produces a gap rather than generic expert beliefs. Comparison missing terms and absent decision situation/reasons/constraints/exceptions are explicit.

Live authorization executes before SQL retrieval through the existing gates, then manifest/tenant chunk checks run again before reranking and citations. Search outages expose fallback diagnostics; authorization/store failures propagate and stop generation. KeywordSearch's internal legacy per-method fallback does not report each SQL subquery failure; absence cannot establish exhaustive coverage.

## Fixed budgets and diagnostics

- At most 15 semantic and 15 keyword hits; 100 authorized source-chunk candidates total. Additional manifest candidates are selected in sorted deterministic ID order.
- At most 100 evidence ranking candidates, 12 selected records, 1 graph hop.
- 4096 UTF-8 bytes conservatively upper-bound byte-tokenizer evidence tokens. Record serialization reserves 1024 bytes for gap notes/assembly overhead; tokenUpperBound includes prompt plus rendered gap notes. This bounds source evidence context, not personality configuration, history, memories, optional web text, or generation output.
- Current store contracts separately cap authorized spans at 100 and assertion traces at 30. Reaching these caps is flagged conservatively. Candidate/context truncation is a gap, not proof no other position or conflict exists.
- Tie ordering uses stable evidence IDs. Supersession and contradictions are computed only from authorized source-backed rows. Budget pressure can omit a conflict endpoint; relation output then excludes that incomplete relation and reports truncation.

## Local evidence

Focused acceptance/regressions: **72/72 tests, 8 suites** (`audit/exp14/jest.json` and `jest.log`). Full offline suite: **957/957 tests, 58 suites** (`full-jest.json` and `full-jest.log`). TypeScript exits **0**; focused lint and diff whitespace are clean. TypeScript output: `types.log`; focused Next lint: `lint.log`. These commands use existing dependencies and mocks; no build ran. The full suite regenerated a Phase0 latency artifact inside this isolated worktree; it was restored to the base bytes and is not part of the change.

`intent-traces.json` records handwritten post-base synthetic fixtures for every routed intent, gaps and exact IDs. Unit coverage includes current/as-of differences, explicit dates, scoped constraints/exceptions/counterevidence, quote attribution, rare keywords, unknown-topic abstention, duplicate suppression, foreign/revoked neighbors/citations, fixed UTF-8/context/hop caps, observable search fallback and fail-closed permission errors. Actual chat-engine tests preserve the existing access/history assertions and additionally verify the sole bounded evidence prompt and gap delivery.

`offline-comparison.json` exercises the actual frozen Phase0 retriever with mocked vectors/keywords and no credentials against three queries over one rare-keyword saturation fixture, 50 repetitions each. Both use the same 4096-byte cap. Frozen recall/precision is 0/0 on this deliberately narrow reproduction; candidate is 1/1. Baseline context is 2670 byte/token upper-bound units; candidate has provenance and gap overhead recorded separately per query. Candidate local median CPU latency is higher; the JSON preserves measured deltas. Timings exclude SQL, network, embedding/model and streaming latency. These are regression evidence, not general retrieval-quality, human-fidelity or naturalness estimates. The synthetic fixtures were authored for tests, with no trained model or independent human judgment.

## Remaining acceptance gaps and integration notes

No execution blocker remains. This is a locally tested candidate, not a claim that every broad EXP14 acceptance criterion is empirically complete. The intent router is English/pattern based; semantic-only paraphrases without lexical evidence anchors can abstain. Diversity is exact-span/attribution/context deduplication, not semantic paraphrase clustering. Bounded sorted manifest expansion can miss evidence beyond the cap; graph relationships are literal EXP13 source-backed relations, not a semantic knowledge graph. Missing time/decision fields remain unknown and publication time does not become validity.

New orchestration tests mock authorized store output; native PostgreSQL joins and warm live entitlement/source-revocation races were not newly executed in this lane. Existing EXP12/13 native audit evidence remains relevant but is not presented as a new run. End-to-end model answer faithfulness, audience races between retrieval and delivery, token counts under arbitrary future tokenizers, broad held-out recall/precision and real serving latency require separate validation. Existing EXP13 human semantic-review gate remains pending. Do not mark EXP14 Done solely from this handoff.

Integration: cherry-pick the reported commit onto the parent's verified base. No migration/generation/install needed. Coordinate correction-release changes through the parent; intersect any future release candidates with current live scope and revision CAS. Keep the new chat facade mock in the Phase0 test; no source/auth/history assertions were removed. No full build slot was used.
