# Independent compiled local-auth outcome review — 8baf837

**PASS for all eight recorded local scenario groups.** The reviewer inspected saved receipts, logs and the rendered correction workspace; no browser, database, provider or Google operation was initiated during this review.

Candidate `8baf837331cd0ef626d3fa19a59646fd46a58ef7` and build ID `cS2aS0U9mwZFA5uCtkmPq` match in `evidence/remaining/combined/build/build.json` and `integration/audit/remaining-acceptance/local-auth-8baf837/built-browser.json`. The build receipt records exit 0, clean candidate source, blocked external network, exact local Geist assets without substitution and V2 default OFF. Chrome is `154.0.8037.98`; the owned Next 14.2.35 listener is `127.0.0.1:3531`, ready in 195ms. This fresh build receipt supplies the candidate-to-build evidence that BUILD_ID alone cannot establish.

## Outcome and cleanup

- Browser report and browser log agree on eight PASS groups: public responsive/noindex/zoom; anonymous page/API denial; subscriber owner-workspace/API denial; owner cancellation and exactly-once double acceptance; source CAS conflict and stale acceptance after completed refresh; read-only release preview/cancel and audited rollback; persisted-account deactivation invalidating the existing synthetic session; Google button/provider/callback declaration without Google exchange.
- `errors: []` and `external: []`; no recorded browser error or attempted external origin. The reviewed harness still routes the synthetic HTTPS staging URL to the owned local Next listener and rejects other browser origins; the server loads the network guard. These are local observations, not hosted TLS, Vercel protection or OAuth proof.
- Identity before migration is `integration_full_http|integration_synthetic|PRIVATE_SOCKET|0`. Prisma explicitly skipped environment-file loading. All 18 repository migrations applied successfully to the new owned PG18 database.
- Every wrapper step exited 0, including browser and PostgreSQL stop. `result.json` records success, cleanup and runtimeRemoved true with no database TCP listener. Reviewer independently checked `/tmp/experthub-full-http-u4316mgw` is absent. No timeout is claimed.
- The actual screenshot shows ACCEPTED correction review version 2/current source version 2 and the queued recomputation notice in the compiled expert workspace. This does not establish indexing/provider recomputation completion.

The earlier 43b784a run remains preserved in its original `local-auth` folders. The candidate-specific 8baf837 folders are separate. No further execution was needed for this outcome review.

## Acceptance boundaries

This advances the same bounded H1–H8 local analogs documented in `hosted-43b784a/ELIGIBILITY-AND-PLAN.md`: native synthetic identity/access, owner correction/CAS/rollback persistence, lifecycle-job creation and current account revocation. It establishes actual compiled Next/Auth.js/Prisma execution on owned PostgreSQL 18 with all 18 migrations, not just mocked stores.

Hosted H1–H8 prerequisites remain unchanged: an available expressly authorized separate hosted session or bounded designated existing-account Google exchange; approved expert/source fixture and preview scope; consenting fresh-signup identity/live PII writes; explicit named live fixture/release/access mutations; and rights-cleared provider transmission/runtime scope. Real Google signup/logout/relogin/natural expiry, paid-period entitlement loss, deployed authenticated routes, native PostgreSQL 16, generated chat/vector recomputation and human quality assessment remain separate gates. The independent Razorpay/Resend task owns its browser and provider scope. EXP-25 is not Done from this local result.

Parent reported combined 1,862 tests across 153 suites, types, lint, build and two frozen 116-case runs passing. This note independently reviews the supplied native-auth/build artifacts only; it does not claim a separate rerun of those broader checks.

## SHA-256 fingerprints

Paths are relative to task-5.

| Artifact | SHA-256 |
| --- | --- |
| `integration/audit/remaining-acceptance/local-auth-8baf837/built-browser.json` | `893f4f41ef7e1d7a14c0786759c6151ad5c325f9eb5bb33fb64c5fd48dd4f3b4` |
| `integration/audit/remaining-acceptance/local-auth-8baf837/server.log` | `9b1be6c4dfdca03e8c682069265cbe40e20a702705bae056b65098665bdcbb68` |
| `integration/audit/remaining-acceptance/local-auth-8baf837/built-review.png` | `f50705e1c3b795a81a866ed14f2a9c1264b0bd7dda0047fc01fb084e54fe0c7f` |
| `evidence/remaining/local-auth-8baf837/result.json` | `32d88beef823ab730b1733d02d6edcdaed5abc85ed35061767319cb855af29cc` |
| `evidence/remaining/local-auth-8baf837/migrations.log` | `4f7734c2dc525b5b68e48bb275236d74100c0691f2933c738fa90a40a5303af6` |
| `evidence/remaining/local-auth-8baf837/browser.log` | `a14cf0a0c4f6199f73e1539de7f9e0cc7648ff4b91ade0cf5f6b42070d810d34` |
| `evidence/remaining/local-auth-8baf837/stop.log` | `ca19178a35ab4153b75b494963b66ce8243e1b94c173107c87b44d09db23652d` |
| `evidence/remaining/combined/build/build.json` | `42559ced8dd5fa29d3af421d33dbd280ce3a3502e4ef88372a379f3a76767d94` |
