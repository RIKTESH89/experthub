# Independent EXP-17 scoped review — 2026-10-11

Reviewer: EXP-14 worker; implementation author: separate EXP-17 worker. Final reviewed exact head: `d8081943720df28fd136f7487a8111bc899d6351` (preceded by `d6801b6`, `6adc434`, `da23d85`, `388fe7c`). Final EXP-17 worktree was clean at execution.

## Findings repaired

- Obvious represented-person/first-person statements could be mislabeled general/application/conversation under approving semantic labels. The author added a bounded deterministic category contradiction guard. Reviewer additionally identified missing negated auxiliaries and contracted negative forms; these now reject.
- Unclosed single quotes could skip quotation support checking. Boundary cases now reject.
- Curly quote parsing initially closed at a typographic contraction apostrophe (`don’t`) and later at plural possessives (`trials’`), checking only a supported prefix while ignoring invented suffixes. The reviewer reproduced the latter against the full structured gate at `388fe7c`: fabricated source-explanation released despite selected source text describing calibrated rather than invented outcomes. The author repaired complete outer single-quotation parsing in `d808194`.

## Final independent verification

**8/8 tests, 2 suites PASS** against exact `d808194`. These reviewer-authored temporary Jest tests are saved here as `.review.ts` files, with exact JSON/log outputs. They cover truthful and fabricated curly quote contractions, a complete gate check with approving synthetic reviewer, category-laundered negative auxiliaries and credentials, a truthful exact-source control, a forged predicate/object control, plus helper and full-gate plural-possessive bypass reproductions. Review used synthetic fixtures only; no external provider, database mutation or browser use.

Code inspection additionally checked duplicate-reference rejection, selected source/revision/hash/version matching, conflict/supersession invalidation, valid-time matching and source-speaker attribution. Prior author/native integration evidence remains distinct from this fresh review run.

## Scoped conclusion

No remaining blocking finding in the changed deterministic literal support/category/quote boundaries after the reported repairs. Accept the bounded code change for combined integration verification, with the limits below preserved. This is not broad EXP-17 issue acceptance.

The detector remains a surface guard: indirect/unnamed/multilingual person attribution and false general information still need independent evaluated semantic coverage. Conservative literal matching refuses some truthful synonyms; complete outer single-quote parsing may refuse multiple separate single quotations on a line. The reported developer-fixture confusion matrix is not human or model adjudication and cannot establish a general false-positive/negative rate. Real-provider latency, unseen human-rated entailment/refusal overreach, authenticated runtime revocation and delivery races remain open. EXP-17 must remain In Progress until broader acceptance evidence exists.
