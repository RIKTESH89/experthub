# Runtime verification — 2026-10-04

## Environment and provenance

The original `listen EPERM` was an ordinary sandbox failure, not approval-review denial. On explicit follow-up authorization the exact `next dev --hostname 127.0.0.1 --port 3145` command was started through `require_escalated` and approved. It used the clone's linked existing dependencies, development-only fixtures, `VERCEL_ENV=preview`, synthetic `expert-ui-local.vercel.app` Preview metadata, a synthetic auth secret, and a deliberately unreachable synthetic database on `127.0.0.1:1`. No actual provider/DB credentials were loaded. No auth session was created.

Installed agent-browser was unavailable. CUA's in-app browser supplied runtime DOM/AX, viewport, form, screenshot, and navigation controls. Screenshots are real browser JPEG captures, not generated mockups. The fixture is explicitly labeled synthetic and guarded by development + `EXPERTHUB_UI_FIXTURES=1`.

## Verified locally

- Knowledge editor: empty Create shows required title/content errors and focuses title; light desktop and dark mobile captures. Dark error contrast was corrected after visual inspection.
- Import: article and bulk fields and add/remove controls have accessible names; one synthetic URL stages locally; Add becomes disabled after the input clears, preventing a second empty add; PDF selection remains disabled until a file is supplied. No URL was sent to the import API.
- Twin configuration: synthetic supplied greeting/boundaries render; retrieval switch changes `aria-checked`; dark/mobile and light/desktop captures. No configuration was saved.
- Post composer: empty Draft produces a validation notification, Publish starts disabled, typing content enables Publish, Enter creates/removes tags, retrieval switch works, and media controls/fields have names. Fixed oversized switches caused by the page touch-target rule; final desktop/mobile captures show the corrected proportions. No draft/post/media was sent or uploaded.
- Actual expert client pages are mounted inside the public dev fixture with no session. Owner APIs continue to return 401. These are **unauthenticated failure-state captures**, not authenticated owner-page verification: overview, analytics, pricing, profile, settings, widget, knowledge, posts, subscribers, twin, post detail/edit. Fixed misleading zero/empty/default states after failed reads. Genuine post 404 keeps its distinct not-found state; denied/failed reads now show unavailable.
- Removed an existing synthesized overview sparkline: its daily numbers were derived from a total rather than recorded history. The overview now states that daily history is unavailable and points to analytics.
- No framework overlay or document horizontal overflow at 1440px for the captured desktop states and 390px for captured mobile states. Composer was also inspected at 768 and 1024px without document overflow; the later switch/contrast corrections did not change its grid widths.

## Review/CAS fixture checks

The actual ReviewWorkspace handlers run against a supplied **in-memory fetch transport** inside the dev fixture. Product routes omit this optional prop and use normal authenticated fetch. No auth guard, middleware, backend route, version comparison, CAS payload, operation key, lock, or confirmation policy was bypassed or changed.

Observed in the browser:

1. The synthetic owner review loads a pending correction, manual source version 3, review version 2, and a persona release.
2. Accept opens an explicit confirmation; blank reason disables Confirm acceptance.
3. Filling the reason and double-clicking confirmation disables the editor while busy and records **one** in-memory request with `expectedVersion:2` and operationKey present.
4. A synthetic HTTP 409 produces the conflict disclosure and leaves confirmation disabled. Refresh closes the stale editor and reports latest versions loaded.
5. Blocked rollback displays its evidence-change reason, the settings-only/source-policy limitation, and a disabled Confirm rollback. Cancel closes it.
6. Create release opens its explicit confirmation. Double-click records **one** in-memory release request with `expectedHead:"synthetic-release"` and operationKey present. The synthetic completion notice appears.
7. Empty, loading, HTTP 503 load failure, and owner-denied HTTP 403 states render. Error and owner denial expose Refresh reviews and the twin-settings link.

These checks verify frontend behavior under synthetic responses. They do **not** prove actual server CAS enforcement, persistent snapshots, authenticated owner access, real source recomputation, or real rollback effects. Existing owner/route unit suites separately pass.

## Explicit approval-review denial — stop boundary

Clicking the fixture's All posts link attempted to enter the protected real `/expert/posts` route. Preview isolation caused auth navigation toward `https://expert-ui-local.vercel.app`. Browser automatic approval review rejected it:

> The requested browser origin is an external, unverified Vercel domain rather than the explicitly authorized localhost synthetic fixture; accessing it is outside the approved QA scope.

The review classified this as unacceptable risk and instructed no workaround or indirect execution. Browser work stopped immediately; no other tool/browser surface was used to reach that origin. This is an **explicit approval-review denial**, distinct from the earlier sandbox EPERM.

Consequently actual route guard destination and browser Back were not verified. No external Vercel hostname was intentionally visited. Do not treat this as an authenticated runtime pass. Further route-navigation QA needs an approved local-origin setup from the shared environment owner; do not bypass this rejection.

## Shared needs and remaining QA

- Shared PWA install prompt still uses a purple action in this fixture; shared owner should inspect it for theme parity.
- Shared dark `destructive` token made validation text too dim. This lane adds a scoped `--expert-error` override; shared owner should consider the token's app-wide text contrast.
- Populated profile/settings/pricing/widget/analytics/list/detail/edit layouts require owner-data review. Captured denied states do not substitute for these checks.
- Actual authentication, source/release persistence, billing/consent/evidence behavior, mobile file selection, streaming, reduced-motion preference, and browser Back remain release QA items.

## Cleanup and development warnings

The isolated server was stopped after the denial. Dev compilation emitted OpenTelemetry/Sentry dynamic-dependency warnings traced to unchanged shared root imports and linked dependencies. No corresponding framework overlay appeared in captured fixture states; these warnings were not fixed in this lane.
