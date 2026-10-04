# Development/test-only local UI isolation

Shared ownership: next.config.mjs, src/lib/preview-isolation.ts, new local-ui-isolation.cjs, new scripts/ui-preview harness, focused tests. No role middleware, auth service, session creation, hosted canonical validator, schema, billing handler or staging Google policy changed. Existing Sentry/provider guards reuse the isolation predicate; no telemetry configuration source was rewritten.

Run from an isolated checkout without dotenv files:

```sh
sh scripts/ui-preview/run-local.sh 3417
```

The runner clears inherited environment, supplies fixture-only synthetic auth/database values, disables Next telemetry, preloads a loopback-only Node network guard and uses an explicit loopback app origin. It refuses Next-loaded dotenv files before Next can read them. Database target is an unavailable synthetic loopback endpoint; the runner does not create a database, mint a session or grant a role.

The explicit `EXPERTHUB_LOCAL_UI_TEST=1` mode rejects NODE_ENV outside development/test, any Vercel deployment markers, absent guard preload, absent fixture flag, mismatched/external app origins, non-synthetic database URLs, inherited provider credentials or staging config. The only client exports are derived booleans and the validated loopback origin. Forging an inherited client marker does not enable the mode: Next config overwrites it false without the validated flag. Production Next builds set NODE_ENV production and intentionally cannot use this mode; use guarded hosted Preview settings for final build checks rather than relaxing this rejection.

Local mode skips withSentryConfig and Sentry client/server/edge initialization/capture, hides Google entry, exports no OAuth providers and blocks existing external-service entry points. Hosted Preview still validates only Vercel metadata; ordinary production origin/Sentry/Google behavior remains unchanged. Existing access gates continue rejecting unauthenticated users.

## Verification

- 93 tests passed across 5 suites: new local config/runtime tests plus existing Preview isolation, canonical-origin and approved staging Google suites.
- Actual Next config subprocess tests prove production/missing-guard rejection, marker override, loopback env exports and omission of Sentry wrapper.
- Node guard tests prove external fetch, HTTP hostname override, socket and DNS targets rejected before transmission. This harness is defense in depth, not an operating-system sandbox or a browser request interceptor.
- UI TypeScript, targeted isolation helper lint, JS/shell syntax and git diff --check passed. Known borrowed generated-Prisma mismatch is still excluded by UI check; full generated-client/type proof remains pending.
- Normal sandbox escalation allowed the exact guarded local server command. Browser `/admin` stayed on loopback and redirected to `/login?callbackUrl=%2Fadmin`; sign-in provider button was disabled. Screenshot `local-isolation-login.jpg` inspected, console warn/error query empty.
- Browser navigation to the local `/api/auth/providers` endpoint returned ERR_BLOCKED_BY_CLIENT. No retry/bypass; provider list is verified by runtime unit tests, not claimed as a browser endpoint observation. No authenticated operations, account login, billing or AI calls were performed.
- Development compilation emitted existing Sentry/OpenTelemetry dynamic-import warnings even though initialization/wrapper are disabled. Do not call the compile warning-free. No full build run.

Server is stopped after QA. The denied synthetic external Vercel origin was not visited.
