# ExpertHub knowledge graph and digital twin audit

Audited 2026-09-30 at commit `5a723b6bf7c7e0d8d02cab6279d786b63a73307e`.
Canonical local project: `/Users/rikteshs20/Documents/Codex/2026-09-30/task-3/experthub`.

## Conclusion

The user's concern is supported by the code. ExpertHub has a real persistent RAG pipeline and a real PostgreSQL concept graph, but normal ingestion does not activate its graph hook. The graph has no source-backed assertions, revision lifecycle, ontology, or conflict handling. The digital twin is an expert persona assembled into an LLM prompt with retrieved content and subscriber memories. It does not yet encode a reliably synchronized, testable model of the expert's knowledge and decisions.

Keep Next.js, Prisma, PostgreSQL/pgvector, and the existing chat interface. The highest-value first milestone is **a versioned, evidence-backed expert knowledge twin**, with dependable ingestion, source retraction, typed relationships, traceable retrieval, and a small expert-reviewed evaluation set. Adding another database or a broad agent framework before these foundations would preserve the underlying weaknesses.

## Person-twin scope: same inputs, deeper fidelity

The clarified goal is a PERSON twin that feels natural and faithfully represents a specific expert. No new input channel is required or proposed. The physical-twin inventory later in this report is only a capability boundary, not a recommendation or implementation priority. This is a review and plan; no application implementation has been made.

### Exact existing input inventory

| Existing input | Current processing | Keep unchanged |
|---|---|---|
| Manual knowledge title/content + optional metadata | Text API; labels manual/document/post (`src/lib/validations/knowledge.ts:3–7`) | Same form/API, richer internal revisions and assertions |
| PDF upload | PDF MIME, 10MB maximum; text extraction, no scanned-document OCR (`src/app/api/knowledge/import/pdf/route.ts:34–55`; `src/lib/import/pdf-parser.ts:4–16`) | Same upload; preserve text layout/page anchors where extractable |
| Blog URLs | 1–20 URLs, Jina/direct text extraction (`src/app/api/knowledge/import/blog/route.ts:9–13`; `src/lib/import/blog-scraper.ts:10–22`) | Same URL import; retain author attribution and crawl/source dates |
| Expert posts | Title/content, RAG flag, visibility/status, tags and media (`src/lib/validations/post.ts:3–17`) | Same composer; index eligible text consistently |
| Expert twin settings | Personality, greeting, opinions, framework, boundaries, RAG toggle (`src/app/api/expert/twin-config/route.ts:73–94`) | Same fields; compile into versioned constraints/stance candidates |
| Expert profile and writing samples | Name/specialties/profile; personality analyzer reads knowledge and posts (`prisma/schema.prisma:99–119`; analyzer `:24–67`) | Same profile; ground persona features in representative passages |
| Subscriber messages, chat history, ratings | Text conversation, memory extraction, thumbs up/down (`message route:182–271`; rate route:66–71) | Same chat; separate subscriber facts from expert beliefs |
| Optional web augmentation | Existing web-search option (`src/lib/ai/chat-engine.ts:109–114`) | Keep available as external context, never attribute it as expert belief |
| Image/video/audio post attachments | Upload/storage/display supported (`src/app/api/upload/route.ts:6–16`); current RAG indexes post title/text, not attachment contents (`src/app/api/posts/route.ts:197–202`) | Retain attachments; do not claim current speech/image knowledge ingestion |

Published content can supply expressed beliefs, anecdotes, preferences and reasoning examples; it cannot reveal unexpressed beliefs, private memories, actual emotional state, or the person's entire cognition. Better extraction and synthesis make existing evidence more useful, but cannot fill those gaps honestly. Label the experience as an AI representation, and distinguish an expert's documented position from the twin's new synthesis.

## Scope and verification

This was static source inspection, not a running-system assessment. Clone integrity was verified with `git fsck --full`; all 386 tracked files were readable. No dependencies, repository scripts, tests, migrations, seed code, or application code were executed. No remote changes were made. Runtime setup remains pending; source setup is complete.

Read README, package manifest, schema, graph/extraction/retrieval modules, vector storage/indexing, chat engine and subscriber/widget paths, ingestion/edit/delete routes, personality/memory/scoring modules, relevant migrations and tests, and repository product memory. README is the uncustomized Next.js starter. No AGENTS.md or .agents skill directory was found in this checkout or task workspace. The only checked-in SKILL.md discovered is a UI/UX skill under .claude, outside this audit's scope. Product memory describes text-only RAG chat, consistent with implementation: [.claude product memory](../.claude/projects/-home-rikteshs20-Downloads-startup-v1-startup/memory/project_digital_twin_core.md).

