# Prepared human assessment package — no assessment run

Prepared from the frozen integrated43b784a fixed-run artifact. No humans were selected/contacted, no scores/gold were entered, no messages sent, no provider calls made, no live data changed and no external distribution occurred. All criteria below are proposals; none is accepted by the user merely because this package exists.

## Three separate tracks

| Track | Ready material | What it can establish after actual human work | What it cannot establish |
| --- | --- | --- | --- |
| Fixed synthetic output review | `reviewer/fixed-outputs.json`:116 blinded trace records,29 logical turns,15 distinct answer texts;1672 blank rating rows include two independent rater slots plus workflow dimensions | Human assessments of these exact fixed answers against their captured context; documented shortcomings, disagreement and insufficient references | Genuine implementation comparison, independent model repeats, natural provider semantics, real person resemblance, cost/latency or unseen human-authored quality |
| Genuine unseen human gold task | Reviewer instructions and empty `coordinator/blank-human-gold.json` propose16 NEW human-authored cases under sealed HG IDs | Independent gold only after actual authoring/adjudication/freeze before candidate exposure, followed by separately authorized answer generation/rating | Developer-authored/stress-exercised seed cases do not become genuinely unseen because humans later validate them |
| Isolated workflow assessment | Six unrun local fixture task cards for correction/release/rollback/failure recovery | Human comprehension, safe next-action choice and task execution in the specified in-memory fixture | Hosted authenticated workflow, real writes/provider delivery or source/DB safety from ratings alone |

The116 fixed records retain exact answer SHA-256 pins. Implementation labels, original case/outcome labels, expected answers, model/prompt settings and verifier verdicts are confined to `coordinator/`. Reviewers receive question, recent conversation, captured source authorship/time/audience, source gaps and eligible author-only style snippets. Missing viewer-entitlement/final delivery authorization is stated rather than fabricated. Current style references are sparse synthetic snippets; insufficient resemblance evidence must remain not-assessable, not a style pass.

## Scope mapping

| Scope | Human task | Additional gate that this packet does not close |
| --- | --- | --- |
| EXP-7 | Separate faithfulness/style/naturalness/usefulness/abstention ratings; genuine independent gold/freeze; explicit duplicate denominators | Distinct actual implementations, approved matched provider/service/model/budget, fresh repeat runs and measured cost/latency |
| EXP-14 | Author/evaluate current/as-of, contradictions, exact names, constraints/exceptions and authorization-sensitive claim contexts | Native retrieval recall/precision and source/tenant/entitlement isolation at current access state |
| EXP-15 | Corrections, applicable constraints, unresolved questions, commitments, independent new goals, identity boundary; separate style and naturalness | Real conversational generator behavior, genuine authored style corpus, real streaming latency and native visitor/retry/persistence semantics |
| EXP-16 | Mistaken feedback versus owner evidence; targeted correction adoption, immutable manifest/config replay and safe rollback task comprehension | Actual correction→future-answer behavior, native transactional replay/revocation/concurrency and hosted authenticated scope |
| EXP-17 | Human claim-level entailment/attribution/time/access and appropriate inference/abstention; report false positives and false negatives | Semantic model/verifier performance on genuinely unseen independent gold, measured buffering latency and final delivery permissions |
| EXP-25 | Concrete error recovery, stale-preview invalidation, ambiguous activation versus confirmed success, unauthorized UI clearing | Exact hosted authenticated/runtime journey and real OAuth/session/source integration |

`reviewer/INSTRUCTIONS.md` and `RUBRIC.md` separate all rating dimensions; `fixed-outputs.md` provides the same exact records in a readable format. `coordinator/PROPOSED-GATES.md` specifies independent rater/author/adjudicator selection, proposed thresholds, adjudication, approximate time and exact user decisions. Thresholds/reference minima are explicitly NOT approved. No issue may be marked Done from package validation or blank forms.

## Distribution and validation

Distribute **only the `reviewer/` directory** to explicitly named/approved reviewers, via an approved local route. Coordinator keys, manifests, gold/developer expectations, candidate stress outputs and implementation details remain separate. A folder separation is not an access-control mechanism; the coordinator must enforce the recipient boundary. No recipient or sending route is currently authorized.

The validator checks116 unique blind IDs, a complete one-to-one trace key, exact answer hashes, source author/time/access fields, author-only style eligibility,1672 complete blank rows, six workflow cards, scope coverage and absent label/gold/rating leakage. Four adversarial mutations (changed answer, duplicated ID, exposed implementation label and invented rating) are rejected. It proves package integrity, not human quality, confidentiality against a recipient with coordinator access or successful task execution.

```sh
python3 audit/exp-human-assessment-20261011/build-package.py --source /absolute/integration/audit/exp-acceptance-integrated/final-run-1
python3 audit/exp-human-assessment-20261011/validate-package.py
```

Current machine result: PASS,116 records,1672 blank rows,6 task cards,0 ratings,0 detected reviewer label leakage,0 provider calls. Source trace/manifest hashes are pinned in the coordinator manifest. The separate EXP-17 developer seed input at `audit/exp17-human-authoring-20261011/developer-seed-inputs.json` is referenced by SHA-256 `0289ede542af512ece538998902ea9375b11e2b7c2b751720e516da6d6a73ff7` as calibration-only. Its private expectations/stress results are not distributed before independent gold is sealed. HG001–HG016 are the official proposed NEW human-authored IDs; EXP-17's S17-H schema remains an auxiliary scaffold, not duplicate human cases.

Immediate authorized work remains packet validation, independent review, source/hash freeze, empty roster/gold/adjudication preparation and local dispatch-denied provider-plan validation. Actual human authoring/rating awaits chosen participants, source/recipient permissions and accepted scope/criteria; provider generation and live workflows need separate exact authorization.
