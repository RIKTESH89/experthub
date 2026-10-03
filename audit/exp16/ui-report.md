# EXP16 dedicated expert review screen

Follow-up to backend commit2c5eee36569b79d29ab40d04ea3edb9ebfb4b25e on the same isolated codex/exp16-corrections-20261003 worktree. This report supersedes the earlier report's “no expert UI” gap. No global navigation, public/auth/chat UI, schema, migration, or existing releasePersona implementation was edited.

## Deliverable

Open /expert/reviews directly (or follow its Back to twin settings link). The dedicated server page requires an authenticated EXPERT with an owning profile; surrounding dashboard/expert layouts retain their existing guards. Client fetches are owner-scoped, uncached and parallel. Losing authorization on refresh clears already loaded private review data. No private data is persisted in browser storage.

The screen shows up to100 corrections/releases with bounded audit history, pending/accepted/rejected status, expected review/source versions and live source versions. Accept/reject/revise open an explicit decision form with a required reason and cancel action. Acceptance is disabled for incomplete/unchanged/stale/unsupported proposals. Revision selects a manual source and requires an explicit load of its latest source text/version when stale. Revision remains pending; acceptance is a separate action. Acceptance success states that recomputation is queued and the changed source remains unavailable until complete. History includes action/reason/version/date and source-version transitions. A source-processing disclosure lists current versions and indexed/pending/needs-attention status, with a knowledge-settings link; raw provider error strings are not returned.

Release creation has a confirmation step and uses the loaded expected head. History exposes immutable settings/evidence manifests. Preview rollback makes a read-only owner request: it shows target, source count, setting names and actual target values before a distinct confirmation. The server checks manifest integrity, live evidence pins, full supported evidence coverage and current head. Disabled RAG cannot be offered as enabled by preview. Removed/restricted/stale evidence blocks preview. Confirmation independently rechecks backend CAS; a revocation between preview and confirmation yields a visible conflict and disables further attempts until refresh. Cancel/back sends no write.

Inline sections rather than modal overlays keep forms in normal keyboard/document order. Inputs have labels, actions have44px minimum button height, focus moves to opened decision/preview, feedback uses alert/status live regions, long source/manifest text wraps, and actions wrap on375px screens. Existing component/theme styles are reused. Desktop/mobile/dark and release-history screenshots were inspected; no horizontal overflow or browser page errors in the verified fixtures.

New owner endpoints: GET /api/expert/corrections/context (bounded source/version/status data), POST /api/expert/persona-releases/preview ({expectedHead,rollbackTo}). src/lib/persona/store.ts only appends previewPersonaRollback; its earlier releasePersona body remains unchanged.

## Evidence

- Native backend regression17/17 + Chrome UI flows10/10 =27/27 using actual API handlers, Prisma transactions and a disposable synthetic PostgreSQL database. Final ui-integration.json/log contains exact names/results.
- Mocked route/server-page9/9: unauthenticated/visitor/admin denial, owning expert profile required, request validation and tenant derivation. ui-routes.json/log.
- TypeScript noEmit (empty ui-types.log), focused Next lint (ui-lint.log), git diff whitespace pass.
- Browser screenshots: ui-desktop.png, ui-mobile.png, ui-dark.png, ui-release-history.png. Browser: existing Chrome154.0.8037.95, fresh contexts, external browser requests aborted. Setup blocks node fetch and provider generation. No installations or provider calls.

The test harness bundles the **real ReviewWorkspace** with existing webpack/TypeScript and compiles existing Tailwind/component classes into an isolated runtime asset. It serves actual Next API handlers under a mocked synthetic authenticated actor at127.0.0.1:3116 and uses only exp16_synthetic on127.0.0.1:55436. This is component + real API/DB verification, not a full Next middleware/layout/OAuth/browser deployment verification. Server-page guards are separately tested; no Next dev or full build ran. The harness initially lacked process.env for next/link; fixed locally in its webpack DefinePlugin and rerun successfully. No production component workaround was needed. Both HTTP harness and owned database cluster are stopped after final tests.

Reproduce while only this owned DB is running: node scripts/exp16/build-browser.cjs; node node_modules/tailwindcss/lib/cli.js -i src/app/globals.css -o .exp16-runtime/browser/style.css --content 'src/components/corrections/*.tsx,src/components/ui/*.tsx,scripts/exp16/*'; node node_modules/jest/bin/jest.js --config scripts/exp16/jest.config.cjs --runInBand. Stop the owned cluster afterward. No third-party setup/install code ran.

## Integration and acceptance gaps

Cherry-pick the UI follow-up after backend2c5eee. **Preserve integration owner's backend RAG rollback fix8cec7fb**: this lane's existing releasePersona still predates that fix by explicit coordination. The UI preview blocks re-enabling disabled RAG, but the final POST must also retain integration's authoritative backend rejection. The follow-up changes store.ts only through an appended export, so merge it without replacing releasePersona. No new schema/migration/count change beyond the previous16-migration handoff.

Manual-source corrections only. Post/PDF/blog/document adapters are clearly unsupported in the source selector and copy. Releases with unsupported imported sources remain blocked by the backend. Entry is a dedicated /expert/reviews route with no shared nav changes; adding a shared navigation link belongs integration/EXP30 ownership. Release adoption in chat/answer tracing remains separate. New accepted-source provider recomputation and real authenticated Next end-to-end behavior are still unverified; mocked providers are prohibited from running in these tests. Existing outbox scheduler infrastructure remains responsible for work. No external Linear Done, hosted migration, deployment, push or user data.