Evidence below uses checkout-relative paths and line numbers at the audited commit. Missing capabilities are findings about this source snapshot, not claims about external services or other repositories.

## Implemented architecture

1. Expert content is stored as KnowledgeItem; manual content, PDF imports, blog imports, and opted-in posts have indexing paths. PDF parsing extracts text; blog fetching uses Jina with direct HTML fallback. Evidence: `prisma/schema.prisma:243–259`, `src/app/api/knowledge/route.ts:82–105`, `src/app/api/knowledge/import/pdf/route.ts:78–100`, `src/app/api/knowledge/import/blog/route.ts:82–104`, `src/app/api/posts/route.ts:190–215`, `src/lib/import/pdf-parser.ts:4–16`, `src/lib/import/blog-scraper.ts:10–22`.
2. Indexing splits text into overlapping 1,000-character chunks and embeds/upserts them sequentially. PostgreSQL stores vectors and metadata; this is persistent storage, not an in-memory mock. Evidence: `src/lib/vector/indexer.ts:5–33,40–50`, `src/lib/vector/client.ts:20–69`, `prisma/schema.prisma:613–624`.
3. Retrieval merges vector and keyword results, optionally LLM-reranks them, and selects five chunks. The keyword implementation uses PostgreSQL full-text rank plus ILIKE, despite the retriever comment calling it BM25. Evidence: `src/lib/vector/retriever.ts:10–74`, `src/lib/vector/client.ts:72–152`.
4. Chat loads expert settings, runs retrieval, optionally expands the graph, retrieves subscriber memories, optionally searches the web, assembles a persona/context prompt, and streams an OpenAI completion. Evidence: `src/lib/ai/chat-engine.ts:33–154`.
5. Subscriber chat persists answers and sources, logs interaction statistics, and asynchronously extracts memories. Widget chat uses the same engine but passes no subscriber identity and discards sources from the result. Evidence: `src/app/api/chat/sessions/[sessionId]/messages/route.ts:182–271`, `src/app/api/widget/chat/route.ts:83–101,138–169`.

## Findings, ordered by impact

### P0 — Normal ingestion misses graph population

`indexDocument` calls `addToGraph` only when `metadata.expertProfileId` exists (`src/lib/vector/indexer.ts:28–31`). All inspected production callers omit that field: manual create (`src/app/api/knowledge/route.ts:95–100`), manual edit (`src/app/api/knowledge/[itemId]/route.ts:112–120`), PDF (`src/app/api/knowledge/import/pdf/route.ts:90–95`), blog (`src/app/api/knowledge/import/blog/route.ts:94–99`), post create (`src/app/api/posts/route.ts:198–203`), and post toggle (`src/app/api/posts/[postId]/rag-toggle/route.ts:53–58`). Therefore these paths index vectors without activating automatic graph population. A user can explicitly invoke the graph POST endpoint (`src/app/api/expert/graph/route.ts:31`), so the graph is implemented but normally disconnected from ingestion.

Fix the service contract to require expert ID, source ID, and revision ID as typed arguments. Merely adding an optional metadata field would reconnect a fragile, unobservable hook without addressing lifecycle defects.

### P0 — Graph rebuilds are neither idempotent nor source-synchronized

The builder processes every knowledge item, overwrites existing node descriptions, and increments existing edge weights each run (`src/lib/graph/graph-builder.ts:7–34,57–75`). Repeating a rebuild inflates weight even when evidence is unchanged. The returned nodesCreated/edgesCreated values count upsert attempts rather than actual creations. No obsolete assertions are removed; no transaction makes an item contribution atomic. The incremental path duplicates this logic and silently swallows all failures (`:83–151`).

Knowledge edit/delete updates or removes vectors but has no graph invalidation (`src/app/api/knowledge/[itemId]/route.ts:96–125,166–174`). With no graph-to-source relation, deleting a source cannot retract its contributions. Manual rebuild also cannot prune previously extracted concepts or relations. Consequence: stale expert beliefs can survive correction or deletion and be presented as current knowledge.

### P0 — Post edits can leave the twin on old content

Post creation copies opted-in content into a KnowledgeItem and vectors (`src/app/api/posts/route.ts:190–215`), but normal post PATCH updates the Post and returns without updating that copy or its index (`src/app/api/posts/[postId]/route.ts:134–215`). This is a concrete state synchronization gap even before graph reasoning is considered. A source lifecycle service must cover post edits, visibility/RAG eligibility changes, deletion, and imports, as well as manual knowledge edits. A title-only knowledge edit also skips reindexing because the condition checks changed content only (`src/app/api/knowledge/[itemId]/route.ts:101–102`).

