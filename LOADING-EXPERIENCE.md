# V9 Q12 illustration loading preview

Owned candidate: `experthub-app-b-loading-screen`, branch `integration/b-v9-loading-screen`, local compiled preview `http://127.0.0.1:3947/`. Based on exact-art commit `558acd8bba1a843ad27adba0d1b3e92bf600fe4a`, preserved separately at3937. No deployment, push, installs, provider/backend/auth changes or progressive scene prototype adoption. Earlier documents describe historical baselines; this file defines this candidate.

## Loading experience

Original inline SVG suggests contributed words becoming a twin; it adds no image/model request or dependency. The nonmodal card occupies the measured artwork lane, leaving story, header navigation and keyboard anchors usable. Light/dark palette follows the chosen app theme. Decorative CSS movement stops for reduced motion; static/no-JS modes retain source-specific posters and skip the heavy runtime. No autoplay audio.

The actual two stream writes report decoded bytes into a native progress element. The displayed decimal MB count and bar use the same values; updates share a requestAnimationFrame. This is receipt progress, not overall readiness or compressed network bytes. Before a known receipt stage and after transfer, “Preparing animation” is indeterminate: SHA validation, parsing, shader compilation and the first correct current-frame render do not have a measured total. No percentages, elapsed-time simulation, forced minimum delay or 99% hold. Completion uses the existing current frame/theme/composition gate; the canvas and card crossfade for180ms once actually ready. No forced loader display on a warm fast path.

“Read without animation” aborts the pending generation and focuses the existing motion control. On error the card becomes a compact static-artwork strip with Retry; the reading composition remains visible. Retry uses a fresh generation, preserves current scroll/source/theme, and focuses its static action. If readiness arrives while focus is in the card, it remains usable with Continue; it does not steal focus. Leaving it or Continue dismisses it. Late stream/render callbacks cannot revive a disposed, failed or replaced generation. Off-story and hidden-document updates keep the card hidden, preventing interference with source details/history. Stage-only polite announcements avoid per-chunk screen-reader chatter; native progress has aria-live=off.

The app-owned `cache-delivery-v9/load-scene.js` adds a guarded onProgress observer; it is no longer byte-identical to the author loader. Its two-stream/fixed-buffer limits, exact sizes, abort handling, whole-asset SHA validation and cache headers remain. Author/renderer originals are read-only.

## Reviewed artifact tradeoff

This combines the loader with the separately reviewed V9 Q12 artifact from `experthub-mobile-v9-quality-q12-r1`. The211-entry frozen experiment manifest was verified with zero mismatches. Independent review: `2026-10-05/task-5/V9-Q12-INDEPENDENT-REVIEW.md`; decoded audit: `V9-Q12-DECODE-AUDIT.json`.

Decoded scene:15,969,384bytes, SHA256 `0a21e41554221c1cb6edb3685ba7ad578fda414f0dd1b1607b2830ee4643a958`. Two Brotli bodies total7,077,551bytes under `/uploads/live3d/b-v9-q12/`; decoded arrays total15,969,384bytes. Five cortical mesh base/morph normals are intentionally rounded to1/4096. Max normal component change0.0001220703125, RMS0.0000528. Geometry positions, morph positions, indices, UVs, animations, paper/glyph/receiver/cap geometry and quoted source strings remain exact. Float32 counts, triangles and GPU memory are unchanged. Byte savings combine this slight normal precision reduction with lossless buffer sharing; this is not pixel identity. Independent40 phone RGBA comparisons had at most4/255 channel change, worst mean0.00063368;552 forward/reverse hashes match. These are bounded preview evidence, not final art/collision/performance acceptance.

The original author clock/evaluator and sequential280ms-out/360ms-in text fades remain. Large rapid jumps can briefly show near-opaque old copy over latest geometry during the unchanged fade; no claim of every-frame semantic synchronization. Source citations allow inspection and are not a correctness guarantee. The story remains based on explicitly shared documents, with manual source correction only. BodyParts3D CC BY4, Three and Meshopt attribution remain in the served license files.

## Verification

Build, full test results, actual installed-Chrome journeys and screenshots are recorded in `../loading-screen-qa/RECEIPT.md`. Browser automation uses installed Chrome/Playwright, with outside traffic blocked; agent-browser CLI is absent and no installation is authorized. The loading UI improves feedback and choice; it does not remove slow cold transfer. Physical Android, independent native QA and final visual review remain required before parent approval/publication.
