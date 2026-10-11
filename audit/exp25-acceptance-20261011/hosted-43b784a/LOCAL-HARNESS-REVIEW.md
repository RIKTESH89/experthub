# Independent prepared local-auth harness review — 2026-10-11

Reviewed root-owned `evidence/remaining/run-local-auth.py` and `integration/scripts/remaining-acceptance/local-auth-built.cjs` before execution. This review is separate from hosted identity eligibility; no actual application/session/database outcome is asserted here.

Safety: new owned `/tmp/experthub-full-http-*` private-socket PostgreSQL fixture, synthetic role/database names, empty target identity assertion, isolated environment and localhost-only Next listener. Existing migrations are applied only to that fixture. Browser uses fresh headless Chrome context, canonical staging URLs intercepted to loopback; every other origin aborted. Synthetic Auth.js encrypted session cookies stay inside the fresh contexts; no shared browser, Google callback, billing endpoint, real model provider, live database or credential operation. Exact integration HEAD and runtime-source cleanliness are asserted, and actual build ID is saved by the harness. V2 remains OFF.

Review findings repaired by root before clearance:

1. Clear fixture publisher's cached approval receipts before each reseed so new generated source revisions require a fresh receipt.
2. Replace stale `Cancel rollback` / `Rollback recorded` UI assertions with current `Cancel release` / `Reviewed release activated`.
3. Await completed refresh status before asserting source CAS rejection; busy/disabled UI alone is insufficient.
4. Assert exact redirect pathname rather than substring matching.
5. Bind browser use to the owned Next child: require its ready log/port, live exit status and successful readiness response. Do not accept an unrelated preexisting server's login page.

Prepared harness safety/behavior review PASS after these repairs. Root owns execution and saved outcomes. If the Python hard timeout occurs, verify child Next/Chrome cleanup as well as PostgreSQL cleanup; terminating Node alone cannot guarantee descendant cleanup. This is an operational recommendation, not a claim that timeout occurred.

Expected eight scenario groups: public responsive/noindex checks; anonymous denial; subscriber owner-workspace denial; owner cancel/double acceptance with native audit/job persistence; source CAS and completed refresh; reviewed rollback/cancel with native release rows; current-account deactivation; Google provider declaration without exchange. These are actual compiled local Next/Auth.js/Prisma operations on synthetic PG18 fixtures. They do not establish hosted TLS, OAuth, paid entitlement expiry, provider generation/delivery, human quality or complete rollout acceptance.