### P1 — Entity identity and ontology are weak

Nodes are identified by expert ID plus a lowercased label (`prisma/schema.prisma:550–563`; `src/lib/graph/graph-builder.ts:20–32`). This isolates experts in normal builder lookups, but does not resolve aliases, distinguish homonyms, assign entity types, or canonicalize whitespace/punctuation. "ML" and "machine learning" remain separate; two meanings of one label collapse. A description from the last processed source replaces prior descriptions, with no deterministic source ordering or conflict review.

Extraction asks for 3–8 short concepts and arbitrary verb-phrase relations, truncates content at 3,000 characters, and accepts parsed JSON without runtime schema validation (`src/lib/graph/entity-extractor.ts:3–25`; `src/lib/ai/openai.ts:52–57`). Valid JSON can still have malformed or invented values. Long sources lose graph coverage beyond the prefix. There is no type system, predicate vocabulary, explicit stance, negation, conditions, confidence, or evidence-span requirement.

Use a small domain vocabulary first: Expert, Concept, Method, Tool, Claim, Scenario; predicates such as RECOMMENDS, OPPOSES, USES, REQUIRES, APPLIES_TO, CONTRADICTS. Validate predicate endpoint types. Keep stable entity IDs and reviewed aliases; avoid treating fuzzy matches as automatic identity merges.

### P1 — Provenance and time stop at the document layer

KnowledgeItem has source type/id, metadata, createdAt and updatedAt (`prisma/schema.prisma:243–254`), but these are not revision history. Graph nodes have only createdAt and an optional vectorId; the builder never sets vectorId. Edges contain endpoints, relationship, and weight, with no timestamps or source references (`:550–578`). Neither graph builder passes document/chunk provenance into persistence.

There is no assertion-level source revision, quote/span, extractor/model version, observed time, effective validity interval, approval status, supersession, or contradiction representation. Vector metadata retains some document IDs/URLs, but graph context is an untraceable generated description. PDF whitespace flattening also loses page/paragraph structure (`src/lib/import/pdf-parser.ts:7–16`). Preserve original source location alongside normalized text before promising fine-grained citations.

### P1 — Graph traversal provides related prose, not relationship reasoning

Seeds are matched from words longer than four characters in the first 150 characters of retrieved chunks, not entities resolved from the question (`src/lib/graph/graph-retriever.ts:22–51`). Short terms like AI and ML cannot seed this path. Chat skips graph retrieval entirely when vector retrieval is empty (`src/lib/ai/chat-engine.ts:82–94`).

The recursive SQL is real and parameterized despite its Unsafe API name. It follows edges in both directions, checks expert scope on next nodes, and prevents path cycles (`src/lib/graph/graph-retriever.ts:62–105`). But the result excludes predicate, direction, weight, evidence and validity. Final context contains only concept descriptions and hop labels (`:112–122`). SQL orders by ID then depth, so the final five are not globally prioritized by distance as the comment suggests. There is no relation-aware inference, contradiction handling, entailment check, or proof chain. Graph context also does not join the returned `sources` list (`src/lib/ai/chat-engine.ts:150–153`).

Return typed paths with source evidence; seed from both question entities and chunk/entity links; enforce bounded traversal and evidence ranking. Do not infer causality from arbitrary adjacency.

### P1 — The reported accuracy is a readiness proxy

The score combines item counts/index ratio, personality field presence, graph counts, thumbs-up ratio, and stored answerQuality (`src/lib/ai/accuracy-scorer.ts:11–115`). Its graphDensity is `min(100, nodes*5 + edges*3)`, not density or correctness. Twenty isolated nodes can score 100.

More seriously, the message route writes average retrieval score as answerQuality (`src/app/api/chat/sessions/[sessionId]/messages/route.ts:245–258`). LLM-reranked scores are synthetic values starting at 1 and declining by 0.1 (`src/lib/vector/retriever.ts:135–141`). This measures retrieved-context ranking, not factuality or expert fidelity. Topic-gap analytics consume the same value (`src/app/api/expert/analytics/topic-gaps/route.ts:30–42`). Rename the existing score to readiness and add separate evaluated fidelity/grounding metrics with sample size and date.

### P1 — Twin behavior is prompt configuration, with limited feedback

