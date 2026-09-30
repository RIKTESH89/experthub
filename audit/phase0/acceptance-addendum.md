# Narrow original acceptance reconciliation

## EXP10 summary freshness / invalidation

Policy: **conversation summaries are disabled and unsupported in Phase0**, rather than assigned a time-to-live. No conversation-summary model/field, generator, updater or summary retrieval branch exists in the schema/chat path. Do not introduce summaries through system-role history or unverifiable historical assistant output. Preserve original recent messages, selected newest-first on each request with `(createdAt DESC, id DESC)`, then reverse for prompt construction. Latest raw corrections remain in those rounds; older content outside the latest window is not compressed into a summary.

Evidence:
- `src/lib/ai/chat-engine.ts`: prompt contains the constructed system prompt, `authorizedHistory(chatHistory, scope)`, then the current query. It does not load conversation summaries. Legacy graph context is empty and inferred personality is excluded for nonowners; an owner personality/style profile is not a conversation summary.
- `src/lib/ai/history.ts`: system-role history is excluded; nonowner assistant output requires currently eligible cited sources. Each read rechecks source permissions/version. This is serving invalidation by exclusion, not physical deletion or summary regeneration.
- `__tests__/phase0/chat-engine.test.ts`, `EXP10 unsupported stale summaries cannot replace fresh raw conversation corrections`: injected system summary and unverified assistant summary both disappear from the actual constructed provider request; latest raw correction and current query remain in order. Provider fetch is mocked; no assertion of the model's behavioral obedience is made.
- Existing >50 latest-correction and stable-tie unit/Chrome tests cover fresh raw-message selection for both widget/subscriber paths.

Criterion interpretation: the requested freshness/invalidation policy is explicitly specified and tested as **no summary consumption**. A versioned rolling-summary implementation is not present. If the original issue requires an actual summary feature rather than preventing stale-summary influence, keep that portion open; do not equate exclusion with a tested refresh mechanism. Subscriber semantic memories are separate records and do not yet implement temporal conflict resolution; this test does not claim that older memory facts cannot influence a real model.

## EXP11 scoped latency comparison

`audit/phase0/localdb-latency.json` contains actual measurements:

| Variant | Median ms | p95 ms | Iterations |
|---|---:|---:|---:|
| Baseline namespace-only nearest-vector SQL shape | 0.171708 | 0.441625 | 20 |
| Current Phase0 authorized vectorStore query | 0.344083 | 0.670000 | 20 |

Protocol is in `scripts/phase0-integration/database.integration.ts`, `local SQL latency comparison records actual DB time with synthetic embeddings`: seed/index one synthetic source; obtain one synthetic 1536-dimensional vector and scope; sequentially time baseline Prisma raw SQL then candidate vectorStore query using `performance.now()` for 20 pairs. Baseline selects vector ID with namespace filter and nearest-vector ORDER/LIMIT; candidate includes authorization/model filters, more returned columns, validation and mapping. Both use the same local PostgreSQL cluster/vector/source and topK=5. Saved “median” is sorted index10 (upper-middle of 20); saved p95 is index19 (maximum sample), not interpolated percentile. No separate warmup, random ordering, concurrency or confidence interval.

This satisfies a bounded measured before/after **component** comparison. It is not identical-work benchmarking, end-to-end hybrid/generation latency, provider timing, production load or a scalability result. Candidate median is ~0.172ms higher in this tiny harness; do not infer production impact. If issue scope requires matched end-to-end latency/cost, that remains open. No new requests or DB run was made for this readout.

## EXP7 remains open

Original measured requirements for evidence precision/recall, supported/unsupported generated claims, abstention, naturalness and latency/cost are **not fulfilled** by these tests. Frozen fixture/golden cases, source/time split and command/environment baseline exist; no heldout model/person-quality evaluation or cost measurement exists. Mock tests, one-vector SQL timing and two simple prior Groq smoke answers do not substitute for those metrics. Do not close EXP7 on aggregate regression counts. Further provider evaluation requires separately authorized scope/budget.
