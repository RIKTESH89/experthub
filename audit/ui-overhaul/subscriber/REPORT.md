# Subscriber and auth lane — integration handoff

Base: `9e0f49d2bcc474a9c7896497bfe546c9356d87a4`.
Isolated local clone: `/Users/rikteshs20/Documents/Codex/2026-10-04/task-4/experthub-subscriber`.
Branch: `ui/subscriber-overhaul`.

## Implemented, awaiting browser review

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

## Exact permission blocker / incomplete QA

Attempted development server on unique loopback port `3144` with preview-isolated synthetic environment and an unreachable synthetic database. Sandbox rejected binding before the server started:

```
Error: listen EPERM: operation not permitted 127.0.0.1:3144
code: EPERM; syscall: listen; address: 127.0.0.1; port: 3144
```

Stopped server/browser work per delegated instruction; no escalation or workaround. No screenshots were produced. Light/dark/mobile visual QA, loading/error/empty/forms/repeated clicks/back browser checks, reduced-motion runtime and actual authenticated role/payment flows remain **unverified**. An unfinished fixture was removed rather than shipped. Static tests are not authenticated-runtime proof. Resume browser QA in an environment permitted to bind a local dev port, using request interception for synthetic data without changing auth gates.

## Shared needs for the parent owner

`ExpertCard`, `ExpertProfileHeader`, `PostFeed`, and `ProfileForm` are reused across roles and remain untouched. Their legacy blue accents, small metadata and nested surfaces need shared-owner review to achieve complete subscriber visual parity. This lane intentionally does not modify shared tokens/root layout/navigation/theme/motion/chat primitives. Parent should also review the shared profile form mobile footer and notification switch hit targets in runtime. No scope expansion to backend or auth services.