Opinions, thinking framework, and boundaries are persisted free text (`src/app/api/expert/twin-config/route.ts:73–94`) inserted into the system prompt (`src/lib/ai/prompts.ts:55–67`). This is implemented personalization; it is not executable decision logic or a learned cognitive model. The base prompt asks the model to answer as the expert (`:22`). Personality analysis samples only the first 6,000 characters and can return generic fallback fields (`src/lib/ai/personality-analyzer.ts:64–105`); updates require the separate personality POST (`src/app/api/expert/personality/route.ts:71–78`). New content does not automatically synchronize a reviewed profile version.

Subscriber memories are implemented, but belong to the subscriber, not the expert's knowledge state. Matching on the first 20 characters only refreshes timestamps, not corrected fact content (`src/lib/ai/memory-manager.ts:13–38`). Memory extraction sees both user and assistant text (`src/lib/ai/memory-extractor.ts:15–29`) and has no source-message provenance in its contract. Ratings are persisted (`src/app/api/chat/sessions/[sessionId]/messages/[messageId]/rate/route.ts:66–71`), but there is no expert correction-to-approved-knowledge loop. A dislike should create a review task, not automatically teach the twin a new fact.

Conversation continuity has a concrete bug: subscriber session loading takes the earliest 50 messages (`src/app/api/chat/sessions/[sessionId]/messages/route.ts:36–39`), then the engine selects the last 20 from that old subset (`src/lib/ai/chat-engine.ts:124–127`). Beyond 50 messages it loses recent turns. Widget loading similarly takes the earliest 20 (`src/app/api/widget/chat/route.ts:83–88`). Fix latest-window retrieval and restore chronological order before adding advanced memory. Neither path maintains explicit active goals, unresolved questions, decisions or a versioned conversation summary.

### P2 — Retrieval reliability and scale need explicit contracts

Embedding failures or missing keys produce a character-hash fallback with the same dimensions as genuine embeddings (`src/lib/vector/embeddings.ts:5–42`). Those incompatible embedding spaces can be mixed persistently without a model/version marker. Missing API configuration is therefore not a meaningful semantic-search readiness check. Reranking only examines the first 15 merged candidates, which are vector-first, potentially excluding keyword-only candidates when vector results fill that budget (`src/lib/vector/retriever.ts:33–55,90–93`). Use balanced fusion and record embedding model/version; expose failure rather than silently mixing representations.

One migration creates an HNSW vector index (`prisma/migrations/20260323185226_pgvector_persistent_store/migration.sql:23–24`); the next drops it (`prisma/migrations/20260323190303_pgvector_persistent_store/migration.sql:1–2`). Source history therefore does not guarantee indexed ANN retrieval in the final schema. Actual database state and query plans require later verification. Graph extraction/rebuild is sequential, request-bound, unqueued, and lacks retry/status infrastructure; imports have ImportJob status, but graph derivation does not.

## Digital twin capability boundary

| Capability | Evidence/status | Implication |
|---|---|---|
| Knowledge-grounded expert chat | Implemented vector + keyword retrieval and streaming engine | A useful existing base to retain |
| Voice/style imitation | Implemented prompts and profile analyzer | Sample-limited, no measured fidelity |
| Expert beliefs/decision framework | Implemented free-text settings | No structured, versioned, evidence-backed decision model |
| Subscriber context | Implemented persistent memories and history | No expert-state model or robust correction semantics |
| Expert knowledge synchronization | Partial indexing, with graph hook and post-edit gaps | Not dependable current-state replication |
| Feedback | Message ratings and analytics implemented | No reviewed correction/release loop |
| Device/physical models | No corresponding models in complete Prisma schema or modules in src/lib | No asset topology, units, calibration, device identity, or physical dynamics |
| Telemetry/state synchronization | No telemetry/event ingestion, sensor/MQTT adapter, or state reducer found | No real-time observed/desired state synchronization |
| Simulation/prediction | No simulation engine, prediction model, scenario runner, or outcome evaluation found | LLM-generated advice is not a validated prediction |
| Control/feedback to physical world | No actuator/command lifecycle found | No closed-loop physical twin |

The repository's product memory and marketing describe replicas of expert people. Physical twins would be a distinct extension needing a domain and integration requirements; they should not inflate this milestone. An expert twin can meaningfully improve through versioned beliefs, explicit context-dependent decisions, uncertainty, and reviewed learning. It should expose which expert state/version produced each answer.

## Mocks, placeholders, and claims

