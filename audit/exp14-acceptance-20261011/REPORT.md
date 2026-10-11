# EXP-14 scoped acceptance continuation — 2026-10-11

Baseline: delivered `0a2cd602` (`exp-14/acceptance-20261011` isolated worktree). Exact acceptance source: `task-5/evidence/linear/EXP-14.md`. Prior negative-preference replay, publisher/source lock ordering and native acceptance are present; they were not reimplemented.

## Concrete changes

- Active temporal-v3 bundle selection searches the complete bounded source record rather than only its first 24 unique terms. The question/keyword plan remains capped at 24 terms. Documented reasons, alternatives and tradeoffs can now anchor decision evidence in addition to situation, constraints and exceptions.
- A directly related, already authorized stance is ordered beside its relevance-ranked seed; contradiction takes priority over supersession or unresolved alternatives. Repeated supporting spans cannot exhaust the evidence context first in the tested literal-contradiction saturation case. This reorders candidates only; tenant/source/audience checks, candidate/record/byte/hop caps and provenance remain intact. If a related opposing/superseding record cannot fit, a specific gap warns against presenting the selected stance as uncontested.
- The live SQL evidence gate compares a manual source's current declared author to the persisted evidence revision author. Changing author metadata without a source-version bump can no longer retain a stale owner claim. Missing, null and malformed author metadata consistently map to unknown; unchanged unknown authorship remains readable without acquiring endorsement.
- Retained temporal-v1, unlabeled timelines and temporal-v2 preserve their prior selection and serialization. The new `literal-temporal-authorized-selection-v3` policy is the active default for newly authored release manifests, while existing v2 manifests remain pinned to the prior selector. Both v2 and v3 use authorized negative replay and compaction; the manifest format, typed evidence contract, extractor and budget are unchanged. **48 full-bundle byte comparisons** against the delivered frozen v2 selector pass over rare anchors, decision/comparison questions and byte-pressure variants. The original frozen v1 boundary checks also pass.

## Executed evidence

- **115/115 offline tests, 12 suites**: EXP12/13/14, dialogue citation revalidation and EXP16 retrieval compatibility. `jest.log` and `jest.json` contain the exact run. Ten new selection/adversarial cases and seven disposable-fixture safety cases include late rare keywords, documented decision anchors, saturation, revocation and deterministic selection.
- TypeScript `--noEmit --incremental false`: exit 0 (`types.log`). Focused Next lint: exit 0 (`lint.log`). Diff whitespace check is clean.
- `saturation-comparison.json`: hand-authored adverse support saturation at the same **4,096-byte** budget. Retained-v2 required-position recall is **0.5** (supporting records only); active-v3 is **1.0** (support and contrary position). Baseline selects 2 records / 2,462 conservative units; candidate selects 2 / 2,568 (including the new omitted-relation gap). Fifty pure-bundle CPU samples per variant record local medians. This comparison is **not** the Phase0 frozen baseline, general held-out recall/precision or human quality evidence. It excludes SQL, embeddings, network/model latency and provider cost.

Tests that regenerate historical EXP14 audit fixtures were executed; their old artifact bytes were restored, so the scoped commit does not overwrite historical evidence.

## Prepared native SQL acceptance, not executed here

Seven new cases in `scripts/launch-integration/retrieval.integration.ts` use the existing guarded disposable fixture (`integration_exp14`, port 55447, `integration_synthetic`) and real `syncKnowledgeItem`, source/revision SQL and retrieval callers:

1. Warm manual owner attribution → unknown, third party or malformed author, without a version bump: no spans, evidence or citations survive.
2. Warm unknown author → declared owner, without a version bump: old revision fails closed until republished.
3. Unchanged absent, null and malformed manual author metadata: source spans remain visible with null author.

Integration owner will run these in the centralized disposable fixture. An optional owned socket mode accepts only `EXP14_OWNED_SYNTHETIC_CLUSTER=1`, database `integration_exp14`, role `integration_synthetic` and an explicit `/tmp/experthub-exp14-acceptance-*[/socket]` host. Runtime identity also requires a null server port in that mode. The original fixed-port target remains unchanged. Offline safety cases reject wrong database/role, missing socket, traversal and credential-bearing URLs. Preparation and compile success do not establish native SQL success. No database mutation or native execution occurred in this worker.

## Remaining acceptance gates

EXP-14 stays In Progress. Semantic-only paraphrase without a lexical/source-field anchor can still abstain. Bounded scan can miss evidence beyond 100 candidates. Relation prioritization retains literal direct conflicts in the tested fixture, but does not guarantee every conflict under arbitrary byte pressure or provide semantic duplicate clustering. Broad independent held-out precision/recall versus Phase0 at equal budget, actual authenticated/runtime revocation, real serving latency/token/provider costs and human reviewed retrieval quality remain open. No provider request, external source transmission, credential creation, billing change, push/deploy, production or live database operation was performed.

Independent review and centralized native/combined verification are pending at this author checkpoint.
