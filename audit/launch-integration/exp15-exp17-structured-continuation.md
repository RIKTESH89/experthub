# EXP15 / EXP17 structured free-form continuation

## Checkout and ownership

Base: 26eb012b0193750ac76d8944696cb6d5c4c40e69 from task-2/experthub-next-wave-integration.
Isolated checkout: /Users/rikteshs20/Documents/Codex/2026-10-03/task-8/experthub-exp15-exp17-continuation.
Branch: codex/exp15-exp17-structured-local.

This is a separate local clone/checkout with independent Git metadata. The previous EXP15/17 lane and source integration/canonical checkouts remain unchanged. Dependencies are reused read-only through the integration node_modules link; no installs, client generation or full builds. No applicable AGENTS.md or .agents/skills were present in the checkout/ancestors.

Owned changes: new src/lib/ai/dialogue/structured modules, scripts/exp15-exp17 fixtures/runner/docs, three focused test files, local opt-in chat wiring and one failure-list deduplication in existing revalidation. No schema/migration, API route, credentials, hosted or production-data changes.

## Implemented architecture

This adds an executable free-form pipeline rather than another topic reply catalogue. A generator returns original text with complete claim ranges and typed evidence references. A separate verifier interface receives the entire answer, current evidence, state, fixed verification policy and snapshot digests. It reports independent range/category/person/presentation observations, claim support verdicts, complete semantic coverage, relevance, requested-constraint satisfaction, AI identity, calibration and high-stakes judgment. Verbatim free-form general explanation and supported person paraphrases can pass the synthetic evaluation pipeline; uncertain gaps and qualified discussion remain possible without fabricating person beliefs.

Runtime strict schemas reject unknown fields and malformed drafts/judgments. Local deterministic gates enforce:

- Nonoverlapping ranges, no omitted nonwhitespace text, unique claim IDs and bounded draft bytes/claim counts.
- Independent observed classifications/ranges/subjects matching proposed claims; unsupported/contradicted/unsafe or incomplete review fails closed.
- Explicit separation of person beliefs, general explanation, source explanation, new applications, conversation, evidence gaps and high-stakes advice.
- Span/revision/content-hash/source-version pins, originally selected EXP14 evidence only, currently authorized citation support and expert author/speaker/endorsement for person claims.
- Recorded/current/as-of distinction, known valid-time requirements, superseded/conflicting evidence and missing decision fields remaining unknown. Historical output is labeled historical.
- Unknown evidence gaps expressed as uncertainty with a supplied bounded gap index, not unsupported negative beliefs. New applications must be uncertain; person biography/credentials remain blocked because the current extraction contract cannot establish them.
- Clear AI representation identity and blocking of impersonation, unsafe clinical/investment advice, unsupported professional expertise and uncalibrated judgments. These semantic classifications are adapter judgments, not deterministic proof of their correctness.
- Typed accepted citation subsets only. Embedded Markdown source links are blocked; ordinary programming bracket syntax is not treated as a citation.

Generation and verification are distinct adapters with distinct role IDs. This proves separate protocol roles/invocations, not statistical model independence. No network or credential/provider implementation is included. Both pipeline and runner reject real-model adapters before invocation. Synthetic release is labeled released-synthetic-evaluation and synthetic-fixture-only, never proof of semantic truth or production readiness.

The turn controller bounds two attempts/four generation-verification calls and a 30-second total deadline, propagates cancellation and permits at most one repair with explicit failed-check feedback. User history/task constraints are retained on repair. Policy request objects are immutable at the top level; context and draft snapshot mutations fail closed. Live source/identity/RAG/scope checks run before semantic verification and again before release, comparing source/temporal pins. A changed snapshot triggers bounded repair or blocks. Current clock diagnostics do not falsely invalidate an unchanged source snapshot; historical instants remain pinned.

Chat integration accepts server-injected adapters only in the existing explicit local evaluation gate. It uses a new DB-only retrieval adapter over established EXP14 evidence/temporal live gates and deterministic assembly; it does not call embeddings, reranking, web search or the OpenAI fetch path. No new request JSON field or public route is added. With the flag absent or a prohibited runtime, the frozen default path remains unchanged. The old semantic placeholder remains blocked for its old interface; the new structured adapter path is the executable continuation.

## Evaluation harness and artifacts

scripts/exp15-exp17/fixtures.ts reserves 23 fixed synthetic conversations / 25 turns. Cases include natural person paraphrase, general programming/research explanation, greeting/follow-up, subscriber correction, imported persona rejection, assistant-invented identity, quoted-speaker attribution, revocation, source version change, current/historical validity, conflicts, unknown negative decision fields, medical/investment informational discussion, unsafe personalised directions, category laundering and omitted assertions.

