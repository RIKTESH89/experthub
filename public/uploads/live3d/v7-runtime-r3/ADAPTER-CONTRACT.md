# Runtime-r3 ownership and integration contract

Original isolated camera/material/lighting patch. App owner owns stage viewport, copy protection, pricing handoff and app files. Runtime worker owns this module/envelope only. V7 asset SHA256 c602aa49df4785c6c80bf14c9c74b0874076b97424cd1611285b07899a2a5ea0,6,079,300bytes is unchanged; no geometry, animation, source identity or asset-version changes. Three0.186.1/officialMeshopt reused; no installs. Earlier freezes remain immutable.

Replace the app-owned module import with this versioned handoff and point asset config at camera-envelope-r3.json; retain the exact v7 scene/camera contract/provenance. Do not copy prototype HTML, CSS or fixture artwork lifecycle: those are diagnostics. createCameraDirector/createStudioRig preserve the r2 entry points. New caller requirements:

```js
// Host owns full-stage viewport/canvas; aspect uses its full dimensions.
const stage = stageElement.getBoundingClientRect();
const lane = copyFreeArtLane; // Host-owned rect in CSS pixels, not a clipped canvas.
const compositionRect = [
  (lane.left-stage.left)/stage.width,
  (lane.top-stage.top)/stage.height,
  lane.width/stage.width,
  lane.height/stage.height,
];
// Mixer/action reset and authoredCamera/frame/track selection stay synchronized.
director.apply({camera,sourceCamera,frame,aspect:stage.width/stage.height,
                variant,track,compositionRect});
studio.setFrame(frame); // New: subdued anatomical source during twin-led stages.
studio.setTheme(isDark);
```

compositionRect is normalized CSS top-left x/y/width/height, strictly positive and inside canvas. Default [0,0,1,1] preserves isolated canvas use but DOES NOT repair the actual app’s hard interior rectangle. Director computes fit against the composition region and shifts projection into it, while the render frustum covers the entire stage. Secondary objects can render outside the lane; macro crop at physical viewport edges is distinct from truncating at the lane’s internal boundary.

The app owner must protect copy with backing or feathered masks. A diagnostic proposal uses horizontal feather72px outside/16px inside desktop lane and vertical24/20/32px around phone lane. Those values are examples, not accepted app styling. The captured-context fixture still exposes a little paper near phone closing copy; title protection must be checked explicitly. A hard rectangular crop is not an adequate substitute. Keep a stable positive composition rectangle during pricing handoff, then resolve/fade the entire art; do not shrink the lane into zero height or leave the twin cut by a product-section boundary. Pricing timing/viewport remains app-owned and unverified by this module.

Camera schedule: brain macro0–12; pullback12–40; phone focuses four ORIGINAL source documents40–96 (not unrelated empty framework), desktop retains full-scene wide;96–116 approaches reading twin;116–145 twin+copied reading evidence;145–167 smoothly shifts from that union to the anatomical foundation/layers alone;167–191 keeps that final body as hero. No added roll. Camera envelope caches actual posed geometry every4frames+191, so normal runtime never scans vertices. Frame0–191 at24fps remains a single authored animation clock. The returned weights now include sources/body; update the app’s optional QA inspector accordingly: sources means ancestors Source01_Original…Source04_Original; body means Twin_Anatomical_Foundation and Twin_Layers_*; do not reuse the old brain/twin-only inspection as proof. Strict fit assertions apply at settled shots, not intentional transitions.

Lighting/material changes: neutral warm dark studio bed instead of green; rougher/tinted alabaster and alternating warm paper-edge/lamella tones; lower normal shadow bias .0035 for interlayer contact; lower key energy, grazing detail and restrained fill/rim. Thin floating original/copy papers stop casting broad bar shadows; the main folio/brain/layers retain physical shadows. studio.setFrame grades ONLY anatomical-source material brightness down40% during92–116 onward; source geometry/visibility and copied paper words remain intact. This is intentional art direction, not a claim of physically derived exposure. Jagged lamella topology and source brain faceting cannot be solved by these shading changes alone.

1024VSM/6blur samples; one procedural two-triangle studio bed; no added textures/shadow lights. Bound buffer≤1.6M pixels, DPR≤1phone/≤1.5desktop, demand render and host lifecycle/fallback ownership unchanged. studio.dispose before root/renderer disposal. R3 standalone lifecycle and resource checks pass. Full-stage localM5 light sweep GPU p95 5.613ms at1470×801 /4.035ms at360×640;168GPUtimer samples each, complete0–191sweep,CPU1.9/1.8ms. This is isolated GPU evidence using captured app composition coordinates, not an integrated app or physical Android measurement.

Actual app overlay loading failed with503; no security override attempted. The alternative is explicitly labeled captured-app DOM/CSS fixture on localhost4322.16fixtures cover seven chapters in desktop/phone, with identical sampled original frames and experimental full-stage/mask. They establish a composition proposal, not actual app visual acceptance. Parent/app owner must apply their owned viewport/adapter changes and independently inspect final native pixels, copy contrast, timeline and pricing close. No publication/production authorization.
