# EXP-16 independent HOLD repair

Repair code: 58b768e3433e8f98f8f431d8d663f2b6e69cb04d; branch exp14-exp16-replay-stream. Parent of repair: 1fd57f2d46015ce1989cb8c407d5fbc1301deeb9. Original deployed base: 8897903fb7820532994a9f0f72c210449a46afb2. Read independent release-next-review/REVIEW.md. Earlier evidence remains intact; this directory supersedes its two HOLD findings for local review.

## Owner disclosure and receipt

Preview and activation now share prepareActivation under expert/source/post/widget locks. New publication also requires preview. Effective current active release is compared with target activation, independently from any live draft configuration restored by rollback. Recursive before/after disclosures cover model policy, effective chat/widget greetings (including null), released identity/specialties, both rendered personas, algorithms/reader policies, manifest format and all configuration fields. The UI gives direct before/after values and a complete activation/evidence manifest rather than saying settings changing none for model/greeting-only rollback.

Owner confirmation submits the exact preview head, target and SHA256 approval receipt. The receipt binds the proposed manifest plus disclosed effective before/after and draft before/after snapshots. Activation recomputes that content under the same locks and rejects a mismatch with 409 before any release/head/config write. Both API validation and the store reject missing receipts; direct server callers cannot activate without one. Expert owner, source/version/access/algorithm constraints and immutable append-only history remain enforced. Existing idempotency keys bind the receipt and replay the original result after head advancement. The stored manifest adds derived approval metadata (hash and reviewed before/after snapshots); stripping that metadata yields the exact preview activation manifest, as asserted natively. Operational widget configuration is not restored.

The accepted product176d537 proof review-workspace.tsx byte-matches the shared 8897903 base, so no product-lane edits were overwritten here. Overlap scope announced in commentary: review-workspace plus persona preview/activation APIs and store. Parent messaging was unavailable earlier; no Linear or cross-thread write occurred.

## Downgrade repair

V2-capable readers stay enabled. V2 writers default OFF, requiring explicit EXP16_ENABLE_V2_WRITES=1. Gate-off publication produces v1, verified with the deployed reader's original source in native tests. Gate-off v2 rollback is denied; existing v2 remains readable and history is unchanged. ROLLOUT.md gives the concrete reader-first sequence and requires a separately verified v2-capable downgrade artifact before writer enablement. No flag, external environment, active head or deployment was changed under this task.

## Evidence and limits

- Aggregate: 130 suites / 1,616 tests pass, including three rendered owner workspace tests proving visible model/greeting differences, receipt submission for rollback/new publication, and conflict blocking.
- Native: 30 PostgreSQL18 cases pass. Original 23 regression cases retained; added equal-config A/B disclosure and exact approved manifest/receipt, stale model/widget/identity/draft refusal, default gated writer read by deployed v1 source, gate-off v2 reads and v2 rollback refusal, store missing-receipt refusal. Private Unix socket only, owned synthetic /tmp cluster, no TCP/provider calls, stopped and removed.
- Full TypeScript noEmit, scoped changed production ESLint and diff check pass. No installs/build/provider/hosted/authenticated-browser action. No new schema/migration. Existing PostgreSQL aliases under /opt/homebrew/opt all resolve to postgresql@18/18.6; no installed PostgreSQL16 found there. PG16 is explicitly UNRUN.
- Previous native initial attempt failed only because the isolated legacy-reader copy still had relative imports; it was corrected and the full 30-case fixture passed. Real legacy reader dependency behavior is matched by unchanged source-pin/hash helpers, but this is not a full binary downgrade deployment rehearsal.
- Native fixtures do not add full User/ChatSession FK or authenticated HTTP coverage. UI tests run jsdom, not native browser/visual/device/screen-reader acceptance. Stream delivery/persistence race limitations and imported-source acceptance decisions from the prior report remain unchanged.
- The stricter store intentionally rejects older direct integration fixtures that activate without approvalHash. The owned replay harness and executed unit tests now preview/submit receipts. Parent must update unrun exp16 reviews/browser, exp28-29 reliability and launch-integration seed helpers to obtain a preview receipt before their activation calls; none were run or edited in another lane here.

## Remaining owner gates

Independent re-review and combined product/auth integration/build; reader-only rollout acceptance and a verified v2-capable downgrade target before enabling v2 writer; PG16 parity; authenticated/provider/browser acceptance. Import derivative/binary provenance, fully reproducible model/code/memory replay and strict route/delivery/final-commit revocation remain separate decisions. EXP-14 and EXP-16 remain In Progress; no task closure or deployment claim.
