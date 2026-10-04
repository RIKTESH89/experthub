# Expert page lane — integration handoff

Base: `9e0f49d2bcc474a9c7896497bfe546c9356d87a4`.
Clone: `/Users/rikteshs20/Documents/Codex/2026-10-04/task-5/experthub-expert`.
Branch: `ui/expert-pages`.

## Delivered

- All 16 expert page files use an expert-only CSS module/composition wrapper: numbered studio chapters, contextual descriptions, knowledge/publishing/review desk navigation, narrower editors, ledger statistics, clearer review divisions and readable operational type.
- Expert pages and owned editors use semantic theme colors and restrained decoration. Accessible labels cover import fields, editor fields, media actions and back/copy actions. Scoped touch targets keep switch proportions intact. Scoped dark error text passes visual inspection.
- Failed owner reads now show persistent unavailable states instead of zero metrics, empty libraries, or editable defaults. Valid post 404 remains distinct from failed/denied reads.
- Removed fabricated daily overview sparkline history. Sharing/twin instruction copy now acknowledges evidence dependence and AI limitations.
- Product owner guards, backend routes, review/CAS/version/idempotency/rollback controls, evidence/consent/billing policy, shared root CSS/layout/navigation/font/theme/chat primitives remain intact. No new dependencies, provider/schema/credential changes, full build, remote writes, push or deploy.
- ReviewWorkspace accepts an optional fetch transport solely so the development fixture can exercise actual handlers with in-memory synthetic responses. Product routes omit it and retain authenticated fetch.
- Development-only `/e/design-preview/expert` uses development + `EXPERTHUB_UI_FIXTURES=1` gate and explicit synthetic labeling. No session or auth bypass is supplied.

## Evidence

- TypeScript and scoped Next lint pass; no lint warnings/errors.
- Five existing knowledge/post/access/owner-review/route suites pass: **56 tests**. Owner page test mocks its new CSS-module import while retaining owner-guard assertions.
- `git diff --check` passes.
- **39 browser screenshots** in `screenshots/` cover light desktop, dark mobile, forms, release/correction conflict, rollback restrictions, loading/error/empty/owner-denied and real client-page unauthenticated failures.
- See [runtime-verification.md](runtime-verification.md) for exact browser observations, synthetic transport limits, environment details and the explicit stop boundary. See [final-tests.txt](final-tests.txt) for final test evidence and [changed-files.txt](changed-files.txt) for the integration manifest.

## Exact remaining block

The initial local listen EPERM was an ordinary sandbox failure. Explicit authorization to use `require_escalated` allowed the exact isolated server command; local fixture QA then completed.

Actual protected route navigation later attempted a Preview auth redirect toward `https://expert-ui-local.vercel.app`. **Browser automatic approval review denied it** because this was an external unverified Vercel domain outside the authorized localhost scope. Browser work stopped immediately without a workaround or alternate tool/surface.

Actual route guard destination, browser Back, authenticated populated owner layouts and server CAS persistence remain unverified. Fixture checks are not authenticated-runtime completion. Do not mark the complete overhaul QA-finished.

Shared needs: inspect the shared purple PWA prompt and dark destructive text contrast. This lane supplies a local error-text override without editing shared tokens.
