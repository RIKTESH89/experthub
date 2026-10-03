# EXP15 / EXP17 local implementation handoff

Latest status/design: see exp15-exp17-review-repair.md. The finite general-information catalogue described below was removed after independent review; semantic free-form release remains blocked. Earlier sections are retained as implementation history, not current acceptance claims.

Base: d8c4eb3acc2ee8a8595f3bc5bea67da763d48203.
Checkout: /Users/rikteshs20/Documents/Codex/2026-10-03/task-8/experthub-exp15-exp17.
Branch: codex/exp15-exp17-local. Independent local clone: ordinary git worktree creation could not write the canonical repository's shared ref metadata. No canonical/integration files were changed. Dependencies are a read-only-use symlink to the existing integration node_modules; no install, full build or client generation.

No applicable AGENTS.md or .agents/skills were found in this checkout, its ancestors, or the source checkouts. Ownership: src/lib/ai/dialogue/{state,style,verify}.ts, necessary chat-engine wiring, focused tests, this report. No schema or migrations changed. Payments lane retains migration ownership.

## Contracts and implementation

EXP15 dialogue-v1 is request-local, bounded to six user turns (2000 characters each), with intent, evidence gaps and conservative medical/investment/research risk mode. It consumes authorized history and explicit EXP14 EvidenceBundle. Assistant responses and subscriber corrections never become person evidence. No persistence, persona-release adoption, or imported-source correction support was added.

style-v1 uses up to three selected, explicit, owner-authored/owner-endorsed spans with source chunk membership. No legacy profile/twin opinions/framework/topicExpertise are passed to generation. It offers surface phrasing samples with unknown fallback, not inferred personality facts. No faithfulness claim.

person-verification-v1 consumes dialogue-v1 and intent-evidence-v1. Provider chooses only span IDs in a strict JSON envelope; arbitrary prose, extra fields, inferred/quoted/unknown authorship, missing or revoked chunk support, failed retrieval, and cited unresolved conflicts abstain. Only exact source quotations are rendered, with AI identity, gaps and high-stakes informational caution. Missing decision fields remain unknown. Temporal superseded stances are excluded; current selected stances/assertions come through unchanged live EXP14 gates. Assertion quotes do not establish historical validity.

Chat buffers provider SSE privately, limits transport to 128000 bytes and parsed output to 24000 characters, applies a 30 second abort signal, and requires DONE. Malformed, interrupted or oversized transport abstains. Only locally rendered verified or abstention output is returned using the existing OpenAI-style SSE framing. Retrieval/audience/source and existing CAS/permission implementations are unchanged. No schema edits.

## Tests actually run

- node node_modules/jest/bin/jest.js --runInBand __tests__/exp15 __tests__/phase0/chat-engine.test.ts __tests__/exp14 __tests__/phase0/retrieval.test.ts: 54/54, 5 suites.
- node node_modules/jest/bin/jest.js --runInBand __tests__/api/chat.test.ts __tests__/api/thinking-chat-enhanced.test.ts __tests__/exp26/chat-access.test.ts __tests__/phase0/shared-access.test.ts __tests__/phase0/post-access.test.ts: 44/44, 5 suites.
- node node_modules/typescript/bin/tsc --noEmit --incremental false: passed.
- git diff --check: passed.

Adversarial coverage includes forged span IDs, free-form expertise claims, unsupported output fields, unknown authors, quoted speakers, inferred assertions, withdrawn chunk support, assistant personality laundering, subscriber correction laundering, failed retrieval, unresolved conflicts, byte-fragmented provider SSE, malformed SSE, and high-stakes informational fallback. EXP14 tests regenerate timing audit JSON; those files were restored exactly and excluded from this commit.

## Limitations / follow-up

This is a substantive but deliberately restrictive local release policy. It does not release general free-form generated answers; unsupported queries receive calibrated abstention plus deterministic informational guidance for high-stakes/research topics. Style samples are prepared but visible responses are quotation templates; conversational style effectiveness is not demonstrated. EXP14's currently narrow extractors limit available person evidence. Verification proves selected literal attribution, not semantic relevance, factual truth, broad answer completeness or professional suitability. Source text is labelled quotation and remains untrusted. The risk classifier is lexical and conservative, not comprehensive medical/financial triage or semantic intent detection. Memory remains continuity-only in the prompt; no new memory extraction changes.

