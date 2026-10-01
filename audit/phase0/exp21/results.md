# EXP21 stopped pilot result

The approved revised pilot ran on 2026-10-01, first dispatch 06:13:28 UTC. It stopped after **1/24 attempted requests**, **0 completed pairs**, **0 valid answers**. No retry, second request, rerank, fallback, private data or paid-plan change occurred. EXP7 remains open; EXP20's original blocked gates remain unsatisfied.

## Setup and checks

Only the six approved binary wheels were installed in ignored `.phase0-runtime/exp21-venv`; package pins/hashes are in `tokenizer-requirements.txt`. Official vocabulary and pinned template passed SHA256 verification. Synthetic offline Harmony count test returned 10 tokens. Existing secret stayed ignored and was loaded opaquely only by the runner; it is absent from ledger/logs. Free-plan confirmation was accepted as approved, without claiming current daily headroom.

Preflight freeze commit `3ff79ac`: unchanged six fixtures/golds/time split, original `5a723b6bf7c7e0d8d02cab6279d786b63a73307e`, candidate `6caea0f7b8ee1ca6f8701792ba7cc420ac2f3bbc`. Source hashes and actual preflight prompts are preserved. Predicted native execution was 12 answers plus 2 reranks, 14 calls, within the 24 ceiling. All local prompt counts were 229–371 plus disclosed estimated framing (512 answer/256 rerank). Seven offline tests passed: successful full mocked flow; HTTP429, timeout, missing usage, token overrun, incomplete response, malformed rerank stop without retry/fallback. Successful mocks are not model-quality results.

## Actual request and stop evidence

The original H1 Ada expertise answer request reached Groq. Reported usage: **376 prompt / 256 completion / 632 total tokens**; full-response latency **1328.915375 ms**, headers **1325.662208 ms**. Local Harmony rendering counted **312**, so observed hosted-minus-local difference was **64 tokens**, inside the estimated framing reservation for this one request; this does not establish a general upper bound or server-template equivalence.

Model and numeric usage validation passed; per-call/cumulative accounting caps were not exceeded. The completion/schema gate failed. The guard requires exactly one choice, `finish_reason=stop`, and string final content. The exact failed subcondition/finish reason was not persisted, and cannot honestly be reconstructed without another request. Completion usage exactly reached the approved 256-token cap, making truncation a plausible explanation, not a verified finish-reason finding. The guard discarded invalid final content; there is no retained valid answer to assess.

The original dispatched prompt included five fictional Ada chunks, including `PRIVATE_ADA_SENTINEL`. This is measured original prompt exposure of owner-only **synthetic** evidence, not real private data or measured generated leakage. Against the unchanged strict H1 heldout relevance label, its selected-evidence precision is 1/5=0.20 and recall 1/1=1.00. Other public chunks may partially answer the preference; these values follow the frozen narrower heldout labels. No candidate call occurred, so no paired access or retrieval gain is established here.

Claims/support, abstention, person distinctiveness and paired latency are **not measured**. Naturalness/style are **unvalidated** without blinded human ratings. No repeat variance is available; dollar billing cost is unmeasured. Source, profile, audience, vector, graph and history adapters/limitations are described in `protocol.md`; this was not the full deployed application or live DB/auth evaluation.

## Next decision, not executed

Keep this failed attempt in the permanent ledger; do not resume or overwrite it. Any next run needs new explicit authorization. A revised experiment should first retain sanitized choice count, finish reason and final content type even on validation failure. Groq documents GPT-OSS low/medium/high reasoning effort; lowering effort symmetrically and budgeting more completion tokens could make final answers/reranks feasible, but neither guarantees success. Increase rerank budget as well if selecting a reasoning model; the original 100-token rank cap may also truncate. Freeze new transport parameters and revised reservation before any new request. No such changes or calls were made in this run.

Artifacts: `manifest.json`, `prompt-traces.json`, `preflight.log`, `mock-tests.log`, `ledger.json`, `execution.log`, `metrics.json`, `protocol.md`, `tokenizer-requirements.txt`. The runner process exited with status 1 as required; no persistent process/service was started.