The shipped generator and review adapters are fixed fixtures. The review fixture observes reserved response annotations rather than trusting modified live generator annotations. Gold outcomes/review labels are absent from provider requests. This remains a synthetic contract exercise, not a blinded real-model study, actual semantic entailment evaluation or training evidence.

The runner bounds 40 turns and a 30-second run, with per-turn deadlines. It emits requested dimensions accuracy/support, conversational usefulness, style fidelity, correction handling, high-stakes guardrails and refusal overreach as **contract-check aggregates**. Those aggregates measure expected gate behavior, budgets, context and sample eligibility only. Actual model/semantic and human scores remain null. Per-turn records include response/draft for review, accepted source pins, null human ratings and an evidence-based 1–5/not-assessable rubric. Do not describe mock pass rates as factual accuracy, naturalness, style fidelity or professional safety.

Generated artifact: audit/launch-integration/exp15-exp17-synthetic-evaluation.json.
Dataset digest: 7043f12ae02bf92f8706a86dce7d055ecc62ba9e32fd5cdfe4f8b14b711fdf71.
25 turns, zero contract-failure turns, zero real provider calls. Semantic model scores and human ratings are null.

Run using the documented local-only command in scripts/exp15-exp17/README.md. The CommonJS alias bootstrap uses existing ts-node dependencies and writes only the owned report; no build/client generation is needed.

## Adversarial evidence and checks actually run

Latest combined focused Jest run: **227/227 tests across 18 suites**. Included __tests__/exp15, phase0/chat-engine, EXP14, phase0/retrieval, API chat/thinking-chat, EXP26 chat-access, phase0 shared/post-access.

After adding report-review records, the two new pipeline/chat integration suites were rerun: 63/63 passed. TypeScript --noEmit --incremental false and focused lint passed; runner regenerated the artifact with zero contract failures. git diff --check passed. EXP14 generated timing artifacts were restored exactly.

Adversarial tests cover missing and overlapping ranges, assertions hidden in preambles/headings/citation formatting, material claims hidden inside a fully annotated range, person belief/credentials labeled general explanation, malformed outputs, forged snapshot digests, independent verifier disagreement, incomplete coverage, source policy instructions carried as data, context/policy mutation, verifier/generator timeout, source permission failure before/after judgment, stale references and RAG revocation between calls, unseen source introduction, biography invention, unsupported new applications and repair that drops current constraints. Fixed review fixtures do not accept changed generator category annotations. These tests demonstrate typed protocol and injected-verdict handling, not actual model detection/entailment/injection resistance.

Default parity tests pass. src/lib/ai/chat-engine-baseline.ts is byte-identical to the combined base; no default-path implementation edit. Injected local tests assert the provider fetch path, embedding/web retrieval path and legacy profile expertise are not consumed. Existing database/CAS/audience contracts were preserved.

## Evidence separated by layer and remaining blockers

1. Deterministic protocol: structural validation, digests, reference pins, version/time/citation constraints, adapter error handling, bounded repair and known synthetic policy decisions are tested.
2. Style extraction: eligible selected owner-authored spans reach generation; quotes/unendorsed/assistant-origin identity do not become style evidence. An injected mock can condition free-form output on eligible samples. This establishes conditioning/plumbing only, not measured personality or voice fidelity.
3. Semantic judgment: adapters must independently detect all claims, classify hidden person assertions, judge source entailment/relevance, retain requested constraints and identify unsafe high-stakes advice. Mocks cannot validate those abilities. A false approving semantic judgment can still miss implicit falsehoods within otherwise valid references/ranges; real-model and adversarial evaluation remain necessary. No confidence/fidelity scores are claimed.
4. Human ratings: actual usefulness, India English pilot suitability, style fidelity, correction behavior, refusal overreach and clinical/investment appropriateness remain unscored pending independent review. Sparse preference samples may be insufficient for style assessment.

Real-model adapters/fact-checking and any real-model evaluation require separate authorization, budgeted implementation and evaluation. The code is ready to attach those interfaces later but provides no permission/env bypass for them now. Natural-dialogue product acceptance remains incomplete; this is substantive local implementation/testing of the missing core.

Permission/source reads are still not atomic with delivery. A change after the final gate can race emission; this is not a closed-race/native concurrency/CAS proof. Existing bounded corpus/span coverage can block person claims. No native database/load proof was added. Source biography/clinical/investment credentials, unsupported imported corrections and automatic persona release adoption remain unavailable.

No actual model/provider calls, credential access in the new evaluation path, production data, spending, full build, schema changes, push or deployment occurred.
