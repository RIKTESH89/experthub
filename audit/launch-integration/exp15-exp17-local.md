# EXP15 / EXP17 local implementation handoff

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
