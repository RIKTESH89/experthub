# Independent delivery boundary review

The EXP-15 worker independently reviewed EXP-16's subscriber/widget delivery changes (excluding its own earlier dialogue implementation). Review began at EXP-16 HEAD `090ad6a` with guard/buffering changes uncommitted, and the author subsequently froze them in `074e0d4`. The reviewer then reran externally against integrated exact HEAD **`a8cb3aa74bb44f8e364478333e9564c200cc055f`**, checking Git HEAD immediately before and after the run: unchanged. All four reviewed source SHA-256 pins below match the worker and integration.

`delivery-boundary.log`: **9/9 reviewer tests pass** against the EXP-16 worker source. The actual route/ReadableStream/SSE/provider-state code executes, with injected engine/guard/Prisma/store fixtures. The mocked transaction promises explicitly delay or reject simulated COMMIT resolution. This tests transport ordering, not PostgreSQL commit/rollback, native locking, real auth/provider behavior or deployed HTTP.

`integrated-delivery-boundary.log`: **9/9 reviewer tests pass** against integrated exact HEAD above. This is an integration rerun of the same cases, not nine new independent native tests. No implementation code was cherry-picked into this reviewer's checkout; only the configurable target root changed. Final bounded delivery review is cleared with no unresolved finding. Any subsequent source change needs the appropriate checks again.

Both subscriber and widget withhold full answer bytes until their transaction promises resolve. Rejected COMMIT and disconnect while COMMIT is pending emit zero answer/citation/success bytes. Provider error records and trailing post-DONE frames are rejected before guard invocation. Subscriber source-title progress is scrubbed before a later guard failure. No new correctness finding in this bounded review; EXP-7 separately owns native guard/lock acceptance.

The frozen generation engine retains its prior provider semantics. The HTTP delivery layer intentionally now buffers and releases a whole bounded answer after persistence; incremental provider tokens are no longer forwarded to the visitor. Subscriber generic thinking progress remains available. Cancellation after an actual COMMIT starts may leave committed data without delivery; these tests make no rollback claim for that interval. Existing submitted subscriber question/usage writes occur before generation and are outside this assistant-persistence boundary.

Run from any checkout containing this review-only commit, against either that checkout (default) or an explicit target:

```sh
EXP_REVIEW_TARGET_ROOT=/absolute/path/to/checkout node_modules/.bin/jest --config audit/exp-integration-review/jest.config.cjs --runInBand --silent
```

Reviewed source SHA-256 pins:

```
d87d2971179573a7eab9d5efa043cb2d26c6e2c171afc6eacca4d36f3bea38b2 src/lib/persona/persistence.ts
8e19e8e97e43ef6a5e35f54a5fefebe024fbc5baafc8352a544a3d2ad93aeb3e src/app/api/chat/sessions/[sessionId]/messages/route.ts
313607c11f174517a5ca6e15d4286e5a325ca0a0f410b0e40f7723204f516214 src/app/api/widget/chat/route.ts
cca9e116588302f3ea33d50c87627ca74d9e4c38c4b1ca0ebab5123b6534a31c src/lib/ai/chat-engine-baseline.ts
```

No source implementation edits, source checkout cherry-picks, live database mutation, browser contention, provider calls, credential creation, spending, network transmission, push or deploy occurred in this review.
