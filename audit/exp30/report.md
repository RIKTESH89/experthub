# EXP30 launch experience local implementation

Base: c83bf907898d8a1ffc257888f5800f27a210e1d2. Branch: exp30-launch-20261003-task7. Worktree: /Users/rikteshs20/Documents/Codex/2026-10-03/task-7/experthub-exp30. Canonical checkout unchanged.

## Delivered

Public home/pricing/about remove fabricated 10,000 learners, 500 twins, 98% satisfaction, unverified named testimonials/avatar social proof and “thousands” claims. AI representations, generated-answer limits, incomplete memory and source verification replace faithful replica/accuracy guarantees. Shared public pricing copy removes invented monthly trial resets, expert-free monetization/payout, priority response, no-hidden-fee/cancel-anytime and cancellation-history guarantees. Existing code allows expert-configured FREE/PREMIUM plans; without active subscription trial usage is cumulative and expert-specific (`src/lib/trial.ts`, chat session routes). This implementation changes descriptions only, not access/payment behavior. Expert application no longer promises a 1–2 business-day review SLA. Footer no longer labels `/about` as a legal policy, contact, blog or careers destination.

Accessibility: mobile section navigation remains available below desktop breakpoint; all public links/inputs have minimum 44px targets, visible keyboard focus, skip-to-main landmarks and scroll offsets. Form has native required fields and successful submission status. Global viewport no longer blocks pinch zoom. Public reduced-motion rules make animated entrance content readable and disable decorative CSS motion. Green buttons and hero gradient are adjusted for contrast. Scope is public pages; this is not a WCAG certification or site-wide accessibility audit.

Metadata: shared helper emits noindex/nofollow for Preview and local development and omits canonical/OG URLs there. Production requires explicit trusted HTTPS `NEXT_PUBLIC_APP_URL` with root-only origin and no credentials/query; localhost, `.invalid`, and default `.vercel.app` deployment domains remain noindex. Home/about/pricing each use their own canonical path. Operator must confirm intended production origin before release. Root layout defaults to noindex/nofollow for other pages; only these three public pages opt into production indexing when the origin is valid. No auth or route-access code changed.

`policy-review-drafts.md` is repository-only, unrouted, unpublished REVIEW DRAFT content for privacy/terms/refunds/incidents. Eight decision groups remain for owner/legal/operations review; no retention/refund/jurisdiction/provider compliance choices were invented.

## Verification

- Full repository `tsc --noEmit --incremental false`: PASS (`types.log`, empty successful output).
- Focused Next lint on all changed TS/TSX files: PASS (`lint.log`).
- Metadata indexing/canonical boundary unit tests: 15/15 PASS (`tests.log`).
- Fresh installed Chrome via existing Playwright: 22 public-page cases PASS (`browser.json`, `browser.log`). Home/pricing/about at widths 320/375/768/1024/1440: HTTP200, no horizontal overflow, one main landmark, usable first keyboard skip link/main focus, no error overlay, Preview noindex/no canonical, zoom enabled, fabricated proof absent. Normal-motion light/dark mobile checks and mocked application success additionally pass. Screenshots recorded at 375/1440 plus dark mobile.
- `git diff --check`: PASS.

Browser harness uses localhost port3370, cleared environment, synthetic auth secret, deliberately unreachable local DB, Preview isolation, existing network guard/offline font hook and fresh browser context. All external requests aborted. Form POST fulfilled synthetically in browser; no database/provider data or real application submission. Dependencies symlink existing installed modules read-only; no install/client regeneration. Offline font substitution is harness-only; no Google font acceptance. One initial run during live edits reported `Invalid or unexpected token`; three subsequent complete runs passed with no page errors. No production build, payment/OAuth handshake, live model evaluation, provider calls, deployment, external publication or Linear status update.

## Integration and release gaps

Cherry-pick this lane after parent coordinates layout integration. Ownership: `src/app/{page,pricing/page,about/page,layout}.tsx`, `src/app/public-launch.css`, public-only helpers, landing application-form accessibility/copy, EXP30 tests/harness/evidence. No source/schema/auth/payment algorithm changes. No existing shared generated/audit artifacts modified.

Parent should run one integrated production build and regression suite. Legal/privacy/refund policy approval/public routes, operating contacts/on-call and commercial decisions remain release blockers. Real Google and Razorpay TEST MODE acceptance, provider font behavior, screen-reader/manual assistive technology, no-JavaScript entrance behavior and complete dashboard/chat accessibility remain unverified. Public screenshot QA validates touched surfaces only. Existing API/dashboard “unlimited” feature labels remain outside public-page copy scope; review commercial usage limits before launch. Server must be stopped and browser slot released before lane handoff.