- Graph extraction/storage/traversal are production implementation, not merely documentation. Their correctness is not established by the existing tests: `__tests__/api/graph-accuracy.test.ts:6–20` mocks Prisma, auth, OpenAI and extraction; `:232–255` mocks the recursive SQL result rather than running the SQL. Scoring tests validate the heuristic formula, not answer fidelity (`:703–768`).
- Development hash embeddings are a production-reachable fallback, not semantic embeddings (`src/lib/vector/embeddings.ts:25–42`). Personality fallback is generic profile data (`src/lib/ai/personality-analyzer.ts:97–105`).
- User-facing "thinking" events are pipeline status strings, emitted after engine preparation with 400ms pacing (`src/lib/ai/chat-engine.ts:36–116`; message route `:276–287`). They are not a reasoning trace or proof.
- Source display is implemented, but terminal subscriber SSE only exposes title/snippet/score (`message route:205`); graph provenance is unavailable. Full retrieved metadata is stored on the answer (`:230–236`). These are not validated claim-level citations.
- Admin analytics charts explicitly generate random mock series (`src/components/admin/analytics-overview.tsx:19–55`). This is separate from the real interaction records; do not use these charts as evidence of twin improvement.
- Faithful expert representation is product intent, not established accuracy. No physical/simulation capability was found even as a concrete implementation plan in the inspected product memory. README provides no architecture or evaluation documentation.

## Prioritized implementation plan

### Proposed person-twin pipeline

**Existing inputs → source revisions → attributed claims and episodes → person knowledge state → query/conversation plan → evidence bundle → grounded draft → verification → natural rendering → reviewed feedback.** Each stage has a persisted contract so failures and attribution are inspectable.

1. **Source normalization and authority.** Preserve original text/anchors, author/quoted speaker, upload/crawl time versus publication time, expert ownership, and eligibility. An expert uploading someone else's article does not prove endorsement. Treat unverified authorship as unknown; a current explicit expert setting is authoritative for persona preferences but not automatically a factual truth about the world.
2. **Person-centered extraction.** Extend `entity-extractor.ts` into validated claim extraction, producing subject, predicate, object, stance/polarity, conditions, domain, evidence span and attribution. Extract decision cases as situation → constraints → preferred action → stated rationale → exceptions; extract anecdotes as documented episodes with actors and date precision. Do not turn a quoted opponent's view into the expert's belief or extract assistant text as a user-revealed fact. A model confidence value describes extraction uncertainty and must not be presented as truth probability.
3. **Identity-specific knowledge state.** Store semantic claims, expressed preferences, and decision cases under the expert identity. Keep source episodes distinct from subscriber conversation episodes. Derive current state from active, eligible evidence using explicit approval, provenance, and effective dates; represent conflicts rather than last-write-wins descriptions. Missing dates stay unknown. Store persona exemplars from varied sources, rather than sampling only the first 6,000 characters.
4. **Conversation state and query planning.** Repair recent history first. Track active topic, user goal, unresolved follow-up, salient user constraints, and recently used anecdotes/phrases. Classify requests as factual, stance, personal-experience, advice/scenario, follow-up, or unsupported/private. Resolve pronouns and short entity aliases. Plan retrieval for required evidence, optionally graph-first when vector matches are absent; ask one useful clarification when the missing constraint changes the recommendation.
5. **Evidence-bounded retrieval.** Hybrid retrieval targets source chunks, claims, decision cases and documented episodes. Traverse only useful typed relations with direction/validity/provenance. Filter expert identity and content eligibility before ranking and again when assembling evidence. Separate expert stance, source factual claims, subscriber memory and external web facts in the result contract. Retrieve representative style examples independently of factual evidence to avoid substituting familiar phrases for knowledge.
6. **Grounded synthesis.** Generate with an explicit answer plan: supported conclusion, applicable conditions, rationale evidenced by decision cases, unresolved uncertainty, and relevant follow-up. New advice can be a labeled application of documented principles; it cannot be claimed as a decision the real person actually made. Avoid invented first-person experiences. When no personal evidence exists, say the twin lacks that person's documented view; general knowledge can be provided with attribution if useful.
7. **Verification before final delivery.** A verifier checks person attribution, evidence entailment, dates/conflicts, condition applicability, unsupported personal claims, boundary compliance, and citation IDs against the evidence bundle. Use deterministic identity/revision/citation checks plus a separately prompted semantic verifier; neither LLM alone is a guarantee. Repair at most once, then narrow the answer or abstain. Evaluate buffering paragraph-sized units before streaming to avoid delivering unsupported personal claims before verification; measure the latency tradeoff.
8. **Natural surface behavior.** Render the verified answer in an evidence-derived voice with varied phrasing, appropriate brevity, contextual follow-ups, and occasional documented anecdotes. Use subscriber context only when relevant; avoid repetitive catchphrases and manufactured intimacy. Keep facts stable across paraphrases. Pipeline status should be honest activity feedback, not simulated internal thoughts or proof of the real person's mind.
9. **Controlled learning.** Ratings flag answers for review. An expert-approved correction becomes a revision with explicit scope/effective date; unreviewed subscriber feedback cannot change expert beliefs. Re-evaluate affected questions and publish a new twin version with rollback. This uses the existing content/settings/chat inputs; review workflow is additional processing, not a new acquisition channel.

