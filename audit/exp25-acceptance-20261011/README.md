# EXP-25 bounded acceptance — 2026-10-11

Baseline: `0a2cd602646d7ae5689b195a4fbe6da05a5daa28`; branch `exp-25/acceptance-20261011`.
Dependency lock SHA-256: `2bbc9e5d043b4f469e86e46441daa7c60904198a9eaf5e880f5e1196a186555b`.
No dependency or application environment file changed. Existing node_modules is read through a symlink. V2 remains OFF; no providers, live databases, billing files, credential changes, deployment or shared browser were used.

## Reproduced gaps and fixes

- A non-JSON unauthorized response previously became a JSON parser error and retained the private owner panel. HTTP status now survives response decoding failures, and 401/403 clears data, decisions, previews and retry state.
- V2 safeguard, source indexing, revoked/historical evidence and unsupported-release failures now offer concrete guidance. Server/network exception text is not shown to the user for release operations.
- Malformed previews or activation receipts cannot create a false confirmation/success state.
- Ambiguous activation retains the exact reviewed receipt and operation key for retry. Confirmed activation followed by refresh failure explicitly reports that the release activated and requests a refresh.

## Fresh results

| Gate | Outcome | Evidence / limitation |
| --- | --- | --- |
| Full Jest | PASS, 1,684 tests / 142 suites | `full-jest.json`, `full-jest.log`; no tests hidden |
| Focused UI + existing approval regression | PASS, 23 tests | `release-failures.test.ts`, `approval-workspace.test.ts` |
| TypeScript | PASS | `types.log`; no exclusions/type weakening |
| ESLint | PASS | `lint.log` |
| Actual optimized Next build | PASS | `build.log`; external network blocked; existing Arial font substitution, not font-delivery acceptance |
| Auth runtime | PASS, 12 scenario groups | `authenticated-release-runtime.json`: installed Auth.js encrypted sessions + actual release/preview handlers and ownerContext; substituted identity/store rows, no database/provider calls |
| Native Chrome | PASS, 7 mobile scenarios | `browser.json`, `browser.log`, 7 screenshots; real React component, intercepted synthetic HTTP; no real OAuth/DB |

The Auth runtime verifies anonymous/expired/tampered sessions, current role overriding JWT role, banned/inactive/deleted owner, identity read failure, authenticated server-derived owner identity, invalid tenant/receipt fields, blocked previews and role loss between requests. Native Chrome verifies failed replacement-preview/refresh invalidation, blocked safeguard guidance, preview focus, disabled stale approval, same-request retry, non-JSON owner revocation, malformed-preview recovery, no page errors and no horizontal overflow at 390px.

## Reproduction commands

Run from this checkout with the existing installed dependencies:

```sh
./node_modules/.bin/jest --runInBand --json --outputFile=audit/exp25-acceptance-20261011/full-jest.json
./node_modules/.bin/tsc --noEmit --incremental false
./node_modules/.bin/next lint
node scripts/exp25-acceptance/authenticated-release-runtime.cjs
node scripts/exp16/build-browser.cjs
./node_modules/.bin/tailwindcss -i src/app/globals.css -o .exp16-runtime/browser/style.css
node scripts/exp25-acceptance/browser.cjs
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin NEXT_TELEMETRY_DISABLED=1 NEXT_FONT_GOOGLE_MOCKED_RESPONSES=$PWD/scripts/exp25-26/font-mock.cjs NODE_OPTIONS="--require $PWD/scripts/exp25-26/network-guard.cjs" node node_modules/next/dist/bin/next build
```

Native Chrome requires local process permission; its temporary profile is separate from the shared interactive browser. Browser requests are intercepted and non-loopback origins aborted. Initial sandbox-only Chrome launch aborted before a test; the authorized fresh isolated launch completed all seven cases. Runtime/browser scripts do not mutate a database.

## Independent review repair

EXP-15 found that a failed replacement preview or refresh could leave the old reviewed approval enabled. The component now invalidates the previous preview before either read, while activation retries alone retain the original request. Two independent-review regressions and two native Chrome cases pass. Full suites/types/lint/build and all seven native Chrome cases were rerun after this repair.

## Open acceptance

Keep EXP-25 In Progress. This bounded candidate does not prove the entire production-build identity → discovery → ingestion → authorized chat/citations → entitlement-loss journey against native PostgreSQL on the combined candidate. Integration must rerun the combined suites/build and finish independent review. Real Google authentication/signup/expiry, hosted exact-candidate authenticated journeys, real provider delivery, source ingestion/vector integrations and human quality assessment remain separate gates. Another task owns the approved ₹0 provider run; no result from that task is claimed here. Existing launch issues/dependencies are not waived by this scoped pass.
