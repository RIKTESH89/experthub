# First UI checkpoint verification — 2026-10-04

## Executed

- Isolated local Next dev server on `127.0.0.1:3417`, clean `env -i`, synthetic auth secret, unreachable local synthetic PostgreSQL URL. No live credential/environment files copied or loaded.
- Subscriber overview now reports a retryable UI error when statistics fail, without substituting zero counts for unavailable data. Existing API endpoints remain unchanged.
- TypeScript passes with `tsconfig.ui-check.json` (excludes existing `staging-webhook` tests only). Full typecheck has 10 pre-existing test errors: borrowed generated Prisma client lacks `billingOutbox`, `billingVersion`, `billingReconciliation`. No Prisma generation, migration or full build run.
- Targeted Next lint for all changed TSX UI files: passes. `git diff --check`: passes.
- Chrome/CUA verification: actual homepage light/dark desktop, light mobile 390px; separate synthetic dashboard/chat light/dark desktop; dark dashboard/chat and light chat mobile. Document width measured equal to viewport at 1440 and 390, framework error-overlay count 0.
- Theme toggle works from system-resolved theme; native dark color-scheme measured `dark`. Homepage robots measured `noindex, nofollow`.
- Real ChatInput in fixture: fill/Enter adds one synthetic user message and clears input; new chat clears added messages. Error control renders alert and Try again recovers. Dashboard/conversation controls toggle repeatedly. Pricing details reveal cumulative trial text. Pricing → browser Back → home → login works.
- Actual login dark desktop and light mobile screenshots inspected after entrance settled; no Google login request made. Application fields/labels remain present; no application submitted.
- Initial fixture visit recorded one stale dev bundle SyntaxError during server restart; subsequent native interaction and clean page load worked. Keep this disclosed; do not claim entire browser log history is empty.
- HSL token contrast computed per WCAG relative luminance: light body 14.33:1, muted 5.56:1, primary button 7.24:1; dark body 14.99:1, muted 8.25:1, primary button 9.13:1. These are token pairs, not an exhaustive contrast audit of every existing page.

## Remaining checks

Authenticated role screens need local mocked role/API integration QA (not a live account). Fixture uses production chat message/input and welcome components but does not exercise server role layout or actual chat streaming/citation/trial/payment behavior. Reduced-motion support is implemented/audited via MotionConfig and CSS; runtime media emulation not executed by the available CUA viewport capability. Still required: 768/1024 widths, mobile dark home, form validation/submitting/error matrix, keyboard tab sequence, loading/empty fixture captures, real citation interactions and performance profiles. No full rollout completion claim.

## Screenshots

Actual home: `home-light.jpg`, `home-dark.jpg`, `home-mobile-light.jpg`. Synthetic component fixture: `dashboard-light.jpg`, `dashboard-dark.jpg`, `chat-light.jpg`, `chat-dark.jpg`, mobile variants and `dashboard-error.jpg`. Pricing/login captures supplement review.

Confirmed Library images (version 1, settled captures):
- home-light.jpg: `libfile_3714bd562a788191bf2db4017e2ae44c`, `file_0000000041108208b1df23b2d2e9437a`
- home-dark.jpg: `libfile_f07ab318c4248191b7f80163b0d58f34`, `file_0000000028a082089814339b21c46a3c`
- chat-light.jpg (synthetic fixture): `libfile_7d3121a0169081918b16b64cc763d03a`, `file_00000000facc8208bf28f579b5a14b33`
- chat-dark.jpg (synthetic fixture): `libfile_d68e77ebf4b481919c98735cd8a7a58b`, `file_00000000f4688208a9a5d7572edd7677`

Library prepared helper failed before any prepare call because its hosted app tool list did not expose prepare_uploads. Ordered direct-create fallback succeeded for all four; metadata applied to each local file. No signed URLs exposed.

Review correction: first home-light capture was mid-animation. Replaced the same Library item after measuring both hero elements opacity 1 / zero translation. Chat timestamps now derive from the actual local runtime clock minus one minute. All four Library replacements succeeded at version 1 with xattrs persisted. Older mobile/dashboard captures are intermediate QA evidence and should not be presented as the final directional set.
