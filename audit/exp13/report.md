# EXP13 temporal stances and evidence-backed decision cases

Local implementation based on EXP12 commit191acabab7ad8e4c8b6a81693cee20f2ca59dcad, branch exp13-temporal-decision-cases. **Candidate implemented and tested; human semantic review remains required before Done.** No external provider/embedding calls, new dependencies, production data, push/deployment or EXP14+ work. EXP7 remains independently open.

## Implemented source-to-query path

Additive migration20261001100000_temporal_stances creates TemporalStance and EvidenceDecisionCase in the existing PostgreSQL/pgvector stack. Immutable source revisions/spans, source audience, tenant identity and retirement remain EXP12's foundation. Temporal rows reference revision/span/tenant, have append-only update triggers and deterministic revision/span/extractor identities. Decision cases reference the supporting stance and exact span; retrieval verifies their span matches the stance rather than trusting a malformed cross-source case.

Existing post/manual text indexing publishes temporal projections in the same source-CAS/evidence transaction. Existing owner-only one-source backfill rebuilds them without models or re-embedding. Replaying/concurrently rebuilding the same revision does not duplicate cases or stances. Editing/deleting/unpublishing source evidence retracts serving eligibility while retained historical records stay auditable. Account/expert removal retains the existing cascade behavior. No separate timeline job/service is deployed.

`temporal/extractor.ts` implements a bounded literal English parser (version literal-temporal-decision-v1): optional From/As of date, optional until date, In domain, For context, then first-person prefer/recommend/choose/chose, principle or boundary. It copies because-reasons and explicit constraints/alternatives/tradeoffs/exceptions and instead-of/supersedes wording. Unsupported prose, invalid dates and ambiguous quotes abstain. Missing reasons/context/domain/dates remain null/UNKNOWN. No topic-to-personality inference, invented biography or synthesized motives. Existing text/post input modalities are unchanged; this grammar is limited coverage, not an assertion that general prose is fully understood.

Expert-authored, third-party description, quoted speech, unattributed upload and visitor-claim origins remain separate. Visitor here means an explicitly quoted synthetic Visitor claim in a source; authenticated chat visitor claims remain in their existing conversation path and are not silently converted into expert beliefs. Quoted/described/unknown speakers remain source-local unresolved mentions, not merged people by name. Manual declared authorship remains a declaration, not independent identity verification. Only expert-authored ownership supports owner endorsement. Principles/boundaries are linked to source spans; unsupported cross-case links are not invented.

Cases retain situation, constraints, chosen action, documented reasons, alternatives, tradeoffs and exceptions. `chose` is labeled documented-choice (the source reports it), whereas prefer/recommend/choose are recommendations. No external verification of actual life events is claimed. Source-explicit/source-reported certainty is an evidence-origin label, not a calibrated probability or guarantee of truth. Assertion kind supports explicit/inferred/unknown; this parser makes explicit/unknown stance records, while derived conflict assessments are distinctly labeled inferred with uncertainty.

## Temporal semantics and disagreements

Valid time is source-declared date information; recorded time is immutable EvidenceRevision.ingestedAt. Original publication time remains unknown for old posts as in EXP12. Day-level validity uses UTC midnight, inclusive start and exclusive until; the human review packet explicitly asks whether this convention matches intended wording. Undated stances remain available only with valid-time-unknown uncertainty, never silently dated by ingestion recency.

`resolveTimeline` (literal-validity-v1) has distinct current and as-of query modes. Optional knownAt independently applies a recorded-time cutoff. As-of concerns valid time described by **currently authorized/current source revisions**, not historical permissions or a reconstruction of everything the system knew then. Retired/deleted revisions remain unavailable in answer retrieval even for old dates; retained audit history is a separate concern.

Current/as-of selection does not use newest-wins. Same-speaker/domain/context/constraint/category literal positive-negative overlaps are labeled source-supported inferred contradiction; different preference/decision choices are unresolved-disagreement, not declared logically incompatible. Distinct principles/boundaries can coexist without fabricated disagreement. Context/constraint differences and third-party speakers do not become expert contradictions. A source-declared replacement suppresses a matching old stance only from a supported effective date; both spans remain in the trace. An undated replacement remains unresolved. Restricted replacement cannot suppress a public stance or leak a hidden relation: relationship derivation sees only current, allowed source spans.

`authorizedEvidenceSpans` is the shared SQL permission/source gate for EXP12 assertion retrieval and EXP13 temporal retrieval. It checks live post flags/content, item/source version, indexing, tenant and current entitlement. Stance/case joins additionally enforce matching revision/span/tenant provenance. Results explicitly declare selected-source, nonexhaustive coverage (bounded to100 authorized spans); absence of a relation is not proof no contradiction exists anywhere.

The actual chat engine receives temporal stance/case context and returns structured temporalTrace in source metadata, alongside EXP12 evidenceTrace. It supports an explicit typed temporalQuery and the existing question-text prefix “As of YYYY-MM-DD, …”; arbitrary dates mentioned in questions do not silently change mode. Invalid explicit dates fail closed before generation. Broader language interpretation, contextual simulation, answer verification and naturalness are not implemented or claimed in this slice. Legacy unprovenanced graph descriptions remain quarantined.

