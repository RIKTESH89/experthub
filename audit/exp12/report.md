# EXP-12: one-source evidence-backed PostgreSQL KG slice

Implemented locally on `exp12-evidence-backed-kg`, based on `abef3c938ff24d4aa5c5af8c8b2db32bdd448894`. No push/deployment, production DB, real visitor data, external model/embedding calls, new dependencies or EXP13+ changes. EXP7 remains open and its protocol-deviation records are untouched.

## Schema and identity decisions

Additive migration `20261001090000_evidence_backed_kg` adds `EvidenceRevision`, `EvidenceSpan`, `EvidenceAssertion`, `EvidenceSupport` and the derived `EvidenceEdge` view to existing PostgreSQL/pgvector. Prisma models describe the four tables; SQL additionally owns append-only triggers, CHECK constraints and the view. No new graph database.

Revision IDs deterministically hash tenant, item, source version/content hash, declared author, uploader, audience, publication-time value/basis and extractor version. Hash canonicalization is SHA256 of JSON.stringify inputs (including content strings), as implemented by hashEvidence; do not substitute raw UTF8 hashing when replaying identity. Immutable snapshot text is exactly the vector input (`title + two newlines + body`); offsets are UTF-16 indices. Ingestion timestamp is recorded once by PostgreSQL. Source-update observation time is retained separately, not used as publication time. Post records have no original publication timestamp: `publishedAt=null`, `publicationTimeBasis=unavailable`, not a fabricated date. Manual metadata can supply a source-declared publication date, explicitly identified as such. Recovering historical actual post publication time is a missing-input limitation; the slice represents that uncertainty.

Post author comes from the current authoritative post row; uploader is the expert account. A manual upload is NOT assumed to be authored by its uploader. Optional existing metadata authorId is a declared attribution, not an independently verified identity. Quotes use explicit named-speaker labels, never automatically endorse the owner, and unresolved quoted/unknown subjects are source-local mentions. The same name in two sources is not merged into a resolved person.

The local `literal-preference-v1` extractor handles newline-separated `I prefer …` / `I recommend …` and `Name said/wrote: "I prefer/recommend …"`. It preserves complete supporting lines and overlapping 1000-character/200-overlap chunk links. Ambiguous quotes, unsupported syntax and lines longer than 2000 characters abstain. It produces explicit/unknown assertions; schema permits inferred but this slice creates no inferred beliefs. No hosted extractor call or fabricated inference.

Assertion identity is tenant + attributed subject/predicate/literal object/kind/endorsement/extractor version. Supports link assertions to immutable spans/revisions. Edge identity is assertion identity; weight is DISTINCT active supporting revisions, not rebuild count or number of repeated spans. This is a literal attributable assertion graph, not a completed ontology, entity resolver, decision-case model or multi-hop reasoner.

## Wired source-to-answer path

1. Existing post API/outbox projects post/text into KnowledgeItem. Existing vector indexing remains unchanged.
2. `performIndexJob` publishes evidence in the same transaction as the version-CAS vector manifest. An evidence failure rolls back publication and remains a retryable lifecycle failure. Reordered jobs cannot publish a superseded source.
3. `removeKnowledgeItem` retires revision support in the source deletion transaction; historical snapshots/supports remain. The derived edge disappears only when its last active source disappears; unrelated support is preserved.
4. `retrieveEvidenceTrace` uses selected AND allowed chunk IDs, current tenant/source version/content, current live post state/audience and current SQL entitlement. A stale scope after downgrade/edit cannot authorize stale assertions. It recomputes visible selected-support weights, preventing restricted support from influencing a public weight or answer trace. The administrative EvidenceEdge view aggregates support and is NOT an audience-authorized retrieval API.
5. `runChatEngine` consumes only these supported assertion/span contexts; old unprovenanced graph descriptions remain quarantined. Attribution instructions distinguish quoted/unknown speakers from owner endorsement. Each source citation carries its allowed evidenceTrace; subscriber/widget routes already persist/stream these source objects. A model-free synthetic trace is saved in `answer-trace.json`.
6. Owner-only `POST /api/expert/graph/evidence/[itemId]` performs bounded one-source backfill/rebuild, deriving tenant from authenticated owner. It does not re-embed or call a model. Missing/foreign/unindexed/unsupported source returns404.

Existing legacy graph builder/statistics are not silently replaced; they remain owner-only legacy functionality, quarantined from generation. This slice's evidence graph is separately backed by the new tables/view and wired to source indexing and answer traces. Full UI navigation or production rollout is not claimed.

## Acceptance reconciliation