Provider streams are buffered, so first-response latency changes and true token streaming is unavailable for this policy. Real-model evaluation, semantic faithfulness, streaming load/timeouts, broader India English pilot acceptability, and native database race/CAS checks are separate pending work. No real provider call, production data, credentials, external spending, push or deploy occurred. Existing live gates were inspected and tested with deterministic mocks; this is not a new native database proof.

## Focused product review and follow-up implementation

The first commit is a safety baseline, not sufficient acceptance evidence for the user's natural expert discussion goal. Its quotations-or-abstention policy regresses factual explanations and ordinary conversation. The follow-up preserves that baseline and adds strict response segments:

- conversation: greeting/thanks require matching current user text; clarification uses locally authored questions, with decision constraints where applicable.
- general-information: four locally reviewed explanation IDs (research design, research uncertainty, investment risk, reading medical sources). Current-turn lexical relevance is required and high-stakes context cannot be bypassed by cross-domain selection. Text is labelled general information, not an attributed expert view. No provider-authored facts pass through this category.
- person-paraphrase: only explicit owner-authored selected literal preference/recommendation assertions. The source sentence is independently matched against predicate/object fields; local third-person phrasing preserves the exact quoted object and source attribution. Arbitrary semantic paraphrases and temporal decision paraphrases remain unsupported.

Segments accept only category/id fields; category labels cannot launder model prose, expertise, new factual claims, experiences or invented evidence. The all-or-nothing verifier rejects the entire envelope if any segment or person claim is unsupported. Legacy spanIds-only output remains accepted. Status 'verified' now means local policy validation, not verified truth of model-generated factual prose.

### Evidence separated by layer

1. Style sample extraction: deterministic tests prove selected owner author/speaker/endorsement, explicit kind, chunk support and no assistant/history personality adoption. This establishes source-sample eligibility only.
2. Style affecting answers: eligible short single-line samples select paragraph presentation; other/unknown samples select bullet presentation. Differential tests prove formatting changes while informational text is identical. This is observable surface formatting, not inferred personality, catchphrases or fidelity. The visible content is still locally rendered.
3. Unverified model behavior: no provider runs. No evidence that real models reliably select categories, answer relevantly, choose the right spans, mimic voice, handle adversarial instructions, or recover naturally from clarification. Model choices are bounded by the release policy but usefulness is unevaluated.

### Differential coverage

Tests compare the first safety baseline's no-span abstention with explicit category release for hello/thanks/clarify and four informational topics. A chat integration fixture contrasts frozen pass-through provider prose with present rejection of unchecked factual/person prose; this is a synthetic behavior comparison, not a separately executed frozen real-model baseline. Verified categories survive the existing SSE caller interface. Additional tests reject off-topic IDs, cross-domain high-stakes IDs, prose disguised under category labels, unsupported person-fact categories, field/source paraphrase mismatch and historical assistant factual laundering.

### Tests actually run after follow-up

- Combined focused Jest command including __tests__/exp15, phase0/chat-engine, EXP14, phase0/retrieval, API chat/thinking-chat, EXP26 chat-access, phase0 shared/post-access: 117/117 across 11 suites.
- TypeScript --noEmit --incremental false: passed.
- next lint with --file for chat-engine, all four dialogue modules, both EXP15 test files and phase0/chat-engine.test.ts: no warnings or errors.
- git diff --check: passed. Generated EXP14 audit timing output restored.

### Exact remaining gaps and safe options

The finite explanation catalogue is helpful but narrow: arbitrary engineering/scientific factual questions still abstain; it is not broad natural discussion. Multi-turn state retains bounded user continuity and risk but has no persistent goals, question-resolution tracking or coreference verification. Lexical relevance/risk detection is not a semantic safety proof. Preference paraphrases cannot resolve contextual applicability, unknown negatives, historical validity or decision-case fields. Source quotations can contain untrusted commands; they are attributed as data, not adopted as instructions. Existing EXP14 author evidence is narrow and incomplete; no imported-source corrections or release adoption were added.

Safe next steps are more reviewed domain-neutral explanation IDs and locally authored clarification flows, grounded paraphrase rules for separately supported extractors, and explicit source-cited general factual claims whose predicates can be checked against trusted retrieval contracts. Free-form informational prose needs independent claim extraction/verification or a separately approved evaluated generation path; relabelling arbitrary text 'general' or using a regex person-claim filter would not be sound. Broad naturalness, high-stakes adequacy and personal-style fidelity require separate adversarial real-model evaluation and pilot acceptance. No real provider calls or full build were run, and no new schema/persistence changes are required by this follow-up.
