# EXP-17 acceptance continuation — 2026-10-11

Baseline `0a2cd602`, isolated branch `exp-17/acceptance-20261011`. Exact Linear acceptance read from task-5/evidence/linear/EXP-17.md. Issue remains In Progress. Experimental dialogue stays default OFF; this is a local synthetic release-envelope improvement, not semantic acceptance or a production safety change.

## Demonstrated repairs

The structured gate previously accepted arbitrary invented person beliefs, motives and experiences when an adapter called them supported. It now requires exact source quotations or a small structural preference/recommendation grammar matched to the literal source predicate and complete object. Recorded statements cannot become unqualified present-tense person beliefs. Existing recorded-source and historically qualified fixture paraphrases remain accepted; other faithful paraphrases may be refused.

Quoted words must occur inside a single adjacent cited span. Straight/curly double and boundary-delimited single quotations, escaped words, truncation and combined-span quotes are checked. Duplicate claim/reviewer references fail closed so the one-way set check cannot omit assessment of another citation. Supersession relations invalidate the referenced target even when the superseded-list channel is empty. HTML and Markdown source links require typed citations. A supported verdict without evidence is rejected; general-information remains the distinct unsourced discussion category. New applications require cited support and uncertainty.

EXP-14 separately repaired revoked manual-source author attribution. Existing revalidation and buffering tests cover permission/source failure after generation and after semantic judgment. This worker made no database changes.

## Synthetic evidence and tradeoff

`claim-evidence-traces.json` contains 26 new ordinary/adversarial cases using deliberately permissive synthetic review. Every declared deterministic policy expectation matches. These are newly constructed developer fixtures, not unseen-to-author blind semantic evaluation. Fixture safety labels are declared expectations, not human adjudication.

Positive means release: 7 safe releases, 18 unsafe blocks, **1 safe refusal (false negative)** and **0 unsafe releases in these fixtures**. The refused faithful synonym is “The recorded note expresses a preference for preregistered protocols.” Independent integration review identified the originally admitted unsafe statement “The expert has a medical doctorate.” under general-explanation as a repair finding. A bounded surface category-contradiction guard now rejects obvious represented-person belief/biography/motive/experience and first-person assertions under general, application or conversation labels. Exact supported source quotations and ordinary AI/help language remain usable. The new regression blocks that statement even with approving semantic labels. This fixture result does not establish full semantic coverage or justify enabling the local pathway. No semantic keyword classifier or provider verdict is treated as a truth proof.

The surface guard is deliberately bounded: indirect attribution, unnamed entities, unusual linguistic constructions, coded/multilingual person references or substantively false general statements can evade it. A category label plus matched reviewer label still does not establish absence of hidden person facts. Semantic classification and citation entailment generally require independently evaluated claim coverage and verification. The report claims only the stated fixture outcomes, not a zero semantic false-positive rate.

## Historical provider evidence inspected

Read-only saved artifacts and SHA256 hashes are in `historical-artifacts.json`. H03 received supported without citations for a general explanation; the new gate requires general-information instead. H09 blocked with adapter-or-permission-failure, demonstrating inconsistent review rather than accepted persona correction. H19's current preference was judged supported despite undated evidence and blocked by valid-time-unverified; the existing temporal gate is retained. Prior four-case wall times were about 130 seconds including pacing, so they do not establish bounded streaming latency. The H03 HTTP400 diagnostic and offline calibration are historical diagnostics, not new provider/human quality results.

## Checks run

- Native repository Jest, EXP-15 plus EXP-17: **215/215 tests in 11 suites passed** (`jest.log`). Runtime uses synthetic adapters/mocked stores; native Jest execution is not native database/provider validation.
- TypeScript noEmit/incremental false passed (`types.log`); scoped Next lint passed (`lint.log`); diff check passed.
- Deterministic trace runner: zero policy mismatches, zero provider calls.
- Ten synthetic latency samples with 5ms adapter delays: simulated unverified generation p50 6.33ms, verified full-buffer p50 26.36ms/p95 29.97ms. A hung-verifier 15ms deadline blocked in 16ms and emitted no risky draft. This is a local synthetic comparison, not production/provider time-to-first-token measurement. See `latency.json`.

Reproduce traces and timings with NODE_ENV=test EXP15_EXP17_LOCAL_EVALUATION=1 and `node -r ./scripts/exp15-exp17/register-alias.cjs -r ./node_modules/ts-node/register scripts/exp17/evaluate.ts` (or latency.ts). These explicit local commands never change a shared feature flag or call a provider.

## Remaining gates

Independent human-reviewed unseen entailment/attribution/time/inference and refusal-overreach judgments; evaluated provider claim coverage/classification; runtime provider latency; authenticated/native-store revocation acceptance; and release permission checks atomic with actual delivery remain open. Final checks are separate reads and changes after the final read can race response emission. No human ratings, semantic model scores, new provider calls, external transmission, credentials, live database mutations, billing/browser work, push or deployment occurred. Integrator owns independent review, combined checks, Linear updates and any protected staging release.

## Independent review repair

Integration review required fixing the explicit category-laundered doctorate rather than retaining it as an accepted limitation. The bounded category guard and ordinary conversation controls now pass. EXP-14 reviewer identified missing negative auxiliaries and unmatched single quotations; targeted regressions now cover do/does/did and contracted negatives, source-quotation boundaries and safe first-person quoted evidence. The final 26-case confusion trace has zero unsafe releases in these declared fixtures and one deliberate faithful-synonym refusal; broader semantic error rates remain unmeasured.

Final quotation review found a curly-apostrophe contraction could end a quote at don’t and hide an invented remainder. Closing-boundary parsing now handles contractions, and full-gate truthful/misleading negative-source quotations are tested. Exact curly/straight recorded-source quotations remain usable without treating source speaker first-person words as a new biography.

The final independent quote review also demonstrated early closing at a plural possessive (trials’ outcomes). The parser now takes the complete outer single quotation and rejects unmatched residual closing delimiters; full-gate truthful and invented plural-possessive cases pass for curly and straight singles. Multiple separately quoted single fragments on one line can conservatively refuse rather than joining source support across ambiguous boundaries; this is an additional disclosed potential refusal-overreach case.