## Acceptance evidence

| Criterion | Verified evidence |
|---|---|
| Supported speaker/domain/context/recorded+valid time/certainty/kind | Literal extraction tests and actual PostgreSQL traces; recorded and valid time independently tested; nullable fields preserved |
| Situation/action/reasons/constraints/alternatives/tradeoffs/exceptions | Exact-span decision-case fixture; missing-reason fixture stays null; scenario recommendation vs documented choice separated |
| Evidence-backed principles/preferences/boundaries | Source-span FK/immutable rows, explicit-source tests; distinct compatible principles/boundaries do not create conflicts |
| Contradictions, supersession, unresolved disagreement | Nonoverlapping dated positive/negative periods; undated contradiction uncertainty; different-choice disagreement; dated/undated replacement; no recorded-recency winner |
| Current vs as-of | Native PostgreSQL retrieval plus actual chat engine using question-text date selector; separate knownAt cutoff; deleted/retired evidence never resurrected |
| Quotes/uploads/visitor/third-party separate | Origin/endorsement tests and source-local speakers; quoted disagreement does not become an expert stance |
| No personal attributes from cooccurrence | Topic-only security/anxiety/family/leadership source creates zero stances/cases |
| Preserve access/retraction/replay | Restricted supersession/public visibility; warm entitlement downgrade; edit/unpublish/deletion/foreign tenant; independent two-source support/replay; mismatched restricted decision-span rejection |
| Additive rollback | EXP13 tables dropped only inside rollback proof transaction; EXP12 sources/evidence persist; exact traces restored after rollback |
| Human representative review | Six cases and source spans prepared; **NOT reviewed/sign-off pending** |

## Exact validation and baseline

- New unit tests: **18/18 pass**; new real PostgreSQL tests: **12/12 pass**.
- Existing EXP12 DB checks: **14/14 pass**. Existing Phase0 DB/fresh-Chrome checks: **26/26 pass**; fake auth/model and synthetic embeddings, no full Next/OAuth/provider test claim.
- Full offline suite: **739/751**, exactly the same12 preexisting failures by full name, compared with EXP12's721/733. No added failures; baseline-comparison.json records names/counts.
- TypeScript: same41 existing diagnostics; no new src/EXP13 integration diagnostics. Not globally green.
- Next lint and diff whitespace: clean.
- Existing PostgreSQL18.6/pgvector0.8.6, Prisma6.19.2, disposable experthub_phase0_test at127.0.0.1:55432. Migration deploy applied only the additive local migration;13 migrations now present. No installations or production migrations.
- Broader regression run initially found the old EXP12 rollback test attempting to drop parent tables before new temporal FK dependencies. PostgreSQL refused and rolled back safely. Fixed proof order: EXP13 rollback first, then EXP12 rollback, all inside a transaction. The failed evidence is preserved as before-ordered-rollback-exp12-integration-jest.json/log; the final14/14 result is separately preserved. No production constraint removal or blanket CASCADE was used.

Commands: `node node_modules/jest/bin/jest.js --runInBand --json --outputFile audit/exp13/full-jest.json`; `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/next/dist/bin/next lint`; `bash scripts/exp13/run-local.sh`; `EXP13_INCLUDE_REGRESSIONS=1 bash scripts/exp13/run-local.sh` additionally runs EXP12/Phase0 regression suites. Runner uses only the existing approved cluster, disables dotenv loading, refuses occupied/running instances, and stops PostgreSQL on exit. Original earlier evidence artifacts are preserved; regenerated regression traces/timings are copied into audit/exp13 rather than overwriting historical evidence.

## Review and rollout boundaries

`human-review-packet.md` contains six representative source-backed cases: dated periods, undated contradiction/disagreement, rich/missing-reason decisions, attribution separation, documented principle/boundary, and dated supersession. `human-review-form.csv` has six PENDING rows. `review-cases.json` carries full identities/structured traces; review-packet-provenance.json hashes it. Verify source wording, temporal boundary convention, context/exception scope, missing fields, endorsement and replacement interpretation. No reviewer was contacted and no human scores/approval were fabricated.

`answer-trace.json` records the actual chat-engine as-of path with an in-process fake response, not generated-model faithfulness. `rollback.sql` removes only EXP13 tables. For a complete evidence rollback, revert the app/export retained evidence, then roll back EXP13 before EXP12; reconcile Prisma migration bookkeeping explicitly. Local proofs roll back their DDL and leave data/schema intact. No retention purge or production bulk backfill has run; existing retention limitations remain.

No execution blocker remains. Required human semantic review is the outstanding Done gate. Narrow grammar, uncertain historical publication time, limited selected-source coverage, literal grouping rather than semantic identity/context reasoning, and untested model faithfulness/naturalness remain explicit limitations. No EXP14+ implementation or EXP7 closure is implied.