| Criterion | Verified local evidence |
|---|---|
| Same revision rebuilt twice, same assertions/edges/weights | Real DB test compares entire traces, identities, row counts and edge weight1; additional concurrent rebuild test serializes and retains one revision/support |
| Author/uploader/quoted speaker distinction | Post quote test; third-party/unknown manual upload test; unresolved same-name speakers stay source-local; prompt explicitly forbids implicit endorsement |
| Two supports, remove one, retain other; remove last unavailable | Edge/trace weight2→1→absent; two immutable historical revisions/supports retained |
| Superseded excluded, history auditable | Live edit immediately blocks stale scope before sync; new revision becomes current; old spans/revision retained and retired |
| Restricted derivatives stay restricted | Public weight1 despite public+premium support2; stale entitled scope after downgrade removes premium support; draft/hide/RAG disable/delete revoke; forged-owner/foreign-tenant negative tests |
| Immutable ID/hash/time/audience/span/support | Database triggers reject snapshot update; exact-span unit tests, stable IDs and chunk links; unknown publication time represented explicitly |
| Allowed assertion/span answer trace | Actual chat engine/native PostgreSQL retrieval with synthetic embeddings and in-process fake chat response; trace persisted as reviewable JSON |
| Additive schema/backfill/rollback | Migration applied only to disposable test DB; one-source owner route tested; rollback DDL executes inside a transaction, leaves Post/KnowledgeItem intact, and transaction rollback restores exact trace |

All 14 EXP12 database test names/results are in `integration-jest.log/json`. Eight extractor/attribution unit cases and three backfill route cases pass in `full-jest.json`. No real model faithfulness/naturalness claim follows from mocks.

## Exact validation and baseline

- Existing PostgreSQL18.6 / pgvector0.8.6, disposable `experthub_phase0_test`, localhost127.0.0.1:55432, preserved task `.phase0-runtime/pgdata`; migration deploy reports12 migrations, only new additive migration applied initially.
- Prisma client6.19.2 regenerated locally with synthetic DB env and dotenv path disabled; no package installation.
- EXP12 real DB: **14/14 pass**. Existing Phase0 real DB/fresh Chrome: **26/26 pass**, two suites; Chrome154.0.8037.59, fresh contexts, local HTTP bridge/fake auth/model. No full Next/OAuth/model testing.
- Full offline: **721/733**, the **same12 preexisting failures by exact name**, vs prior710/722. `baseline-comparison.json` records equality; EXP12 adds11 passing unit/route checks.
- TypeScript: **same41 existing diagnostics**, no new src/EXP12 integration errors. Type check is not green.
- Next lint and `git diff --check`: clean.
- Initial integration fixture failed because mocked embeddings omitted validateEmbedding; corrected mock retains actual validation. Initial tsc fixture tuple typing produced two new errors; corrected. Final artifacts record successful checks; neither was waived.

Commands: `node node_modules/jest/bin/jest.js --runInBand --json --outputFile audit/exp12/full-jest.json`; `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/next/dist/bin/next lint`; `bash scripts/exp12/run-local.sh`. To also rerun the existing26 DB/Chrome checks, use `EXP12_INCLUDE_PHASE0=1 bash scripts/exp12/run-local.sh`. Runner refuses a running cluster/occupied port, uses only the provisioned synthetic cluster, disables dotenv loading, applies migrations only there, and stops PostgreSQL on exit. All ephemeral processes exited; pg_ctl reports no server running.

## Backfill, retention and rollback

Backfill only current indexed post/manual text sources through the owner-only single-item route or `rebuildEvidenceSource(expert,item)`. No automated production bulk backfill/reindex has run. Unsupported existing PDF/blog inputs remain outside this slice and do not get guessed authorship. Replay uses immutable existing revisions and does not increment weights. Extractor changes must use a new version and explicit rebuild; they create auditable new projections.

Source deletion/edit retires serving support but retains immutable original text/spans/assertions for audit. Account/expert deletion cascades evidence removal. No automatic age purge is installed; owner-approved retention/purge/export policy must precede production rollout. Auditable retention does not mean deleted sources remain answer-eligible.

`rollback.sql` drops only the new evidence view/tables/functions. First preserve any required evidence export, revert application to pre-EXP12, then execute an approved DB rollback. It does not touch original Post/KnowledgeItem/vector tables. It deliberately does not alter Prisma migration bookkeeping: a deployment rollback must reconcile migration state explicitly. Local proof executes the actual DDL in a transaction and rolls it back, leaving schema/data intact; no production/destructive persistent rollback occurred.

No execution blocker remains for this local slice. Limitations: historical publication time absent, narrow English literal extractor, no inferred reasoning or verified third-party identity, no model quality evaluation, no full UI/production deployment or automatic retention policy. Those facts are not silently waived or claimed as later architecture completion.
