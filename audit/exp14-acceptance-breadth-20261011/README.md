# EXP-14 additional retrieval breadth controls

Reviewed runtime: `43b784a4e71fc985ae178e1d7ab764f0ff4a85d1`. This is an independent developer-authored synthetic audit, not independent human gold or an embedding/provider benchmark. No application source changed. Thirteen tests assert the observed contract, including two provisional quality mismatches; **13 passing assertions do not mean 13 successful relevance outcomes**.

Run: `./node_modules/.bin/jest __tests__/exp14/acceptance-breadth.test.ts --runInBand --json --outputFile=audit/exp14-acceptance-breadth-20261011/jest.json`. Types: `tsc --noEmit --incremental false`. Targeted Next lint: `next lint --file __tests__/exp14/acceptance-breadth.test.ts`. Focused13/13 and combined EXP14 + temporal reader84/84 across9suites pass; types and lint pass; exact output and per-case source IDs/precision/recall are retained here.

The actual frozen Phase0 retriever and candidate intent orchestration receive identical injected vector hits under a 4,096 conservative byte-unit maximum. Candidate extraction, negative preference replay, time resolution and selection execute. Embedding/vector/assertion/temporal stores are mocked, keyword results are empty, reranking provider keys are absent in the test child process, and fetch throws if attempted. Native SQL, embedding calibration, model answers and human relevance are not tested. The baseline cap applies to raw source text; the candidate cap covers its structured bundle overhead. This controls maximum allowed size, not equal filled context or provider tokenizer accounting. Baseline top-five behavior, rather than a fabricated baseline selector, executes.

| Case | Candidate source-set result under developer gold | Evidence and limit |
| --- | --- | --- |
| current-time / asof-time | Both precision 1, recall 1 | Present vs past differ; baseline includes both, precision 0.5 each |
| recorded-knownat | Empty, expected | Source recorded after historical knowledge cutoff is excluded |
| decision-pair | Precision 1, recall 1 | Both positive/negative rows; two-operator constraints, audited-systems/disposable-pilot exceptions and contradiction survive serialization; 2,997 units, one hop |
| late-rare-name | Precision 1, recall 1 | Literal name beyond first 24 source terms remains searchable |
| unknown-topic | Empty, expected | Explicit missing evidence; no generic stance substituted |
| whole-source-withheld-neighbors | Empty, expected | Entire held source and both neighbor chunks excluded from allowed IDs; serialized bundle contains no sentinel. This is an exclusion control, not a train/heldout quality experiment |
| warm-audience-revocation | Empty, expected | Mock current authorization excludes a row despite warm allowed IDs; SQL revocation is covered separately by existing native evidence |
| cross-tenant-neighbor | Empty, expected | Mock temporal boundary excludes foreign tenant row; no serialized foreign sentinel |
| conversation | Empty, expected | No evidence needed for greeting |
| biography-unavailable | Empty, expected gap | Biography routing does not establish biography extraction. Current literal extractor lacks this fixture's biography capability |
| semantic-only-paraphrase | **Provisional miss: recall 0** | Injected high-score embedded-datastore hit cannot seed tiny/in-process/database query without lexical/source-field anchor. Independent semantic adjudication/calibrated embedding result remain unrun |
| different-context-neighbor | **Provisional extra context: precision 0.5, recall 1** | Same domain expands from startup/NacreStore to Fortune500/AuroraAPI. Different context is retained explicitly; this is extra context under strict developer gold, not evidence of an unsafe generated answer |

Empty gold/selection precision or recall is null, not a fabricated 100%. No aggregate heldout score is promoted from these intentionally mixed controls. Observed local timings are instrumentation overhead with mocks, not provider/end-to-end performance; timing and conservative token fields remain in traces.

The initial harness mistakenly supplied an explicit current query for the as-of string, overriding the routing being tested. `initial-harness-jest.log` preserves that 12/13 harness failure. The corrected harness lets explicit as-of text route normally. No application fix is claimed from that change.

Continue with independently frozen source-level/time-level relevance gold, representative paraphrases and domain-context counterexamples, then run native retrieval with calibrated embeddings only after bounded provider/data approval. Decide expected behavior for biography evidence and context neighbor inclusion before treating either as a defect or accepting a generic fallback. Current/source-time/access controls remain useful but cannot close EXP-14's broader heldout metrics and latency acceptance.
