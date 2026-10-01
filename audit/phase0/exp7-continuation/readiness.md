# Remaining-case offline readiness and bounded continuation proposal

No provider calls, credential reads, installations, production data, publishing or deployment. Network execution remains disabled even when the execute function is given an approval argument. Existing completed H1/H2 pairs and both failed-run ledgers are unchanged. Preparation is within EXP7; a new approval is required for any continuation.

## Why the HTTP400 body was missing

The earlier diagnostic patch preserved successful-response finish reason/refusal/usage before rejecting schema or truncation, but still executed `if (!response.ok) throw` before reading an HTTP error body. I missed that non-2xx branch. The stopped EXP22 HTTP400 body was never persisted and cannot be recovered offline. Its database-field projection mismatch is confirmed from source and saved payload; the precise provider rejection reason remains unknown.

The prepared continuation reads non-2xx bodies before throwing, preserving only sanitized error type/code/message and reported usage shape. Actual Response JSON decoding and non-JSON text are covered; text snippets are bounded to1000 characters, control characters removed, known opaque runtime secret redacted. Read/parse failures record a safe error type, never raw exception/body/header data. HTTP errors remain terminal, regardless of a readable body. No failed-request usage is inferred as zero. Successful responses retain model, optional system fingerprint, choice count, finish reason, refusal, final-content type/length, numeric reasoning/cache details; raw reasoning text is not saved. Empty final content, tool calls, malformed JSON, missing/malformed usage, model mismatch and incomplete responses stop.

## Exact baseline/candidate fidelity

Original source5a723b6bf7c7e0d8d02cab6279d786b63a73307e; candidate6caea0f7b8ee1ca6f8701792ba7cc420ac2f3bbc. Same frozen fixtures/golds/splits/profile/store/embeddings/graph/memory mocks and unchanged pinned TypeScript retriever/prompts/chat engines. No model judge or change to application code.

Original widget route90-93 maps selected DB rows to role/content; candidate widget route95-99 maps role/content/sources, then actual candidate `authorizedHistory` produces provider-safe role/content. The repaired adapter reproduces those projections as well as each original ORDER BY/TAKE. Both variants pass the same strict wire validation and identical role/content-only serialization; it does not add candidate history semantics to baseline. On the128-message/64-round fixture, original sends its20 oldest history messages and misses the latest correction; candidate retains recent user history and includes twenty-engineer correction. Equal-timestamp original order remains one permitted frozen insertion order, since its SQL does not specify an ID tie-break.

QA captures all four completed H1/H2 requests through the repaired adapter and compares their serialized wire payloads **byte-for-byte** with the saved successful EXP22 requests. They match. Thus those completed pairs can be preserved without rerunning; the history correction affects only the faulty H3 adapter. Completed answers and ledger hashes are pinned in the new manifest, checked before mocked execution; any historical change fails closed.

This still uses synthetic channels/scopes, not actual embeddings/SQL/OAuth/full Next routes. Model ID is fixed, but server backend cannot be independently pinned; future fingerprints are retained where available. One-run measurements spanning a continuation are descriptive, not a statistical model-quality study.

## Every remaining frozen request

