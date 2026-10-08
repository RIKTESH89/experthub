# Product journey continuation — bounded review candidate

Code commit: `f18eebd6583fcce882f0b1e0af6851db4c361016`. Parent review required.

## Basis and coordination

Isolated checkout `product-journeys-continuation`, branch `exp36-40-42-accessibility-continuation`, exact deployed base `101e9412565f8c7fbd3e4d0bc7d5aecee15c3e02`. Read the current release checklist, exact10:04:15 Linear mirror, next combined review and independent product review under the existing full-site-staging evidence directory. The previous product batch is integrated and its two nonblocking review notes are addressed here. Historical combined/provider/native checks are not counted as this batch's execution.

Overlap warning issued before settings/subscription/knowledge/admin UI edits and focused fixtures/tests. No auth/billing/release backend, schema, shared shell, widget, accepted homepage design or API implementation changed. New route-handler tests import existing endpoints without modifying them. Parent owns Linear and integration; no Linear writes, remote push or publication.

## Reproducible gaps fixed

1. Subscriber settings load failure required a full reload. Retry now refetches in place, with visible loading status and aborted/stale read suppression. Pending save disables controls, a synchronous lock rejects repeat submission, and unmount abort suppresses late success. Server denial retains choices; uncertain network response explicitly asks to review saved preferences before retry rather than falsely asserting nothing saved.
2. Settings clean state previously remained writable and saved feedback used an untracked timer. Confirmed values now reset the form; clean saves are disabled; changed switches/digest mark dirty; saved status and button clear while dirty. Phone row controls retain their size and footer wraps.
3. Subscription list failure now retries locally with cancellation/loading status. Populated articles and chat/expert links identify the selected expert. Explicit hasAccess remains authoritative; defensive fallback only implies chat access for ACTIVE when hasAccess is missing. Pending/past-due/ended DTOs no longer imply access by omission. Cancelled renewal with explicit continuing access is preserved. The current API supplies hasAccess and filters to accessible plans; negative/legacy DTO cases are defensive UI coverage, not a new entitlement service or proof of a currently reachable paid-state defect.
4. Independent review notes: knowledge saved status no longer survives editing a retained draft; admin network TypeError now uses uncertain-outcome/review-before-retry guidance while retaining confirmation target and retry. Neither changes backend mutation or authorization.

Client abort does not prove server rollback or provide idempotency. No unsaved-draft persistence across client navigation is added. Existing subscription cancellation handler is not activated or changed; no payment call was exercised. Plan links remain protected by the real server middleware.

## Executed evidence

- Entire default aggregate: **141 suites /1,664 tests PASS** (`regression.log`), up from published137/1,644. Four new suites add18 cases; two prior focused suites each gain one review-note regression. Dedicated UI/gate/review-note set25 passes (`focused.log`); actual preference-handler set3 passes (`route.log`).
- Route tests use actual GET/PATCH handlers, mocked authenticated session, and two users' in-memory preference rows. GET→PATCH→GET preserves mapped preference fields, strips a supplied alternate userId from routing, leaves the other user's row unchanged, rejects invalid digest, and denies anonymous requests before the mocked store. This is not real Auth.js HTTP, persisted SQL or provider evidence.
- TypeScript noEmit/no incremental passes; seven changed production TSX files pass targeted Next lint; whitespace diff passes. Post-build standalone types rerun. Existing installed modules reused read-only via symlink; no installs/generate.
- Offline optimized Next build passes (`build.log`) with external network guard, unreachable loopback DB, synthetic auth secret, no provider configuration and existing installed Arial font substitution. No migration/build wrapper, deployment or real service call. Existing Sentry/OpenTelemetry, jose Edge and dynamic-server-use diagnostics appear in successful build output; not a warning-free claim or typography acceptance. First build correctly rejected the development-only local isolation flag; the flag was removed, guard retained (`build-initial-guard.log`).
- Built app on loopback with fixture flag deliberately set: new dev fixture404; anonymous preferences API401; subscriber settings307 to local login (`built-boundaries.json`). Loopback HTTP needed the same sandbox escalation as the listener; it did not add credentials, permissions or external access.

## Native Chrome evidence

Local development fixture renders actual SubscriberSettingsPage, SubscriptionList/Card, Navbar/Sidebar and real Radix controls under an explicit client-only synthetic SessionProvider. All API responses are in-memory; unknown operations403, external fetch destinations blocked, root auth refresh anonymous. New fixture requires development plus explicit flag; tests and built HTTP both prove production refusal. No auth cookie/account/role/access grant.

- GET503 → in-place retry loads saved false/true/weekly preferences. Keyboard Space toggles New Posts; PATCH403 retains selection/error; retry confirms saved state and disables clean save.
- Keyboard Space changes Replies; saved status clears. Enter/ArrowUp/Enter selects Daily from the actual Radix digest options; save succeeds. Remount shows confirmed true/false/daily values from the fixture.
- Pending save interrupted by Plans switch: reopening Settings shows last confirmed false reply value with no stale success. Unit deferred-response tests deterministically establish abort and no late success; browser scheduling is not evidence of real server cancellation.
- Plans GET503 → retry renders active, renewal-cancelled-with-access-until2099, and expired/no-access rows. Contextual chat links present for allowed DTOs, absent for denied row; names/long names/prices fit representative phone and desktop widths. No subscription/payment mutation.
- Clicking the protected chat link redirects to local login with callback URL and Google disabled. Browser Back remounts the fixture's initial settings failure; no persisted-draft assertion. Redirect changes127.0.0.1 tolocalhost; Next RSC logs one failed cross-origin fetch and falls back to document navigation. The strict fixture/guard is preserved; no clean-console or seamless authenticated chat-navigation claim.
- Dark390×844 and light1440×900 screenshots inspected. Measured document width equals viewport390/1440. Keyboard/select/error states checked; no all-theme/contrast/physical-device claim. Viewport reset.

Initial jsdom tests needed a test-only ResizeObserver stub for real Radix switches and an async wait for retry's loaded form (rather than the intervening skeleton). Corrected focused and full suites pass. Default tests regenerate four preexisting synthetic audit files; those generated changes were restored to exact baseline after execution, not included in this candidate.

## Remaining gates

Parent independent review and integration required. Consenting real Google signup/session/logout, full authenticated HTTP and native SQL/PG16 matrix, real upload/storage/indexing/import/replay/midstream, complete subscriber chat/bookmark/feed and admin privilege/audit/pagination flows, providers/payment/email, physical Android/iOS, screen reader, contrast, performance and pilot fidelity remain open. Original native picker permission limitation remains; no new grant or workaround attempted.

No accepted homepage changes, real account/provider actions, credential use, hosted/shared database writes, installs, new permissions, deployment, remote push or Linear mutation. Both isolated local servers stopped at handoff. No hard problem required reasoning-effort escalation.
