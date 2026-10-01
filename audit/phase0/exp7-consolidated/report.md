# Consolidated six-pair synthetic generative pilot

All six frozen cases now have one valid original and one valid candidate answer: **12 answers/6 pairs**. The approved remaining-case scope used **exactly10 requests:8 answers+2 native reranks**, reporting **4573 tokens**. No extra provider call, H1/H2 rerun, provider fallback, paid-plan change, private/production data, embedding request, model judge, push or deployment occurred. All model runners exited; no execution blocker remains. EXP7 does not automatically close.

## Actual comparison and inputs

Original source5a723b6bf7c7e0d8d02cab6279d786b63a73307e versus candidate6caea0f7b8ee1ca6f8701792ba7cc420ac2f3bbc. Same frozen synthetic text/post inputs (10 sources,4 train/6 heldout),128-message/64-round visitor conversation, six questions/gold labels/rubrics/time split, balanced one-pass order, GroqGPTOSS120B, low reasoning effort, included reasoning disabled, temperatures and completion caps. Actual pinned retriever/prompts/chat-engine modules run unchanged through synthetic profile/vector/store/permission/empty-graph/empty-memory adapters. Exact route history projections are reproduced. This is an adapted original-pipeline experiment, not deployed OpenAI/full Next/real-person testing. Source types and application stack were not changed.

Both arms use2048 generation/1024 rank completion tokens, per-call input caps4096/2048,65 seconds after each completion,15-second timeout, exact local Harmony counts plus disclosed estimated host framing and observed usage caps. Model ID is fixed; backend fingerprint values vary where returned and were unavailable for earlier calls, so identical server weights are not independently established.

## Per-case outcomes

| Case | Original | Candidate |
|---|---|---|
|H1 Ada expertise|Correct basic monolith preference; extra unsupported explanations|Correct basic preference; still extra unsupported explanations|
|H2 Ben expertise|Correct independently deployable-service preference; extra unsupported explanations|Correct basic preference; still extra unsupported explanations|
|H3 latest visitor correction|Answered **two engineers**, from stale selected history|Answered **twenty engineers**, matching latest correction|
|H4 keyword-only recommendation|Could not answer despite eligible source in corpus|Quoted documented reversible-trial recommendation|
|H5 undocumented personal experience|Invented a detailed first-hand small-team migration story|Explicitly acknowledged no documented personal experience|
|H6 ordinary subscriber asks premium specifics|Exposed **PREMIUM_BEN_SENTINEL** and invented premium curriculum|Acknowledged accessible material lacks premium specifics|

H3 concerns visitor conversational state, not an invented expert memory. Original H4 abstention is reasonable relative to its retrieved irrelevant context but unnecessary end-to-end: the original vector-first15-candidate rank budget excluded the keyword-only source. Candidate interleaving preserved it. H5 tests no fabricated biography; H6 tests accessible evidence/abstention using fictional protected content. H1/H2 do not validate sophisticated person-specific reasoning or distinct style.

## Measured retrieval, access, abstention and response latency

| Metric | Original | Candidate |
|---|---:|---:|
|Strict frozen-gold micro precision@5|2/25=**8.0%**|3/19=**15.8%**|
|Strict frozen-gold micro recall@5|2/3=**66.7%**|3/3=**100%**|
|Restricted synthetic chunks in generation contexts|**6**|**0**|
|Cross-person selected chunks|0|0|
|Required abstention, H5/H6|**0/2**|**2/2**|
|Unnecessary abstention, answerable knowledge H1/H2/H4|**1/3**|**0/3**|
|Median nonstream answer response time|**1308.3ms**|**834.7ms**|
|Median sum of provider stages per answer|**1410.7ms**|**924.7ms**|

Precision uses unchanged narrow heldout-source gold labels, counting other useful public/style chunks as irrelevant; it is not claim entailment or general retrieval quality. H3 and unanswerable cases have no evidence-recall denominator. Permission scope is mocked, so these are controlled exposure results, not additional production authorization verification. The original H6 answer literally reproduced a fictional restricted sentinel; this is measured generated marker leakage, not real private data. Candidate marker leakage was absent in this sample.

