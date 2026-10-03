# EXP15 / EXP17 independent-review repair

This report supersedes the finite informational catalogue design in exp15-exp17-local.md. The lane is still **not ready for product acceptance/integration as natural expert discussion**. Security/temporal/citation defects identified by review are repaired; broad semantic release remains blocked.

Checkout: /Users/rikteshs20/Documents/Codex/2026-10-03/task-8/experthub-exp15-exp17.
Base d8c4eb3acc2ee8a8595f3bc5bea67da763d48203. Prior commits 838f6ec and b7b7d3e preserved. Owned dialogue modules and necessary chat-engine wiring only; no schema/migration, canonical or integration checkout edits. No dependencies installed/generated; existing integration node_modules used read-only.

## Reproduction evidence

Before repair, the focused review-regression plus chat-engine test run failed four tests:
1. An assertion with spanId old also present in temporalTrace.supersededStances released as verified.
2. "Why does this function return null?" selected investment risk.
3. "What is the risk of data corruption?" accepted investment-risk finance text.
4. An abstention returned unused source citations.

These four exact synthetic regressions now pass. Additional reviewer-specific regressions cover medical-history followed by a new research question, noncritical semantic-unavailable/lexical-fallback diagnostics, historical validity and labeling, current unknown validity, and accepting a valid replacement while rejecting its superseded predecessor. Tests are constructed typed-bundle/mock/live-gate fixtures, not native database or real-model evaluations.

## Repairs

- Superseded span IDs are rejected even if the same span is present in assertion evidence. Source assertions cannot bypass temporal state. Valid replacement spans remain usable.
- Explicit now/current/currently/today questions require selected dated stance support valid at the current frame. Undated recorded assertions cannot prove current belief. Historical questions require EXP14 as-of mode/instant agreement and selected stance validity; historical output is labeled as historical, not current. Source quotation output explicitly distinguishes recorded text from proof of a current belief.
- Risk classification uses the current turn, preventing a medical topic from poisoning later explicit research turns. Bare return/returns no longer imply finance. This is lexical routing, not semantic triage; ambiguous continuity remains unevaluated.
- Only the known noncritical "semantic-unavailable; lexical fallback" diagnostic may pass verification. Other/unknown/security failures fail closed. This exception does not authorize unsupported spans.
- After provider buffering and before release, re-read expert identity/RAG permission and resolve retrieval scope. revalidateDialogueEvidence uses existing read-only evidence/temporal store live gates, bounded current manifest neighbors, and EXP14 assembly. It makes no second embedding/provider call. Immutable revision/content hash/source version/text must match the originally selected evidence; unseen claims cannot be introduced. New temporal supersession can invalidate an original assertion. Revocation, changed source, identity change, read failure and revalidation manifest-budget overflow fail closed. Existing live source/audience/CAS implementations were not changed.
- acceptedEvidence limits citations, source text, nested evidence/temporal traces and returned bundle to accepted span IDs. Mixed source chunks cannot leak unsupported row text. Abstention and conversational responses have no person citations. Source titles were removed from generation progress output so a revoked source is not returned through progress labels.

Revalidation uses separate DB reads, not an atomic transaction with response emission. A change after the final gate can still race delivery. This remains a material limitation; do not claim native race/CAS proof or atomic permission-to-delivery consistency. Existing selected-source/budget limitations also remain; no exhaustive belief inventory is claimed.

## Natural discussion design and unreleased gate

The hardcoded general-information catalogue has been removed. Its category IDs now abstain, including the data-corruption risk reproduction. Only matching greeting/thanks, local clarification, exact verified recorded quotations and narrow structural preference/recommendation paraphrases remain directly renderable.

claim-gate.ts defines the principled proposal contract for preserving free-form text: original text plus claim start/end ranges, evidence span IDs, and categories general-fact/source-explanation/person-view/application/conversation/high-stakes-advice. Offsets, categories and person/source support receive deterministic shape/reference checks. A structured proposal is wired to verification, but its release decision is unconditionally blocked with semantic-verification-unreleased after those checks. No environment variable, provider category label or empty claim list can grant release authority. Invalid/reference-missing proposals have distinct blocked reasons.

This contract preserves normal draft text for a future evaluated verifier; it does not falsely claim that current deterministic code verifies arbitrary prose. Suitable factual/non-person discussion could be released by an independent semantic gate that proves exhaustive claim coverage, identifies hidden person claims, checks source entailment/polarity/context/temporal validity, preserves uncertainty and gaps, confirms relevance, separates new applications, and rejects personalised clinical/investment advice and invented expertise. A self-labelled "general" segment or keyword person detector cannot establish these properties. No such evaluator has been authorized or run locally. Normal free-form discussion remains explicitly unreleased rather than replaced by expanding canned topic replies. Product acceptance remains blocked on this semantic evaluation path and natural-dialogue/pilot evaluation.

## Evidence separated by layer

- Source/style sample extraction: deterministic tests prove source eligibility and no assistant/history personality adoption. Old source style samples are surface data, not current-person facts.
- Actual style effect: locally rendered paragraph versus bullet layout changes for eligible short single-line samples; tests preserve content while varying formatting. No evidence of model voice adaptation, useful imitation or personal fidelity.
- Person verification: tests prove deterministic selected literal attribution/reference policies only. They do not prove factual truth, semantic relevance, completeness, contextual applicability or profession-specific suitability.
- Model behavior: entirely unverified. No provider call, real-model category/claim extraction, faithfulness test, clinical/investment evaluation or prompt-injection model test was performed.

## Final checks actually run

- Combined focused Jest command: __tests__/exp15, phase0/chat-engine, EXP14, phase0/retrieval, API chat/thinking-chat, EXP26 chat-access, phase0 shared/post-access: **140/140 tests across 14 suites**.
- TypeScript --noEmit --incremental false: passed.
- next lint --file for chat-engine, every owned dialogue module, all EXP15 test files and phase0/chat-engine.test.ts: no warnings/errors.
- git diff --check: passed. EXP14 generated timing audit files restored exactly.

No provider calls, full build, database generation/migration, production data, credentials, spending, push or deployment. Repository clean at committed handoff. Native concurrency/load/runtime proof and semantic/product acceptance remain separate.
