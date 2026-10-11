# EXP-15 acceptance continuation — 2026-10-11

Baseline `0a2cd602`, isolated branch `exp-15/acceptance-20261011`. Existing structured dialogue implementation was retained; experimental path remains gated and default OFF. No applicable checkout/ancestor AGENTS.md or .agents skill instructions were found.

## Implemented and tested

- Request-local chronological continuity candidates preserve the current raw goal, constraint/correction turns, recent questions, prior answer commitments and full accepted recent turns. These are untrusted candidates, not inferred facts or an automatic semantic state extractor. Corrections remain ordered for semantic review; an explicit topic reset clears prior task candidates. Assistant content never enters user turns or expert/style evidence. An already-present trailing current query is appended once; this is not a database idempotency proof.
- Short follow-ups retain the active goal's medical/investment/research context. Independent new goals and explicit topic changes stop inheriting prior risk. This uses bounded lexical routing, not measured semantic topic detection.
- Reviewable owner-authored surface profile measures question/preference markers, sentence/paragraph cadence, repeated vocabulary, explicit example markers and sample lengths. Coverage is selected snippets (three samples, up to 500 characters each), never full authored writing, inferred personality or preferred answer length. Human resemblance/naturalness remain null. Failed, revoked, quoted/unendorsed and superseded evidence cannot define this profile. The synthetic expected-span check was repaired to include source authorization and invalidation; fixed outcomes/answers were not changed.
- Caller cancellation reaches structured generation, semantic verification and live evidence reads. Pre-cancelled turns make zero adapter calls; interrupted turns abort their adapter signal, block draft bytes and do not run repair. A fresh request retry succeeds without retained state. Cancellation subscriptions are removed after each async call. The focused chat-engine hunk forwards the existing transport signal; frozen default implementation is unchanged. Widget routing now supplies the request signal, guards transform/flush and cancels the upstream pipe on disconnect. Three integration regressions exercise the actual structured/frozen engines with injected local adapters/provider transport and assert no draft/completion writes after cancellation.

## Evidence

`jest.log`: 416/416 tests in 28 suites passed, covering EXP-15, chat-engine, chat/thinking-chat, widget and EXP-26 regressions. TypeScript `--noEmit --incremental false`, focused ESLint and `git diff --check` pass. These are local synthetic/injected-store/transport checks; no live database/provider tests ran in this lane.

`paired-transcripts.json`: two fixed conversations / six turns for subscriber correction and medical-to-recursion topic shift. Answers and semantic verdicts are fixed synthetic fixtures. Captured generator state, independent verifier state digests and reviewable style profiles establish plumbing/retention only. They do not establish real semantic constraint satisfaction, faithfulness, naturalness or person resemblance.

`structured-evaluation.json`: existing 25-turn contract corpus, zero contract failures, zero real provider calls. Human/model quality ratings remain null. Reproduce both artifacts from this checkout:

```sh
NODE_ENV=test EXP15_EXP17_LOCAL_EVALUATION=1 node -r ./scripts/exp15-exp17/register-alias.cjs -r ./node_modules/ts-node/register audit/exp15-acceptance-20261011/generate.ts
```

## Open acceptance

Human blinded style/naturalness/faithfulness and unseen model paraphrases are NOT RUN. Real provider behavior and end-to-end streaming latency are NOT RUN. The local structured path buffers verified answers before delivery; this lane does not claim native streaming or atomic authorization-with-emission proof. Runtime state continuity semantics depend on the independently judged adapter and caller-authorized history, not lexical candidate selection alone. Native visitor/session isolation, persistence/concurrent retries and widget interruption need combined route/database evidence. EXP-16 separately owns widget terminal/transactional-persistence acceptance. Cancellation during an in-flight database commit cannot be undone by this transport patch.

EXP-15 remains In Progress. No paid/provider calls, external transmission, credential creation, live DB mutation, billing/browser usage, push/deploy or production operation occurred.