### Module and schema changes

| Existing module | Focused change |
|---|---|
| Knowledge/import/post routes + `vector/indexer.ts` | Shared `knowledge/source-lifecycle.ts` contract, durable derivation orchestration, typed expert/revision arguments |
| `graph/entity-extractor.ts` | Validated `knowledge/claim-extractor.ts` with attribution, evidence spans, decision cases and documented episodes |
| `graph/graph-builder.ts` | Idempotent revision-specific projection; retain current node/edge API for compatibility |
| `graph/graph-retriever.ts` + `vector/retriever.ts` | `ai/query-planner.ts` and structured evidence retrieval with short aliases, typed paths, version/tenant filters and balanced fusion |
| `memory-extractor.ts` / `memory-manager.ts` | Message-grounded memory, correction/supersession, subscriber-only facts; no expert belief updates from chat |
| Chat routes + `chat-engine.ts` | Latest history, `ai/conversation-state.ts`, evidence/answer trace contract, verifier, shared subscriber/widget behavior |
| `personality-analyzer.ts` / `prompts.ts` | Evidence-backed persona exemplars, versioned config, explicit twin identity and attribution-aware answer prompts |
| `accuracy-scorer.ts` and score UI | Separate readiness, grounding, expert fidelity and naturalness with evaluation sample/date |

Add `SourceRevision`, `DerivationJob`, `EntityAlias`, `Assertion`, `AssertionEvidence`, `DecisionCase`, `SourceEpisode`, `TwinVersion`, `ConversationState`, `AnswerTrace`, and `EvaluationCase/Result` as needed. Every person-specific object must carry expertProfileId; subscriber memories/episodes also carry subscriberId, and conversation state carries sessionId. Prefer composite tenant constraints where feasible. A SourceEpisode must link source evidence; a subscriber episode must link user message IDs. Neither is permission to invent memories. Add revision/supersession fields to existing memory models rather than duplicating storage unnecessarily.

Do not create all tables before proving the vertical slice. First ship source revisions + evidence-backed assertions + traceable retrieval and the recent-history fix; then add decision cases, persona versions, conversation state and verifier as separately measurable increments. Keep the recommendation API-compatible and additive.

### First milestone: source-backed expert state, end to end

Scope: one expert, existing text/PDF/blog/post content, two-hop retrieval, current-state answers plus historical revision inspection. Keep existing routes and UI; replace the duplicated ingestion/graph orchestration behind them. Deliver in this order:

1. **Versioned source lifecycle.** Add immutable SourceRevision with content hash, original source location, revision sequence, eligibility, created/effective time. Add durable DerivationJob/outbox rows in the same transaction as source changes. Require expert/source/revision IDs in the indexing service. Route every create/edit/delete/RAG-toggle through it. Jobs have queued/running/succeeded/failed state, retries, and error detail; no silent graph failure.
2. **Evidence-backed assertions.** Add stable typed Entity and EntityAlias, typed Assertion, and AssertionEvidence pointing to source revision/chunk/span. Retain present graph nodes/edges as a derived projection if convenient. Store polarity, qualifiers, validity, extractor/model version, confidence as an uncalibrated extraction signal, and expert approval status. Treat source statements as attributed claims; reserve "expert believes" for expert-authored or approved material. Validate runtime extraction output and evidence spans. Extract all chunks, deduplicating overlap by evidence identity.
3. **Atomic, idempotent derivation.** Unique job key `(expert, revision, derivation version)` and evidence identity prevent repeated processing from changing support counts. Write a complete revision result atomically; only publish current pointers after required vector and assertion derivations succeed. On revision replacement/retraction, invalidate old evidence and recompute the projection; retain facts supported by other eligible sources. Support replay and current-vs-historical queries without destructive graph rebuilds.
4. **Traceable answers.** Resolve query entities and seed from source/entity links; retrieve typed directed paths with current evidence. Include document/revision/chunk IDs, quotes and graph path in structured sources. Persist an answer trace with expert config version, source revisions, retrieval model, and prompt/model version. Show conflict or insufficient evidence; do not let unrelated graph prose masquerade as expert certainty. Keep expert approved stance separate from external web context and subscriber memory.
5. **Evaluation and review.** Relabel heuristic score as readiness. Add a compact expert review queue for unsupported/conflicting claims and negative feedback. Approved corrections create a source revision and trigger the same pipeline. Store a small held-out expert-approved question/expected-claim set and report grounding, fidelity, abstention, and graph-assisted retrieval separately.

