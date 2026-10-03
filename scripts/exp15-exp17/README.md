# Local structured dialogue evaluation

The runner uses fixed held-out synthetic conversations and separate generator/review fixtures. It performs no network or credential access. Every proposal remains free-form text rather than an informational reply catalogue. Gold case outcomes/review data are absent from the adapter requests; the fixed review fixture observes the reserved response annotations rather than reading live generator annotations. The synthetic adapter fixtures themselves supply predefined responses and verdicts, so this is contract testing, not a blinded model evaluation.

Run from the owned checkout:

```sh
NODE_ENV=test EXP15_EXP17_LOCAL_EVALUATION=1 node -r ./scripts/exp15-exp17/register-alias.cjs -r ./node_modules/ts-node/register scripts/exp15-exp17/run-local.ts
```

The runner also caps the run at 40 turns and 30 seconds, and each turn at two generation/verification attempts.

The alias registration pins TypeScript compilation to CommonJS for this local runner only. No client generation or build is required.

Results separate deterministic outcome/reference/budget/context/style-eligibility checks from semantic/model scores and human ratings. Model/human scores remain null. Use the rubric and response records for later independent review. Do not describe mock pass rates as factual accuracy, conversational usefulness, personality fidelity or professional safety.

A real-model generator and independent verifier can implement the exported adapter contracts later. Both the pipeline and runner currently reject real-model adapters before invocation; no credential/provider factory exists in this change. Enabling real-model evaluation requires separate authorization, provider adapters, budget controls and an evaluated semantic gate. The frozen production/default chat path stays unchanged.

Adapter inputs are detached/frozen, and approval snapshots are rechecked across async boundaries. Accepted current queries are preserved in full up to 8000 characters; oversized history/context is explicitly rejected rather than silently truncated. Returned diagnostic Dates are readable and JSON serializable but reject mutation, including prototype-setter bypasses; use JSON for diagnostic copies because `structuredClone` cannot clone their protected proxies. New runs must use fresh live evidence rather than treating returned diagnostics as retrieval authority.
