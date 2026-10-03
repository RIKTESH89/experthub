# Combined continuations — local verification, 3 October 2026

Branch `codex/continuations-local-oct03`, base `26eb012b0193750ac76d8944696cb6d5c4c40e69`. No push, hosted migration, deployment, provider/email/model call or credential change. Hosted release remains `d8c4eb3acc2ee8a8595f3bc5bea67da763d48203`.

## Preserved provenance

| Source | Candidate cherry-pick |
|---|---|
| 9f9f8ad1c3d2d337d1130c0a499669a6ad1fef26 | 75ed2d5ac4c9ddc300e21f16c95f8aab7ce3a328 |
| 3478cf7d75bbff1d57f964edf75763b2510b203d | 50286af09a9e4eb513c9d4479c0a1c666d424d0c |
| 19b6a5494badc7b3fa776dea0cabfa76beb713e4 | 777028afff6213547241b9fcbf5e9f2d6f81f821 |
| e10c97e32d658f996575b965d89c0a1415758db5 | 99e138ff6baa58c1c6b70d1c23d1ffae24c7636c |
| 7385d47ecd3e68adfe5ee6c07eb4fb452fa12bd6 | b17703d000ceea5c7394811be9e4d1f119983f73 |
| 54f4a7c5709719bb68b7a5dd3b955c07ffbac2d4 | 02080ce20a98c58e52fdb5f4025e1ae5a6eb56aa |

No conflicts or new schema changes. Existing 17 migrations retained. The only integration code change moves the local native runner's output into this audit directory. Dialogue and billing remain opt-in and disabled by default.

## Independently observed results

| Check | Result |
|---|---|
| Independent dialogue focused suite plus original three regressions | 252/252, 20 suites |
| Independent payment suite plus original refund/cancellation regressions | 88/88, 9 suites |
| Combined full unit suite | 1236/1236, 76 suites |
| Combined continuation native billing | 86/86, 7 suites |
| Existing native billing regression suite | 44/44, 5 suites |
| Native retrieval / correction | 10/10 / 20/20 |
| Native recovery | 16/16, 2 suites; all49 tables exact crash-restart/restore checksums; intent replay |
| TypeScript / Next lint / Prisma validation | PASS / PASS without warnings / PASS |
| Exact completed predecessor16 -> additive17 | PASS, standard migration ledger |
| Production / Preview builds | PASS / PASS |
| Compiled Chrome production / Preview | 5 checks / 8 groups PASS; zero external requests or page errors |
| Synthetic dialogue | 25 turns, zero contract failures, zero real provider calls |

Counts overlap and must not be added as unique cases. Evidence lives in this directory, including independent regressions, JSON results, logs, screenshots, migration ledger and source hashes. Owned PostgreSQL/Next/Chrome processes stopped. Logs include expected dynamic-rendering diagnostics during successful builds. Native PostgreSQL18 is not hosted PostgreSQL16 proof; offline system-font fixture is not font-delivery proof. Browser uses synthetic credentials/sessions and loopback aliases, not Google OAuth, deployed TLS or Vercel protection proof.

## Review conclusions and remaining gates

The six independently reproduced issues are repaired: stale refunded provider evidence; cancellation after review; authorization before bounded body parsing; draft mutation during final evidence reads; incomplete immutable stance pins; accepted-query truncation. The first grouping includes two payment evidence failures and one body issue; the dialogue grouping includes three failures. Reviewed provider lifecycle/payment/invoice snapshots are signed and freshly compared. Already-cancelled reconciliation retains exact paid access while preserving cancelled renewal. Dialogue approval snapshots are detached/frozen, retained across asynchronous boundaries, with final validity recheck; stance semantics and full accepted query are preserved.

Real-model natural dialogue remains unaccepted. `EXP15_EXP17_LOCAL_EVALUATION` is unset by default, rejects production/known hosted runtimes, and structured adapters require synthetic generator/verifier kinds. Human/model semantic and voice ratings remain uncollected; the 25-turn fixture checks contract mechanics only. Need separately authorized real-model evaluation, genuine volunteer feedback and acceptance thresholds before selecting this path publicly. Permission/evidence reads are still non-atomic with final delivery; an unmarked hosted development runtime is not conclusively detected.

Billing flags `BILLING_WORKER_ENABLED`, `BILLING_EMAIL_DELIVERY_ENABLED`, `BILLING_PROVIDER_LOOKUP_ENABLED`, and `BILLING_REVIEW_ENABLED` are unset/off. Preview is blocked. No scheduler activated. Production email requires an approved sender/domain, Resend configuration, separate purpose worker secret, approved authenticated invoker and sandbox delivery/retry/timeout acceptance. Durable email envelope/idempotency keys are implemented; the local checks do not prove actual downstream delivery or dashboard configuration. Ambiguous acknowledgements and remote operations outliving a lease remain operational limits.

Provider lookup deliberately accepts Razorpay Test Mode keys only. Need separately approved Test Mode account/fixtures and real sandbox verification of lookup, webhook lifecycle and evidence fields. Live lookup is unavailable in this implementation; do not enable a flag expecting Live Mode reconciliation. Admin review requires active database ADMIN identity, exact HTTPS origin, independent review secret and signed actor-bound expiring proposal. Retention/ownership of recovery review/audit queue needs an operational decision. Provider reads and local apply cannot be atomic; remote state may change after the last read.

Publication requires separate exact-commit approval, hosted additive migration17 approval and environment/provider/OAuth/ops acceptance. Nothing in this report grants those approvals or proves public-launch readiness. Existing frozen/base audit limitations continue to apply.
