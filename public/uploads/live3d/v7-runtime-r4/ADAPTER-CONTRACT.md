# R4 opt-in studio patch

Review candidate only; no app edits or publication. Frozen v7 GLB stays canonical at SHA256 c602aa49df4785c6c80bf14c9c74b0874076b97424cd1611285b07899a2a5ea0. R3 camera module and envelope are unchanged. App owner retains full-stage compositionRect, copy masks, pricing, loading/lifecycle and telemetry. Asset author retains geometry. Integrate only the files in this handoff, not fixture HTML/CSS/artwork code.

Import createCameraDirector/createStudioRig from cinematic-runtime-r4.js; preserve adjacent cinematic-runtime-r3.js and contact-shadows-r4.js. Load contact-bounds-r4.json under the same generation/cancellation guard as the GLB/envelope. It records WORLD-space object bounds sampled every4 frames+191 from exact v7. Camera aspect uses full-stage dimensions and normalized app-owned compositionRect exactly as R3. No added camera contract.

```js
const studio = createStudioRig(THREE, {scene, renderer, contactBounds});
// After mixer/action pose and director.apply(...):
studio.setFrame(frame);
studio.setTheme(isDark);
// INSIDE the measured draw / GPU query, immediately before main rendering:
studio.renderContacts(performance.now());
renderer.render(scene, camera);
// Before removing/discarding asset root and renderer:
studio.dispose();
```

Contact metadata is optional: omitted metadata creates no new targets and retains simple lighting/floor fallback. Wrong assetSha256 rejects and disposes the created base rig. Caller must verify the actual GLB hash too; metadata validation alone is not asset validation. Do not pair v8b with v7 metadata as a production adoption. A future asset requires freshly measured/validated contact bounds. Pause/context loss/reduced motion must prevent renderContacts as well as the main draw. Context restore recreates the rig/targets through host lifecycle. Never let a late bounds fetch recreate a reduced-motion renderer. Keep renderer ownership exclusive during contact capture; current app uses full viewport with no custom scissor pass.

Three128×128 object-local contact masks (brain, original folio, twin foundation/layers) use borrowed geometry and morph references, two separable blur passes, and cached matrix/morph signatures. Static brain/folio masks do not rerender when only the camera changes. Changing masks update at most30Hz for small frame increments; jumps≥4frames and first-use fields update immediately. Max9 RGBA8 targets, estimated688,128bytes including nominal16bit depth; this is not driver-resident memory. 3 receiver meshes share one two-triangle plane geometry. Capture saves/restores target, clear color/alpha, autoClear, shadow autoUpdate and XR state. Dispose releases all9 targets, own materials/plane and receivers; it never disposes borrowed authored geometry.

These are stylized local contact cues aligned beneath each posed object, not physical world-floor AO. Lighting/material changes reduce key/fill energy, add restrained paper sheen, fix dark bed output color conversion and grade anatomical-source albedo down55% after92–116. R3’s 40% grade is replaced; all source geometry/words/material identities/animation tracks stay intact. Lamella jaggedness and brain faceting remain geometry concerns. Original source book still competes in some layouts; app composition ownership is unchanged.

Measured isolated full-stage M5 GPU p95:5.656ms desktop1470×801/3.999ms phone360×640 in0–191 sweep.20s repeat tests:5.328/3.965ms. Contact passes are included in timing.41geometry/26texture counters plateau vsR3’s40/17. Controlled disposal returns1geometry/1texture in bothR3/R4 while holding the disposed renderer; no additional R4 residue, but not a proof of total VRAM reclamation. First contact shader warm-up remains extra startup work; warm first-visible200.9ms desktop/130.8ms phone in one run, not clean network/cold-load measurements.

Current-app evidence uses actual f96b6ce DOM/styles/copy masks from localhost3817 captured into an isolated server4323. Before images are actual current-app pixels; after images are isolated fixtures with the same sampled frames/layout. Parent must independently review/integrate native app before accepting or publishing. No physical Android/Safari/thermal test or ORYZO parity claim. No new installs, paid services or copied unlicensed code/assets.