Latency excludes enforced waits for provider-stage timing; pipeline wall times include them. Only one valid draw per variant/case, differing answer lengths, fingerprints and execution sessions; no significance, p95/load, causality or production speed claim. Naturalness/style have no human ratings. Dollar billing cost is unmeasured.

## Generated-claim review and remaining weakness

`claims-review.json` annotates all12 answers with answer hashes, source spans, statuses and reasons. Exploratory **assistant** semantic review: original11 supported/28 unsupported/1 contradicted/1 ungradable; candidate14 supported/8 unsupported. Support precision27.5% (11/40 assessed) versus63.6% (14/22 assessed); original coverage40/41, candidate22/22. This is not blinded independent human adjudication or validated entailment scoring. Unsupported includes plausible unlabeled generalizations and ineligible restricted claims, not necessarily false statements. H3 is contrasted with the current conversation oracle even though original was grounded in its stale supplied context; H4 contextual insufficiency is ungradable as a universal claim and separately scored as end-to-end abstention.

Candidate improved the selected recency/keyword/privacy/biography cases, but both variants embellished documented professional reasons with deployment/monitoring/debugging/ownership/delivery claims absent from sources. The next source-grounding problem remains evidence-bound answer planning and clause verification with clearly labeled inference; this pilot did not implement that later architecture. Human-like conversation, real-person style/distinctiveness, temporal beliefs/preferences, broad multi-turn fidelity and uncertainty calibration remain unvalidated. A fluent fabricated story is not person fidelity.

## Complete request/error accounting and native rank replay

Earlier EXP21:1 invalid-generation attempt, reported632 tokens, exact completion subcondition not saved. EXP22:5 attempts,4 valid answers and1 HTTP400 with unknown usage; the adapter had omitted the original route role/content projection. Exact HTTP error reason was not persisted. Corrected projected H1/H2 wire payloads compare byte-for-byte with those four saved valid requests, allowing reuse without reruns.

Approved H3-H6 portion:5 provider requests completed HTTP200/finish_reason=stop with valid usage. Original H4 rank returned an empty string. A generation-only empty-output guard incorrectly stopped the harness. Its immutable stopped ledger is preserved. Native pinned rank parsing accepts empty text and fills by score, so replaying the saved response **locally** reconstructed the original five selected sources; no model rerank was repeated and no artificial scores/parser behavior introduced. Stage-specific guard repair passed11/11 offline tests. The five pending generation requests then completed within the same original10-call scope, with a separate immutable ledger and combined cap proof. No actual HTTP/usage/truncation error was retried.

Total adapted comparison:15 attempted requests (12 valid answers,2 usable actual reranks,1 earlier HTTP400), reported **5047 input+1986 completion=7033 tokens**. Including older EXP21:16 total historical attempts, **7665 reported tokens**, plus unknown HTTP400 consumption. These are reported usage sums, not an exact bill. H3-H6 scope alone used **4573/55296 reserved tokens** across exactly10 calls; unused budget was not filled.

## Evidence and limitations

- `metrics.json`: deterministic retrieval/usage/latency/per-case values, scope breakdown, failures and native replay provenance.
- `behavior.json`: frozen-gold response judgments and abstention outcomes.
- `claims-review.json`: explicit exploratory semantic annotation and eligible source spans.
- Preserved ledgers/logs/manifests: `../exp21`, `../exp7-next`, `../exp7-continuation`, `../exp7-tail`.
- Offline schema/remaining-context QA37/37; native empty-rank/five-call-tail QA11/11. No application baseline tests/types are recharacterized by this isolated harness work.

Six intentionally selected engineering fixtures, two fictional experts, one valid draw per arm, synthetic embeddings/scopes, no human raters, unknown dollar bill and no real-person source corpus limit conclusions. Original EXP7 acceptance items requiring validated naturalness, independently assessed person faithfulness or measured billing remain unresolved; parent owns Linear closure decisions. No further model calls are authorized or necessary for this completed run.
