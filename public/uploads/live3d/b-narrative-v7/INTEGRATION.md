# V7 renderer handoff — app adoption/art gates remain open

This is a local original prototype. No app files were changed. Parent owns any app integration and authorv8 coordination.

## Runtime boundary

Use `createNarrativeRuntime(options)` from narrative-runtime.js, with b-runtime.js, b-timeline.js, narrative-clock.js, author-metadata.js, and the byte-identical author evaluate-local-clips.mjs. Existing installed Three.js0.186.1/addons only. A persistent canvas owns a single WebGLRenderer; source DOM/keyboard/provenance is independent. The included standalone main.js demonstrates loading/cancellation/fallback ownership rather than app UI to copy wholesale.

Options: canvas, shared pose envelope, AbortSignal, explicitly allowlisted assetUrl/assetSha256, assetMode:'b-local-v7', initialDark, sourceRegistry, copyHoldScale:.95, optional preparedAssetPromise resolving {bytes:ArrayBuffer,fetchMs} or {error}. Raw and packed hashes are in AUTHOR-SNAPSHOT.json/evidence/lossless-packing.json. Promise rejection/abortion/obsolete generations must not create a late owned renderer. Startup has a20-second budget; initial reduced motion skips heavy module/asset fetch. Visibility/idle pause, context loss poster, restoration preserving current clock, and page teardown are demonstrated in main.js. Dispose exactly once per generation; dispose/uncache author animation, cloned materials, geometry, PMREM/shadows and renderer.

Returned API: setFrame(0…551), resize(width,height,dpr,compositionRect,portrait), setTheme(dark), inspect(), render(), dispose(); plus readonly scene/camera/renderer/asset/objects and getState() for diagnostics. The renderer is demand-driven; the host schedules redraw only when state changes and caps timer-query queues4 and histories360. Framebuffer cap1.6Mpixels, portraitDPR1, desktopDPR<=1.5.

## Author and timeline ownership

Shared v1 registry/poses/material authority stays unchanged. Author Story0…191 owns local channels; renderer evaluates it first. Four Contribution clips then own source-local growth/morph/locator channels. Never blend them equally with Story or double-normalize semantic roots. Source01 retains primary Story growth/clearance and becomes completed1 during secondary episodes. Exact existing original glyphs are highlighted; underlines are visibility-gated; copied paper stays hidden through selection.

Total sequence stays551. Each120-frame secondary episode: enter0–14, read14–38, selection38–50, extraction50–58, readable copy58–74, approach74–110, contribution growth90–110, completed-seat hold110–120. Sources02/03 now have10frames of completed seated identity before the next source enters. Growth is0 until90, completed1 from110; completed contributions persist and upcoming ones are hidden. Camera/body return74–106; copy continues to110. Final contact applies only after completed growth, not throughout partial morphs.

## Adoption gates

Independent captured-art review clears prior full-original, duplicate-selection and torn-cavity blockers. Full-volume gold scaffold masking perceived construction, separated upper laminae and applied-panel-like final leaves remain author/art gates. Parent coordinates authorv8; do not ship these as accepted final art. Fresh continuous native scroll/cadence and actual Android are not certified. Canvas recordings compress the whole sequence into12seconds and omit DOM; they are evidence for review, not representative user scroll timing.

The accepted prototype phone lane is360×416 inside360×640. The app's earlier303px lane was not tested here. Supply actual composition bounds and recheck phone full-source readability, clipping and DOM/art separation before app adoption. Do not assume the captured framing fits that smaller lane.

The included Python server is a local transfer/header proof, not production server code. Production must serve lossless packed GLB and JS using reviewed content-hashed URLs, correct Brotli headers and immutable caching; do not silently default to the35MB raw GLB. Cache eligibility is measured per browser and payload, not guaranteed by a header alone. No provider/auth/database/form/network write, paid service, install, push or deployment authorized/performed here.
