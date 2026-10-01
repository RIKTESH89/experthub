# EXP22 partial paired results — stopped on HTTP400

Approved run stopped after **5/14 attempted requests**, **4 valid answers**, **2 completed pairs** (H1 Ada professional preference and H2 Ben preference). Attempt5, original H3 recent-history case, returned HTTP400. The terminal stop worked: no candidate H3, rerank, H4-H6, retry, extra request or fallback ran. EXP7 remains open; this is partial evidence, not completion of the six-case benchmark.

## Frozen setup and actual execution

Original source5a723b6bf7c7e0d8d02cab6279d786b63a73307e; candidate6caea0f7b8ee1ca6f8701792ba7cc420ac2f3bbc. Same six frozen fixtures/golds/time split, balanced order, one run per pair, same Groq GPT-OSS120B, temperatures, low reasoning effort, returned reasoning excluded, answer2048/rank1024 completion caps. Exact local Harmony counting plus512/256 estimated host-framing reservations; hosted accounting not guaranteed. Synthetic profile/vector/permission/graph/memory adapters, no full Next/SQL/auth app in this experiment. No private sources, production data, embeddings, model judges, publishing or deployment.

Frozen executable commitc0ec5ee followed a local initialization fix: the first launch accessed test-only counters with absent mock configuration, before ledger creation/provider dispatch. That launch made0 requests; its local checkpoint is preserved. Re-freeze passed17/17 tests including absent-mock initialization. Actual run subsequently started; ledger/logs preserve every attempted request and sanitized output/diagnostics. The original EXP21 failed-request ledger is unchanged.

## Failure diagnosis and offline repair

The stopped original H3 request included DB-only message fields `id`, `createdAt`, and `sources`. This **verified harness mismatch** came from reproducing ORDER BY/TAKE but omitting the original widget route's `.map(({role,content}))` projection. Frozen original widget route lines90-93 explicitly project only role/content; candidate route projects role/content/sources, then its actual history helper produces safe role/content provider messages. This error belongs to the adapter, not evidence of a failing original application or inaccurate model memory.

HTTP status400 was retained, but that provider error body was not captured. We cannot prove its exact error reason. Unknown message fields are a plausible cause; no inference is presented as a saved provider diagnostic. No additional call was made to investigate.

A separate **offline-only repair** (`scripts/local-test/exp7-repair.cjs`) now reproduces both exact route projections, rejects unexpected provider message fields before dispatch, and preserves redacted HTTP error type/code/message. Tests prove original history retains older team-size messages while candidate sees latest correction, without DB fields in either provider payload. All20/20 repair/mock tests passed. Neither stopped ledger nor original frozen runner/traces were rewritten; repaired preflight and tests are in `audit/phase0/exp7-repair`. Repair CLI/provider execution remains disabled pending any new authorization.

## Measured evidence on completed H1/H2 pairs only

| Metric | Original | Candidate |
|---|---:|---:|
| Completed answers |2|2|
| Strict eligible-gold precision |2/10=20.0%|2/7=28.6%|
| Strict eligible-gold recall |2/2=100%|2/2=100%|
| Fictional restricted chunks included in prompts |3|0|
| Cross-person chunks included |0|0|
| Median nonstream answer response latency |1390.5ms|1028.3ms|
| Reported prompt/completion usage |757/534|720/449|

Precision uses unchanged narrow heldout gold IDs. Other partially useful public/style chunks count irrelevant under these labels; precision is retrieval relevance, not generated factuality. Both answered their own expert's basic documented preference (Ada monolith; Ben independent services). Original prompts included one fictional owner-only Ada chunk and two premium Ben chunks; candidate excluded these. No literal restricted sentinel appeared in the four answers, which does not prove absence of semantic influence from restricted inputs. Authorization is a mock scope in this pilot, not a new measurement of real user permissions.

One paired draw per case, differing answer lengths, possible provider caching and only two completed cases make the latency figures descriptive. Headers are not first-token latency; enforced65-second waits are separately included in pipeline wall time. No significance, production performance or causal speed improvement claim.

## Exploratory semantic claims review

All four valid answers are annotated as distinct factual propositions in `claims-review.json`, with exact answer hashes, eligible source spans and reasons. Original:9 supported/12 unsupported (21 assessed); candidate:8 supported/8 unsupported (16 assessed). Exploratory support precision42.9%/50.0%. No contradicted/ungradable proposition was assigned in this limited review.

These are **assistant judgments**, not independent blinded human adjudication or automatic entailment validation. Unsupported means absent from eligible evidence; it may be plausible general engineering advice, not false. For example, answers expanded the source's “reduce operational work” into deployment/monitoring/debugging benefits and delivery improvements; neither synthetic source documented those detailed causal claims. Candidate also changed a documented reconsideration trigger into an exclusive “only if” condition. This shows the remaining grounded-generation gap rather than establishing real-person fidelity.

No invented biography was observed in these professional answers, but the actual unknown-experience abstention case was never run. No abstention, keyword-only live reranking, recent-history model behavior, temporal consistency, preference evolution or real-person distinctiveness measurement is available. Naturalness/style rubrics remain unvalidated without human ratings. Do not generalize these two pairs to the complete benchmark.

## Usage, limits and remaining gate

Four successful responses reported **1477 input +983 completion =2460 tokens**. Reasoning-token details were present:32,25,29,35 respectively; hiding returned reasoning did not remove their consumption. Failed HTTP400 returned no usage, so its token consumption is **unknown**, not zero. Prior EXP21 consumed reported632 tokens/1 failed attempt. Combined known reported usage3092 tokens across6 attempted requests; this is not an exact total including unknown error usage. Dollar billing cost is unmeasured; accepted user Free confirmation is not live account billing evidence. No observed token cap overrun occurred.

Remaining cases need8 answers+2 native reranks=10 requests if the four valid H1/H2 outputs are reused. That would bring this restart to15 attempts, exceeding the approved14 ceiling, so no continuation is authorized automatically. A new approval could authorize a separately frozen repaired continuation; it must preserve the two valid pairs and failed request, disclose adapter corrections, use unchanged model/prompts/settings, and count all spent attempts. Worst-case remaining reservation55296 tokens (8×6144+2×3072), plus reported prior usage and unknown HTTP400 consumption. This is a proposal, not an executed or approved run.

Artifacts: ledger.json, execution.log, manifest.json, prompt-traces.json, preflight.log, mock-tests.log, metrics.json, claims-review.json, local-launch-checkpoint.json, exp22-run.md; separate repaired artifacts under exp7-repair. The model runner exited status1 on its mandated stop; no persistent process/service remains. Phase0 application's existing full-test/type baseline was not rerun or recharacterized for these isolated harness/document changes.