Suggested schema additions are additive migrations, not a mandate to rename every current model. No Neo4j migration is necessary for this scope. Use a durable PostgreSQL job table initially; choose a worker deployment only after runtime/environment approval. Existing unsupported graph records need a staged rebuild from original sources; do not manufacture provenance for legacy descriptions.

### Acceptance tests and release gates

These are proposed measurable gates, not tests run in this audit:

| Gate | Acceptance |
|---|---|
| Ingestion wiring | Each manual/PDF/blog/post create and edit fixture produces a successful graph derivation with source revision ID; UI shows failed/retrying state on injected provider failure |
| Idempotence | Process the same revision 10 times, including concurrent retries: exact same active entity/assertion/evidence set and support counts |
| Synchronization | Edit a post and a title-only knowledge item: next successful published revision is used in retrieval; old statements absent from current answers |
| Deletion/eligibility | Delete/retract or disable RAG on source A: A-only assertions vanish from current retrieval; assertions also supported by B remain with only B evidence |
| Provenance | 100% of graph facts supplied to generation carry an eligible source revision and validated quote/span; answer trace records all evidence versions |
| Full-source coverage | Fixture with its only important claim after character 3,000 is extracted and retrieved; overlapping chunks do not double-count evidence |
| Identity/ontology | Reviewed alias fixtures merge ML/machine learning; homonym fixtures stay separate; invalid predicates/types and nonexistent evidence spans are rejected |
| Temporal/conflict | Contradictory dated stances return the appropriate current stance with explicit prior revision available; unresolved equal-priority conflict is disclosed |
| Tenant isolation | Two experts with same labels: no cross-expert entities, source text, graph paths, memories, or jobs are returned, including adversarial IDs |
| Retrieval improvement | Freeze 40 expert-reviewed questions: 15 direct, 10 relationship, 5 changed beliefs, 5 conflicting, 5 unsupported. Target >=90% supporting-evidence recall@5 on answerable cases and >=80% correct abstention on unsupported cases |
| Answer fidelity | On that held-out set, expert approves >=85% for correctness and viewpoint; >=95% of cited claims supported by cited evidence. Compare graph-enabled vs vector-only with same model/prompt budget; report paired outcomes and sample size |
| Failure safety | Interrupted/retried jobs never publish a half-derived current revision; provider outage cannot silently index hash fallback vectors as real embeddings |

Run actual PostgreSQL/pgvector integration tests for persistence, recursive traversal, idempotence and transactions; retain mocked route tests for fast API checks. Use deterministic extraction fixtures for infrastructure gates and separately evaluate live extraction with pinned prompts/models. Latency and cost budgets should be set after the first benchmark on agreed hardware/data; no measured performance claim is justified yet.

### Later milestones

- P1: structured expert decision cases with conditions, preferred actions, rationale, counterexamples and boundaries; evaluate against unseen expert-reviewed scenarios. Version published twin configurations and allow rollback.
- P2: improve hybrid candidate fusion, model-specific embedding rebuilds, verified database indexing, bounded graph budgets and observable latency/cost. Choose scale work based on measured bottlenecks.
- P2: memory correction/provenance and reviewed subscriber context; extend widget source visibility if product requirements call for it.
- Physical/device twins are outside the clarified person-twin scope.

### Person fidelity and naturalness evaluation

Use a frozen evaluation corpus from the SAME existing source types, across at least five distinctly voiced experts when available. Hold out questions, paraphrases and conversation scenarios; compare existing RAG, evidence-backed retrieval, and full proposed pipeline using the same model and comparable context budget. Suggested initial release thresholds are targets requiring calibration, not achieved results.

