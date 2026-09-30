# EXP20 preflight checkpoint — stopped before provider requests

User approved the bounded pilot, conditional on all specified execution gates. **Pilot attempts: 0/48. No generation/rerank API calls, secret reads or new installs occurred.** Public documentation was read without authentication; it is not account-quota evidence.

## Prepared locally

Frozen v2: 6 complete synthetic cases and source-span gold propositions/answerability labels; 10 text sources (4 training/6 heldout), one whole heldout conversation (64 rounds/128 messages), 15 short synthetic retrieval distractors; public style references/rubrics; balanced seed-2717 order for 24 generation runs (2 variants × 6 cases × 2 repeats). Fixtures are wholly fictional. Full evaluation runner/adapters and captured token-verified request prompts are not yet ready/executed; do not claim the pilot is running.

Pinned original `5a723b6bf7c7e0d8d02cab6279d786b63a73307e`; candidate `6caea0f7b8ee1ca6f8701792ba7cc420ac2f3bbc`, as proposed. Eleven relevant files per arm copied byte-for-byte from git and hashed in `manifest.json`. `.ts.source` suffix keeps unmodified snapshots out of application typechecking; no source transforms or execution. Original-compatible store/transport binding remains required—never bind original retriever to the scope-required candidate store and call its empty result a baseline.

## Blocking gates

1. **Current account state/quota unavailable.** Available tools have no signed-in Groq Console access. Prior user Free confirmation is historical, not current evidence of remaining quota. Official rate-limit documentation describes organization-level limits and states exact account limits are in Console. Published Free defaults for this model are 30 RPM, 1,000 RPD, 8,000 TPM, 200,000 TPD. That does not prove today's remaining headroom or absence of other organization traffic.
   - Official API headers `x-ratelimit-remaining-tokens` refer to **TPM**, not daily tokens; a generation probe cannot establish 176,000 remaining TPD and is not being used to bypass the gate.
   - Need current Console Billing confirmation of Free/no Paid, exact organization/model limits (including input/output split if present), remaining applicable daily-window tokens **at least 176,000**, remaining requests **at least 48**, and reset window. If Console gives only limits, need used-token/request totals for that same quota window or provider evidence of remaining totals. A max of 200k is insufficient evidence of remaining 176k.
2. **Exact local token accounting unavailable.** No model-compatible Node tokenizer found; Python `tiktoken`, `transformers`, `tokenizers` absent; no cached `openai/gpt-oss-120b` model/tokenizer directory. JavaScript parser tokenizers are unrelated. No package/model download was performed. Need authorization for a pinned compatible tokenizer/tokenizer-data setup and verified Groq GPT-OSS chat-template/accounting method, then preflight original/candidate payloads including framing. Installing a generic tokenizer alone does not establish exact provider prompt accounting. The earlier proposal's conservative byte reservations are not used instead of this newly explicit exact-accounting gate.

Relevant primary source: https://console.groq.com/docs/rate-limits (current public table and header meanings checked during preflight). Account billing/cost and quota remain unknown; do not fabricate zero cost.

## Smaller option requiring a scope decision

If verified daily headroom is below 176k, six cases × two variants × **one** repeat gives at most 12 answer +12 rerank attempts = **24 total**, 78,000 reserved tokens (73,728 input +4,272 output), with the same per-call caps/pacing/timeout and a proposed 98,000 remaining-token gate including20k reserve. This halves repeats and weakens robustness; it is not being substituted automatically. Exact token accounting and current Free/noPaid confirmation remain mandatory even for that option.

Naturalness/human-study validation remains absent. No evaluative metrics have been produced. `ledger.json` records zero attempts and blocked gates. To resume, parent must provide/confirm the current account evidence and approved compatible-tokenizer setup; retain all original caps and persist each attempted request before sending it.
