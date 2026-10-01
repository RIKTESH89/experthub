# EXP7 diagnostic correction and proposed next pilot

No additional provider calls. The EXP21 ledger, execution log, failed output disposition, original runner and frozen artifacts are preserved unchanged. A separate prepared runner `scripts/local-test/exp7-pilot.cjs` supports only offline mocked execution; actual execution explicitly rejects pending a new approval. No credentials are loaded by its CLI preparation or mocks.

## Root-cause facts

The existing saved first response has reported usage 376 input / 256 completion / 632 total and 1328.915375 ms latency. Local rendering counted 312; the observed hosted difference was 64. Model/usage validation passed; the next combined completion gate failed. The original harness saved neither choice count, finish reason, refusal, content type nor reasoning-token details before rejection. There is no saved provider response body to inspect. Exact completion-cap usage suggests truncation, but does not prove `finish_reason=length`; the original result must stay classified as unknown completion/schema subcondition.

The removed rerank-only regex did not cause the first failure: that request was an answer, not a rerank.

The correction records HTTP status and response diagnostics before any model/usage/completion rejection: returned model/status, choices type/count, finish reason, content type/length and up to 1000 characters of sanitized final content, refusal type/presence/text, reasoning type/length, tool-call count, numeric prompt/completion/total/reasoning/cached usage where exposed. Raw reasoning text, arbitrary provider fields, headers and raw transport exceptions are excluded. The known opaque runtime secret is redacted from persisted textual fields. Missing provider reasoning-token details remain null, not inferred as zero. Distinct failures are truncation, refusal, unexpected finish reason, invalid choice shape and invalid final content. Existing timeout/HTTP/usage/overrun stops remain.

## Comparability check

Both arms execute pinned original/candidate retriever, prompt and chat-engine code unchanged via the repository's installed TypeScript transpiler. Original SHA `5a723b6bf7c7e0d8d02cab6279d786b63a73307e`; candidate SHA `6caea0f7b8ee1ca6f8701792ba7cc420ac2f3bbc`. Same Groq model, source snapshot, profile fields, synthetic store/vector channels, empty graph/memories, topK=5, generation temperature0.5/rerank0, balanced case order and token/transport settings. No JSON answer schema or additional person-memory feature is introduced. Original/candidate authorization/history differences intentionally remain.

An unnecessary comma-only rerank regex was imposed by EXP21's harness, although both real pinned retrievers accept numeric tokens mixed with other text and fill missing choices by score. The prepared runner removes that invented schema restriction and retains the actual parser/fill behavior. Non-numeric rank text can therefore yield a score-filled selection, exactly as the real pipeline does; future reports should identify that event rather than assert successful semantic ranking. The completion guard still requires one stopped text choice, since this bounded protocol rejects incomplete responses/tool use/refusals; these are transport validity checks, not a JSON answer-format constraint.

This remains an adapted controlled synthetic evaluation. Store candidates and permission scope are mocks, not live embeddings/SQL/auth. History route ORDER BY/TAKE semantics are reproduced over frozen rows, with the actual candidate helper executed. Original same-timestamp ordering is not specified by its SQL; the mock uses frozen insertion order, which is one possible original ordering, not proof of a live DB tie outcome. No full Next route/session/UI is exercised here. Human naturalness/person fidelity are not established by offline mocks or this six-case pilot.

## Proposed approval: 14 new attempts, larger completion allowance

Keep all six cases, labels, splits and balanced one-run pairs. The frozen pipeline skips reranking except H4, so authorize **at most 14 NEW attempted requests: 12 answers plus 2 reranks**. Count the existing failed EXP21 attempt separately: **15 combined pilot attempts**, no use of its invalid response as a completed pair. Do not fill unused attempts or automatically retry. Preserve the old ledger; new approved execution would use a new immutable run ID/ledger.

| Stage | New attempts maximum | Input cap each | Completion cap each (includes reasoning) | Reserved total |
|---|---:|---:|---:|---:|
| Answers | 12 | 4096 | 2048 | 73728 |
| Native reranks | 2 | 2048 | 1024 | 6144 |
| New run | **14** | **53248 combined** | **26624 combined** | **79872** |
| Plus known previous consumption | **1 spent** | **376 actual** | **256 actual** | **632 actual** |
| Combined envelope including spent request | **15** | **53624** | **26880** | **80504** |

Apply **`reasoning_effort:"low"` and `include_reasoning:false` symmetrically**, using **`max_completion_tokens`** for the table's completion caps; do not also send `reasoning_format`. Hiding returned reasoning does not eliminate internal reasoning tokens or change their budget. Groq documents low effort for GPT-OSS and separates returned reasoning control. [Official reasoning documentation](https://console.groq.com/docs/reasoning)

2048 answers restore the original application's existing generation allowance and provide eight times the failed pilot cap; 1024 rank completions provide room for reasoning about 15 short candidate chunks rather than the original 100-token cap. They are practical bounded allowances for ordinary short answers, not experimentally proven sufficient. No exploratory tuning requests are proposed. The parameters/caps are a proposal only and have **not** been enabled in the prepared offline runner; its existing mock flow still uses EXP21-sized requests. On approval, freeze the new payloads and hashes before dispatch.

Keep exact local Harmony counts plus disclosed framing estimates (512 answer,256 rank). New payload local count+estimate must fit each input cap before dispatch. Preflight all possible selected contexts; exact official local counts do not guarantee Groq's hosted count. Enforce observed per-call caps, new cumulative input53248/output26624/total79872, attempt14/answer12/rank2, and report prior632 separately. Maximum per-request reservation is6144 tokens, below the published8kTPM, subject to actual organization limits/other traffic. Existing accepted Free confirmation, no daily-headroom guarantee, no paid fallback. Serial65 seconds after completion,15-second timeout, stop on first HTTP/429/timeout/truncation/refusal/invalid response/missing usage/cap overrun. No retries, tools, embeddings, judges, private data or production configuration changes. Dollar bill remains unmeasured.

Do not change system/user messages to accommodate the model; doing so would redefine the original pipeline. No automatic EXP7 closure. Preserve every attempted pair and report incomplete pairs, supported/unsupported claims and abstention only when valid final content exists. Naturalness/style remain unvalidated without blinded human ratings.

## Verification

`node --test scripts/local-test/exp7-pilot.test.cjs`: **11/11 passed**, zero failed/skipped. Tests cover complete mocked pairs/pacing/no-resume; HTTP429, timeout, missing usage, accounting overrun, truncation stop; sanitized finish/status/refusal/reasoning usage; distinct malformed response diagnoses; persistence before rejection; actual tolerant rerank parser; provider execution disabled. These are mocked results, not provider outcomes. `git diff --check` passed. `git diff --exit-code HEAD -- audit/phase0/exp21 scripts/local-test/exp21-pilot.cjs` confirmed the existing run ledger/artifacts/runner unchanged before this commit. No application code changed; the prior full-app baseline is not rerun or recharacterized.
