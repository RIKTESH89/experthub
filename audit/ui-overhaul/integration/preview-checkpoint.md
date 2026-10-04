# Progress preview checkpoint

Branch: `design/full-ui-overhaul`. Isolated checkout: `/Users/rikteshs20/Documents/Codex/2026-10-04/task-3/experthub-ui`. Based on reviewed `7e7c5b256846a447caf940379c6023a77957fef1`.

## Change inventory

Includes the existing all-route light/dark redesign, responsive navigation and shared states, public/subscriber/expert/admin page batches, original lazy Three.js homepage illustration, and signed-in chat interruption/reconciliation UX from `47fbef21d357243bc64b16f73958a238bd84b5fd`. Exact approved dependencies are `three@0.186.1` and `@types/three@0.186.0`. The homepage illustration remains a visual prototype; material refinement and the full sources-to-folio choreography remain future work.

Adds only the explicitly approved backend integration from `e2a9eb2fb8a5ace695f0297363465d0c5728281c`: cancellation/deadlines, strict provider terminal validation, interrupted-stream cleanup and persistence boundary. All 12 imported source/test blobs match exactly; see `approved-backend-source.json`. Four stale fixture expectations were updated for AbortSignal propagation, required `thinkingSteps`, history source shape and valid terminal SSE. The successful response fixture now consumes and asserts the saved acknowledgement.

The first combined run had 15 failures: 13 valid-stream timeout failures in thinking-chat-enhanced were a real pending-demand pull bug; two other failures used stale fixtures. The reviewed e2a9 fix continues reading metadata/partial UTF-8/DONE-only chunks until content enqueues or the provider reaches EOF. Production parser validation was not weakened. Focused rerun: 3 suites, 34 tests passed; combined rerun: 87 suites, 1,320 tests passed, zero failures. Types, lint and the complete production Preview app build pass. Existing Sentry/OpenTelemetry dynamic-import and Edge dependency warnings remain; no build errors. Logs are alongside this document.

## Preview configuration and limits

Validation builds use synthetic credentials and validated `VERCEL_ENV=preview` metadata, with no local QA fixture flags or session harness enabled. Direct Next build validates app compilation without running database migrations or modifying hosted environment. No dotenv files or live credentials are loaded, and the local outbound guard remains enabled for validation only. No push or deployment was performed by this worker. Parent owns existing protected Preview branch integration, migration 18 and actual staging configuration. Production master remains untouched.

Preview external provider paths must remain disabled. This candidate introduces a default server deadline of 30 seconds if no valid `CHAT_REQUEST_DEADLINE_MS` is configured (accepted range 1–120 seconds); hosted sizing/activation remains an owner decision. Uninterruptible Prisma reads and the already-decided COMMIT boundary cannot be retroactively cancelled. Accepted user question usage remains counted; no refund logic is introduced. Client recovery reloads persisted messages before another send.

Actual local browser evidence includes desktop/mobile light/dark homepage screenshots and replay GIFs, signed-in role dashboards, chat failure/recovery and 11 API role/account guard checks. These were captured against synthetic-only local fixtures. No real provider response, hosted auth/billing or physical-device performance was validated. Reduced-motion and WebGL fallback behavior have unit coverage; GPU/performance budgets are prototype limits rather than physical-device benchmarks. The corrected admin screenshot records active/inactive/banned status from the existing DTO.

Useful visuals: `../three-home-light.jpg`, `../three-home-dark.jpg`, `../three-mobile-light.jpg`, `../three-mobile-dark.jpg`, `../three-replay.gif`, `../three-pointer-replay.gif`, and `../actual-chat-preheader-failure-mobile.jpg`. Library asset identities are in `library-assets.json`.
