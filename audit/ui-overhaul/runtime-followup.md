# Runtime evidence follow-up

Prototype commit: `f05878c2e12daab0a882e941f226b39bd39bcde8`, branch `design/full-ui-overhaul`, worktree `/Users/rikteshs20/Documents/Codex/2026-10-04/task-3/experthub-ui`.

## Three.js review assets

Four actual renderer captures (desktop/mobile, light/dark) and two GIFs are saved to ChatGPT Library; exact IDs are in `integration/library-assets.json`. The prepared-upload helper reported preparation unavailable, before any transfer, so the documented ordered direct-create fallback was used. Every returned identity/version was applied to its local file. No source upload or external publication occurred.

`three-replay.gif` uses 6.236 seconds of uninterrupted CUA screenshot capture following keyboard/button replay, sampled approximately every160ms and resized with already-installed Pillow. Thirty-eight samples optimize into29 GIF frames; the final hold is extended1second. `three-pointer-replay.gif` records6.364seconds with actual pointer placement at two observed points inside the canvas during replay. GIFs are actual rendered captures, not generated animation. The choreography is arrival, a short orbit and a settled source fan; the stronger answer-folio transformation in the art direction remains unfinished. Premium-quality acceptance and parity with reference studios are not claimed.

CUA observed renderer identity r186, desktop15draws/6,524triangles and phone11draws/5,788triangles; desktopDPR<=1.5, phoneDPR1, verified390px width. Sampled p95 frame interval was about50ms under the30fps cap, not a GPU-cost or device-FPS benchmark. No LCP/CLS/physical low-end benchmark or lazy-chunk transfer measurement yet. Fresh production build after Three passed; `/` first-load JS129kB (lazy renderer excluded), shared88.2kB. Existing Sentry/OpenTelemetry/Edge/Browserslist warnings remain.

Capability and component tests now cover reduced-motion initial preference/live change, missingWebGL2, context-loss event fallback, unmount controller disposal, Save-Data and known low-resource hints. Twelve targeted tests pass. Browser-level preference/WebGL fault injection and measured GPU disposal are still unverified; tests do not claim physical-device coverage.

## Actual protected-route QA

A new disposable PostgreSQL18 cluster lives only in `.ui-runtime/uiqa-pgdata`, loopback55441, database/user/password `fixture`. Its current-schema DDL was exported read-only from the reviewed schema using `prisma migrate diff --from-empty --script` and loaded only into this new empty fixture DB. No existing/hosted database migration or schema edit occurred. The local runner's optional second port parameter retains fixed synthetic identity and existing fail-closed config/network checks. Original checkouts and provider credentials remain untouched.

`scripts/ui-preview/session-fixture.cjs` is a standalone development/test-only harness, never imported by the product. It refuses foreign context/database identity or a nonempty DB, seeds explicitly named `Synthetic QA` users/content and issues standard NextAuth test JWT cookies on loopback3439. It does not replace auth handlers or role/account callbacks. Eleven actual API checks passed: anonymous401, correct subscriber/expert/admin200, cross-role403, forged admin JWT claim403 after database role resolution, banned/inactive/missing401. Exact results: `integration/authenticated-guard-results.json`.

CUA verified actual `/subscriber`, subscribed expert chat with saved synthetic messages, `/expert`, empty knowledge library, empty correction/persona-release queues, `/admin` and users table. These are normal application routes and backend data, not the earlier visual-fixture pages. No OAuth/provider/payment handshake or role mutation was performed. Other role-specific forms, quota/billing edge journeys and all route/theme permutations remain pending.

The actual users table exposed a DTO mismatch: it expected `status`, but the API returns `isActive`/`isBanned`. Frontend mapping now distinguishes active/inactive/banned/unknown; ban/unban uses the actual flag. API/auth enforcement is unchanged. Failed admin statistics now show an unavailable/retry state instead of fabricated zero counts.

## Chat interruption repair

The UI uses the contract from reviewed EXP29 backend report (pre-header JSON504 deadline,499 cancellation,500 failure; after-header incomplete SSE; persisted terminal done/messageId required). The failure alert/status is separate from assistant content, preserves the draft, removes empty assistant placeholders, labels partial answers incomplete, and suppresses rating of that temporary answer. Stop response uses AbortController. Repeated sends are guarded before asynchronous session setup.

Retry connection performs GET-only session and usage reconciliation, replacing optimistic rows with authoritative messages, without another send. There is no idempotent POST or refund claim. Successful acknowledged sends also read server usage rather than incrementing a local estimate. Failed/malformed/unterminated streams never count as successful completion. The reader is canceled and its lock released on terminal, protocol error and read failure.

Actual isolated backend generation refusal produced a visible pre-header error on desktop and phone390px, with the question preserved in the textarea. No provider call occurred: local external-service policy rejected generation. GET recovery restored the saved user message once and retained the draft; SQL counts before/after the first recovery were identical:2users,1assistant,1usage. A separate phone check sent a second explicit synthetic question. Initially the phone override applied to another QA tab; corrected captures were saved only after confirming `innerWidth=scrollWidth=390`.

Targeted tests cover before-header network/504/499/500 errors, partial interruption, explicit cancellation, repeated recovery clicks without POST, draft retention, truthful server usage, malformed/unterminated/terminal stream parsing and reader cancellation/release. Exact test/build logs and later combined acceptance are recorded in `integration/`.
