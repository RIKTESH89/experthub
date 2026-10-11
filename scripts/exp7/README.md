# Reproducible offline EXP-7 protocol

This package executes the native structured dialogue kernel using existing fixed synthetic generator/reviewer adapters. It does not call a model, retrieval database or external service. Both variant labels run the same kernel: protocol parity, not an architecture comparison. Sources/questions have been inspected by developers and cannot be described as an unseen human study.

Run from the checkout (read-only existing dependencies suffice):

```sh
NODE_ENV=test EXP15_EXP17_LOCAL_EVALUATION=1 node -r ./scripts/exp15-exp17/register-alias.cjs -r ./node_modules/ts-node/register scripts/exp7/run-local.ts audit/exp7-acceptance-20261011/run-1
NODE_ENV=test EXP15_EXP17_LOCAL_EVALUATION=1 node -r ./scripts/exp15-exp17/register-alias.cjs -r ./node_modules/ts-node/register scripts/exp7/run-local.ts audit/exp7-acceptance-20261011/run-2 audit/exp7-acceptance-20261011/run-1/manifest.json
node node_modules/jest/bin/jest.js --runInBand __tests__/exp7 __tests__/exp15
```

The manifest pins exact source documents/chunks, whole-source groups, cutoff and disjoint time periods, eligible corpus, dataset/code/prompt hashes, synthetic model/verifier identities, settings and equal byte/call/time caps. Every August 2026 held-out document, neighboring chunk, premium source and other-person document stays outside retrieval/generation contexts. An unseen *question* can use the frozen eligible corpus; unseen *documents* cannot. Questions about withheld reasons/exceptions must abstain/clarify. Historical/current/contradictory/source-revocation cases remain distinct.

The native run freshly invokes adapters on every repeat and saves actual generator/verifier requests and outputs. Stable trace comparison excludes only measured local elapsed time; no cached response file is replayed. Since adapters supply predetermined answers/judgments, repeatability proves harness determinism, not provider variance or semantics. Provider cost/tokens/latency and human faithfulness/style/naturalness remain null. Preassembled source-ID accounting is not a retrieval precision/recall measurement. `retrievalMetrics` and `providerAccounting` are tested formulas for separately saved, correctly scoped observations; absent usage/billing never means zero.

Reviewers receive only `reviewer-packet.md` and blank CSV. The packet includes prior conversation and source attribution/time/conflict/gap snapshots. Keep the coordinator key, expected outcomes and raw traces separate. Human forms have no ratings. No reviewer contact is performed/authorized by the package. Blinding is partial because the text can reveal conditions. Use two independent raters, a 1–5 or not-assessable score with evidence for every answer/dimension, and recorded adjudication. Record claim-level entailment, unsupported person statements and abstention separately from style/usefulness. Sparse reference style should be not-assessable; it cannot establish personality.

Completed ratings can be exported as JSON rows `{ reviewer, blindId, answerHash, dimension, score, evidence }` and imported locally:

```sh
node -r ./scripts/exp15-exp17/register-alias.cjs -r ./node_modules/ts-node/register scripts/exp7/import-ratings.ts audit/exp7-acceptance-20261011/run-1/coordinator-answer-key.json completed-ratings.json audit/exp7-acceptance-20261011/human-results.json
```

The importer rejects wrong answer pins, duplicates, missing reviewer/evidence and invalid scores. Incomplete ratings cannot create aggregate quality numbers. Complete annotations still require provenance/adjudication and do not automatically mark any issue Done.

Future provider protocol is proposal-only in `audit/exp7-acceptance-20261011/provider-protocol.md`; current provider authorization is exactly zero. Frozen implementation changes deliberately invalidate this manifest. Integration must regenerate a new manifest/evidence directory and rerun, preserving this baseline packet and historical Phase0 ledgers.
