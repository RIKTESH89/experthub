# EXP15 / EXP17 local evaluation gate — second review handoff

This is the current authoritative report. Prior reports and commits retain implementation history; they do not establish natural-dialogue completion.

Checkout: /Users/rikteshs20/Documents/Codex/2026-10-03/task-8/experthub-exp15-exp17, branch codex/exp15-exp17-local. Base d8c4eb3acc2ee8a8595f3bc5bea67da763d48203. Prior commits 838f6ec, b7b7d3e, df48d1a preserved. Independent local clone; source integration and canonical checkouts unchanged. No schema/migration changes.

## Default behavior and explicit local opt-in

runChatEngine now delegates to the frozen baseline by default. chat-engine-baseline.ts is identical to frozen source except the function is renamed runFrozenChatEngine; an exact textual comparison passed. This preserves the existing general chat behavior, including its existing limitations, rather than presenting the experimental verifier as a default safety upgrade.

The experimental path requires EXP15_EXP17_LOCAL_EVALUATION=1 plus NODE_ENV=development or test. Production and known Vercel/preview/AWS Lambda/Cloud Run/Azure hosted markers reject the opt-in. The flag is server environment configuration, never a request field. This is a local-development rollout guard, not cryptographic proof of deployment location. No shared environment or credentials were changed. No provider calls were made. Semantic/free-form claim release remains unconditionally blocked inside the evaluator; no environment flag enables it.

Four default-path differential tests compare serialized generation requests, normal provider SSE, citations and returned bundle against the frozen implementation for research, return-null programming, greeting and data-corruption questions. Default returns no experimental verification result and never calls release revalidation. Runtime gate tests cover exact flag opt-in and hosted/production rejection; a production-path test proves the flagged production call still uses baseline.

## Second-review regressions: failing before, passing after

The focused revalidation suite first failed four new cases:
- An invalidating stance excluded by lexical relevance left the old assertion verified.
- An oversized invalidating stance excluded by prompt token budget left the old assertion verified.
- A corpus over 100 authorized vectors made an evidence-independent greeting abstain.
- Accepted citations lost title/knowledgeItemId/sourceType/sourceId.

All four now pass, with additional tests for selected evidence outside a sorted corpus prefix, current provenance replacing stale title metadata, missing current provenance, SQL span-capacity uncertainty, evidence-independent no-query behavior and security failures remaining blocking.

## Surgical revalidation changes

Revalidation no longer calls assembleBundle. It is an authorization/invalidation decision, independent of query relevance, ranking, context tokens or prompt selection. Originally selected evidence is checked through existing live store gates against exact currently authorized chunk IDs, bounded to the existing chunk budget. Revision/content hash/source version/text must remain unchanged. New evidence cannot become accepted claims.

Temporal invalidations come from the raw live temporal result: superseded original spans and relations touching original spans remain available to the verifier even if the replacement text is irrelevant, oversized or absent from the selected prompt. Valid replacement spans can still pass if originally selected. Unseen replacement content is not released.

For a corpus within the existing 100-candidate limit, temporal reads include bounded current manifest neighbors. Above that limit, exact source revalidation still runs, but person claims receive release-temporal-coverage-unavailable because broader invalidation completeness is unknown. A separate live authorized-span capacity read treats reaching the store's 100-span SQL limit as similarly incomplete; this avoids assuming vector-count coverage implies span coverage. Person claims fail closed in these cases.

Evidence-independent greetings/thanks/local clarification do not depend on corpus completeness. A corpus-coverage diagnostic alone does not block them, but authorization failures and unknown/security diagnostics still do. When no source evidence was originally selected, the revalidation helper performs no evidence/provenance reads. The engine still re-reads expert identity/RAG permission and resolves current retrieval scope before experimental release. No permission bypass was introduced.

Accepted citation title, knowledgeItemId, sourceType, sourceId and sourceVersion are read from current indexed KnowledgeItem rows, scoped to the expert and pinned source versions. Their vector membership/current indexedVersion must match the freshly authorized evidence. Stale arbitrary metadata is not copied. Citation text and nested evidence/temporal traces remain restricted to accepted spans, and missing current source provenance cannot produce citations.

## Verification actually run

- Four second-review regressions failed before repair, then passed afterward.
- Combined focused Jest: __tests__/exp15; phase0/chat-engine; EXP14; phase0/retrieval; API chat/thinking-chat; EXP26 chat-access; phase0 shared/post-access: **161/161 tests, 15 suites**.
- TypeScript --noEmit --incremental false: passed.
- next lint --file covering baseline/wrapper, every owned dialogue module, every EXP15 test file and phase0/chat-engine.test.ts: no warnings/errors.
- git diff --check: passed.
- Frozen baseline exact-source comparison: passed except intentional exported function rename.
- EXP14 regenerated timing artifacts restored exactly.

## Remaining limits

EXP15/17 natural dialogue is not complete. The experimental verifier still releases only controlled conversational actions, literal evidence quotations and narrow structural preference paraphrases. The removed informational reply catalogue was not expanded. Free-form factual explanations, new applications, person-belief paraphrases and high-stakes advice remain gated pending independent semantic/real-model evaluation. Default parity preserves normal discussion; it does not prove or enhance the default model's claim faithfulness.

Style extraction tests demonstrate selected source eligibility; formatting differential tests demonstrate only paragraph/bullet presentation. No model voice adoption, personality fidelity or expertise capability has been evaluated.

Permission/source checks are separate reads and are not atomic with response emission. Changes after the final gate can race delivery. No closed-race, native concurrency/CAS or exhaustive temporal-coverage guarantee is claimed. Large or span-dense corpora can cause experimental person-claim abstention. Source retrieval/runtime load, actual provider category behavior, semantic faithfulness, India English pilot suitability and high-stakes adequacy remain untested.

No provider calls, full build, client generation, production data, credentials, external spending, push or deployment. Dependencies reused read-only. Default and experimental tests use synthetic fixtures/mocks rather than native database/provider evaluations.
