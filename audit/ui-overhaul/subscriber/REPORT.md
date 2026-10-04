# Subscriber and auth lane — integration handoff

Base: `9e0f49d2bcc474a9c7896497bfe546c9356d87a4`.
Isolated local clone: `/Users/rikteshs20/Documents/Codex/2026-10-04/task-4/experthub-subscriber`.
Branch: `ui/subscriber-overhaul`.

## Implemented and reviewed in synthetic browser QA

- Subscriptions: open editorial header, visible discovery action, rupee monthly summary consistent with existing billing cards, true summary error state, responsive subscriber-only plan rows, explicit access-through date for cancelled renewal.
- Bookmarks: reading shelf composition, accessible sort selection, retained endpoint and remount behavior.
- Profile: separate context and form columns, simpler form surface, existing form behavior preserved.
- Settings: editorial page header, labeled switches/select, disabled controls during save or failed initial load, persistent save-error message, truthful digest descriptions without unsupported clock/day promises.
- Feed: editorial heading, semantic forest accents, static skeletons, named expert-row controls, reduced-motion scrolling, no fabricated presence dot, failed request distinguished from empty feed, retry action.
- Hub: editorial introduction and search, visible responsive expert grid instead of carousel, separate failed/empty featured states, retained discovery/posts endpoints.
- Expert detail: breadcrumb, inline AI action instead of floating obstruction, semantic accents, no unsupported popular-plan badge or decorative premium gradient. Existing fetch/payment verification effect preserved byte-for-byte.
- Chat access/header only: retained exact trial/subscription gate and verification effect; removed unsupported online/unlimited/priority claims; labeled back link and avatar. Shared chat primitives untouched.
- Login/forgot/reset: scoped left-aligned form styling, readable inputs, field-error associations, duplicate-submit checks. Existing Google availability gate, reset submission semantics and register-to-login redirect preserved.

## Validation

- `next lint --dir 'src/app/(dashboard)/subscriber' --dir 'src/app/(auth)' --dir src/components/subscriber --dir src/components/subscriptions`: PASS (`lint-final.log`).
- `tsc --noEmit --incremental false`: ten existing Prisma-generated-type errors in `staging-webhook/inbox.test.ts`; all identical to source checkout (`types-final.log`, `types-baseline.log`). No new type errors.
- `node audit/ui-overhaul/subscriber/static-contracts.cjs`: PASS (`contracts.log`). Checks unchanged access predicate, expert/payment-verification effects, role guards, register redirect, shared CSS/chat, parses scoped CSS and compares type diagnostics.
- `git diff --check`: PASS.
- No full build, installs, Prisma generation, schemas, provider setup, remote writes, pushes or deployment.

## Browser QA follow-up — prior blocker resolved

Normal approval for the exact local dev command succeeded. Existing system Chrome ran through Playwright; no installations. See `BROWSER-QA.md`, `browser-results.json`, `browser-extra-results.json` and `screenshots/` for 94 successful captures/checks across light/dark/mobile/tablet, loading/error/empty states, forms, repeated clicks and back navigation. No page errors or horizontal overflow.

Browser QA found and fixed an immediate rapid-submit race in owned Settings/reset/forgot handlers using in-flight refs. A remaining unsupported unlimited-question sentence in the access page was corrected. Public auth layout and protected unauthenticated redirect ran on localhost. Subscriber page tests used actual components with intercepted synthetic APIs; authenticated backend/billing/AI runtime remains unverified. Temporary fixture source was removed from product routes and preserved as audit-only reproduction templates. Dev server stopped after QA. No permission blocker remains.

## Shared needs for the parent owner

`ExpertCard`, `ExpertProfileHeader`, `PostFeed`, and `ProfileForm` are reused across roles and remain untouched. Their legacy blue accents, small metadata and nested surfaces need shared-owner review to achieve complete subscriber visual parity. This lane intentionally does not modify shared tokens/root layout/navigation/theme/motion/chat primitives. Parent should also review the shared profile form mobile footer and notification switch hit targets in runtime. No scope expansion to backend or auth services.

Shared browser findings: mobile PWA install prompt obstructs Settings save; shared PostFeed masks request errors as empty bookmarks; shared expert profile says “From Free” independent of actual tiers. See BROWSER-QA.md for evidence and remaining limits.
