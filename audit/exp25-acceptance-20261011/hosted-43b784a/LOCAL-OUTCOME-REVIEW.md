# Independent local-auth execution outcome review — 2026-10-11

**PASS for the eight recorded local scenario groups.** Reviewed saved execution only; no new browser, database, provider or mutation operation was performed by the reviewer.

Candidate: `43b784a4e71fc985ae178e1d7ab764f0ff4a85d1`. Actual local build ID: `8wK667wgWSB5yLdeAYuRP`. Chrome: `154.0.8037.98`. Next startup log: version 14.2.35, owned listener 127.0.0.1:3531, ready 218ms. The prepared harness asserts exact HEAD, clean tracked/untracked runtime source and owned child readiness before browser use.

## Reviewed evidence

- `integration/audit/remaining-acceptance/local-auth/built-browser.json`: 8 checks PASS, errors [], external []. Its limitations explicitly identify signed synthetic sessions and staging URL interception to loopback, not hosted TLS or Google OAuth.
- `evidence/remaining/local-auth/browser.log`: all eight named groups PASS, anonymous destination exactly `/login`.
- `evidence/remaining/local-auth/identity.log`: `integration_full_http|integration_synthetic|PRIVATE_SOCKET|0` before migrations.
- `evidence/remaining/local-auth/migrations.log`: all 18 repository migrations applied successfully to the asserted local database. No loaded application environment files; Prisma skipped environment variable loading.
- `integration/audit/remaining-acceptance/local-auth/server.log`: owned localhost-only Next startup; no recorded server errors.
- `evidence/remaining/local-auth/stop.log`: PostgreSQL stopped successfully.
- `evidence/remaining/local-auth/result.json`: every step exit 0, success/cleanup/runtimeRemoved true, PG18 / not PG16, no TCP database listener. Reviewer independently checked that `/tmp/experthub-full-http-fawdd364` no longer exists.
- Actual screenshot `built-review.png` inspected: accepted correction at review version 2, current source version 2, queued recomputation status in the compiled expert workspace.

Root repaired the prior cache/selectors/refresh/redirect/owned-listener findings before execution. The runner now creates a separate browser process session and performs TERM/KILL process-group cleanup on timeout. This run completed normally with browser exit 0; no timeout is claimed. Node's finally path closes its browser/contexts and owned Next child, disconnects Prisma, then the outer wrapper stops PostgreSQL/removes its temporary runtime. The observed saved results and absent directory support cleanup.

## Actual local behavior established

1. Public pages at mobile/desktop widths: noindex, no horizontal overflow, zoom enabled.
2. Anonymous review page redirects to login and correction API 401.
3. Synthetic subscriber is denied the owner workspace and correction API 403.
4. Owner cancellation creates no ACCEPT audit; double acceptance creates exactly one native ACCEPT event and lifecycle job.
5. Source CAS mismatch blocks confirmation; completed refresh leaves stale acceptance disabled.
6. Release preview/cancel leaves two releases; reviewed rollback appends a third native release and preserves source version 1.
7. Deactivating the synthetic persisted owner account rejects its existing encrypted session on reload.
8. Pinned Google provider declaration/button/callback are present without Google exchange.

## Scope and open gates

This is actual compiled local Next/Auth.js/Prisma execution against a new owned synthetic PostgreSQL 18 database with all 18 migrations. It is stronger than mocked stores, but it is not a deployed authenticated session, real Google exchange/signup/logout/relogin/expiry, native PG16 proof, paid-period entitlement loss, generated chat/vector recomputation, provider delivery or human fidelity/naturalness assessment. The historical approved real Google sequence remains scoped to 101e941. Hosted H1–H8 prerequisites remain unchanged; `ELIGIBILITY-AND-PLAN.md` maps the local analogs explicitly. EXP-25 remains In Progress.

## Evidence fingerprints

| File | SHA-256 |
| --- | --- |
| built-browser.json | `49d9a6081dff4da66f4d03fdeb09d8e182dbee5d990ce0be5e733e2a871c8935` |
| result.json | `9c5379b0dcd873d59a13d968f0aa5fba379520bf74bec2e0efd57d85c487057d` |
| migrations.log | `4f7734c2dc525b5b68e48bb275236d74100c0691f2933c738fa90a40a5303af6` |
| browser.log | `a14cf0a0c4f6199f73e1539de7f9e0cc7648ff4b91ade0cf5f6b42070d810d34` |