- **Faithfulness:** expert reviewers score factual correctness, attributed stance, applicable conditions and rationale separately. Target >=85% approved answers and >=95% cited-claim support; require zero fabricated autobiographical/private-memory claims in the adversarial fixture set.
- **Distinctiveness:** blind reviewers match answers to the correct expert among five, using held-out questions whose sources express differing views. Target >=70% identity match and improvement over baseline; measure viewpoint match separately from style-only clues. Name-dropping and catchphrase stuffing do not count as fidelity.
- **Temporal consistency:** old/new stance, undated conflict and superseded-source fixtures must produce correct current answers in 100% of deterministic cases, preserve historical attribution, and disclose unresolved conflicts. Repeat with paraphrased questions.
- **Conversation continuity:** scripted 60-turn subscriber and 25-turn widget conversations retain recent constraints, resolve pronouns, avoid repeated questions and avoid stale earliest-window history. Require 100% recent-context fixture success before user testing.
- **Naturalness:** blind paired conversation ratings on relevance, continuity, concision, voice, useful follow-up and repetition; target a mean >=4/5 and preference over baseline, while retaining grounding gates. Assess several consecutive turns rather than isolated polished answers.
- **Uncertainty:** supported vs unsupported personal-view questions, quotations, ambiguous authorship and contradictory cases; target >=80% appropriate abstention and no unsupported confident personal stance in the adversarial set. Report over-abstention on answerable queries too.
- **Isolation:** same query and overlapping labels for two experts, plus malicious source instructions: zero cross-person evidence/stance/style leakage; zero cross-subscriber memory exposure. Test SQL/database constraints and retrieval assembly, not just prompts.
- **Pipeline cost:** record per-stage latency/tokens and verification repairs. Pick an interactive latency budget after measurement. More LLM calls alone do not establish a more faithful twin.

Feasibility: the same text, settings and conversations can support attributed beliefs, documented anecdotes, conditional decision examples, source-grounded voice and better continuity. Fidelity is bounded by the evidence those inputs contain. The system can be a convincing, transparent representation; it cannot guarantee a complete real-person replica or learn undisclosed private experience solely by changing its graph.

## Research synthesis and experimental controls

- [LongMemEval](https://arxiv.org/html/2410.10813v2) separates indexing, retrieval and reading. Its experiments favor original conversation rounds over fact-only compression overall, while showing that retrieved evidence can still be misused. Application here: immutable originals plus derived views; evaluate evidence recall independently from generation with oracle-evidence tests. This is conversational-memory evidence, not proof of human replication.
- [Zep](https://arxiv.org/html/2501.13956v1) links raw episodes to semantic artifacts and models event time separately from ingestion time. Application here: trace each assertion back to a source revision and retain validity/history. Its reported memory-QA results do not demonstrate person fidelity or require adopting its service/database.
- [LaMP](https://aclanthology.org/2024.acl-long.399/) evaluates retrieval of items from individual user profiles for personalized tasks. Application here: retrieve task-relevant examples from the expert's own sources for style rendering, independently from the supported factual plan. Personalization task performance is not evidence that every answer matches the actual person's views.
- [PersonaMem](https://arxiv.org/html/2504.14225v2) tests responses against evolving user profiles. Application here: evaluate current versus superseded preferences, not just static persona field completeness.
- [PersonaMem-v2](https://arxiv.org/html/2512.06688v1) tests implicit preferences, ownership ambiguity, hypothetical/third-party messages and preference updates/forget requests. Application here: label preferences explicit, inferred, or unknown; retain contexts and exceptions; reject unsupported ownership attribution. Inferred preferences should be reviewed before being presented as the expert's stated position.

These applications are engineering inferences from the papers and this code, not reported ExpertHub results. Freeze source snapshot, generator model/version, retrieval/context budget and evaluator rubric. Split whole sources and time periods, not adjacent chunks, to limit leakage. Preserve the baseline; compare fixes-only, assertions, temporal views, decision cases, style retrieval, conversation state, and verifier as incremental ablations. For each layer measure evidence recall, oracle-evidence answer correctness, end-to-end expert faithfulness, distinctiveness, naturalness, abstention, latency and cost separately. Retain original evidence plus complementary episodic/assertion/preference/reasoning/style views rather than replacing originals with one lossy summary. Learning implied preferences is a hypothesis that must be validated against held-out expert judgments, not an excuse to infer from demographic stereotypes.

## Runtime setup limits

The source checkout is ready for implementation review, at the path and commit above. `.env.example` identifies PostgreSQL connection/auth/OpenAI requirements. Package scripts include install-time Prisma generation, database migration/seed commands and Next.js startup; these were deliberately not run. Runtime startup, migration compatibility (including the PDF parser/package API), external credentials, existing database contents, provider behavior, and tests remain unverified. A clean local database and explicit authorization for dependency installation/application execution are the next prerequisites for runtime validation. No push, deployment, remote edits, or changes to another project are part of this audit.