Schema audit against [Groq API reference](https://console.groq.com/docs/api-reference) and [GPT-OSS reasoning documentation](https://console.groq.com/docs/reasoning). The validator enforces the exact supported subset used here: model, messages, temperature, stream, max_completion_tokens, reasoning_effort, include_reasoning. Messages contain only string role/content, with allowed textual roles. No DB IDs/timestamps/sources, tools, functions, JSON schema, metadata, deprecated max_tokens, unsupported parameters or conflicting reasoning_format are sent. No instruction/prompt rewriting. Low effort and excluded returned reasoning are symmetric; internal reasoning still counts.

| Dispatch | Case/variant | Stage |
|---:|---|---|
|1|H3 original|answer|
|2|H3 candidate|answer|
|3|H4 candidate|rerank|
|4|H4 candidate|answer|
|5|H4 original|rerank|
|6|H4 original|answer|
|7|H5 original|answer|
|8|H5 candidate|answer|
|9|H6 candidate|answer|
|10|H6 original|answer|

All ten exact preflight payloads are captured in prompt-traces.json, with local Harmony counts229–371. Answers add disclosed512-token estimated host framing; reranks add256. H4 generation may change after live ranking: every possible five-chunk selection is bounded using the largest UTF-8 content byte lengths plus actual rendered message framing and host allowance. The bound is1886 candidate/1788 original, below4096. Actual outgoing prompts would be recounted before dispatch. Local counts do not prove Groq's hosted count; returned usage would enforce per-call and cumulative stops.

Both pinned retrievers skip reranking when eligible candidates≤topK5. H3 has0/0; H5 has5/4; H6 has5/3; only H4 has16/16. Both H4 paths invoke one native rerank. Candidate interleaving puts the keyword-only relevant chunk inside its15-candidate model budget; original vector-first order leaves it outside. Actual pinned parser remains unchanged: tolerant numeric extraction, duplicate/out-of-range filtering and score fill. No invented comma-only schema or forced rerank skipping. Tests replay duplicate/out-of-range/mixed text and prove distinct five-source results; score fill is preserved pipeline behavior, not evidence of successful semantic ranking.

## Offline QA

Command: `node --test scripts/local-test/exp7-continuation.test.cjs`. Final result: **37/37 passed**, zero failed/skipped,11916.509541ms. Exact log: mock-tests.log. `git diff --check` passed; original ledgers, completed-pair artifacts and frozen EXP22 runner showed no diff against HEAD. No production/application tests are recharacterized by this isolated QA.

Coverage includes complete exact H3-H6 sequence/pacing/no-resume; all frozen wire fields and budgets;128-message history/projection; byte-identical preserved H1/H2; real Response HTTP400 JSON and HTTP500 text redaction; HTTP429; malformed/non-object JSON; unexpected model; missing/negative/inconsistent usage; optional reasoning/cache bounds and null-as-unknown; prompt/output/cumulative overruns; truncation/refusal/invalid choice count/content/empty output/tool calls; fetch/body timeouts; rank failure latching through original internal fallback; third-rerank stop before dispatch; tolerant pinned rank parsing; correct keyword-only model-budget visibility; stage/total attempt boundaries; network disabled. Tests are mocked and do not demonstrate model faithfulness/naturalness or current quota.

## Exact new budget — remaining cases only

Four remaining cases×two variants=**8 answers**. Only H4 exceeds topK, so **2 native reranks**. Maximum **10 new attempted requests**, including failures/timeouts; no completed H1/H2 reruns, repeats, retries, exploratory calls or fallback. Unexpected third rerank, ninth answer or eleventh total attempt stops before dispatch and latches through retriever catch/fallback.

| Stage | New attempts | Input cap each | Completion cap each | Combined reservation |
|---|---:|---:|---:|---:|
|Answers|8|4096|2048|49152|
|Reranks|2|2048|1024|6144|
|New total|**10**|**36864 total**|**18432 total**|**55296**|

Existing history:6 attempted requests (EXP21 one plus EXP22 five), reported1853 prompt/1239 completion=3092 tokens, one HTTP400 with unknown consumption. Prospective combined16 attempts; known prior usage+new reservation58388 tokens **plus unknown HTTP400 usage**, not a proven exact aggregate cap. No daily-headroom or dollar-cost claim. New run counters enforce only its strict55296 ceiling and report old spend separately.

Proposed execution retains Groq GPT-OSS120B, existing accepted Free confirmation, same symmetric low/include_reasoningfalse parameters and temperatures,65 seconds after each completion,15-second request timeout, terminal stop on first HTTP/429/timeout/refusal/truncation/schema/usage/cap failure. Preserve older ledgers, create a new immutable continuation ledger and refuse restart/resume. No private/person/visitor data, embeddings, paid fallback, keys in logs or changes to production configuration. Await explicit approval; no new calls are currently authorized.

## Partial metrics caveats

Current measured evidence remains only four H1/H2 answers/two pairs. Strict frozen-gold retrieval precision20.0% original vs28.6% candidate; recall100% both;3 vs0 fictional restricted prompt chunks. These labels treat other useful/style chunks as irrelevant and do not measure claim entailment. Source scopes are mocked. Exploratory assistant clause review found unsupported explanatory extensions in both arms; not independently validated faithfulness. No model history/keyword/abstention results yet. Naturalness/style have no human ratings; dollar cost unmeasured. No automatic EXP7 closure.
