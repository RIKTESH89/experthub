# ExpertHub runtime-r2 integration contract

Versioned original camera/studio patch. Consume this directory’s module/data and the unchanged frozen v7 GLB; do not copy the isolated prototype HTML, CSS, copy, chapter buttons or event handlers. Host app owns its continuous homepage DOM, scroll mapping, persistent canvas, loading/fallback, performance instrumentation and lifecycle. No app files were edited in this lane.

Asset: `../assets/scene.glb`, 6,079,300 bytes, SHA256 `c602aa49df4785c6c80bf14c9c74b0874076b97424cd1611285b07899a2a5ea0`. Camera envelope is hash-bound to that asset. Three 0.186.1 and official GLTFLoader/MeshoptDecoder are already installed; no additional dependency or install required. Preserve asset hierarchy, materials/names, Brain_Root / Sources_Root / Twin_Root, Camera_Hero / Camera_Portrait, and Story’s 41 channels. Animation frames0–191 at24fps. Keep the authored global art transform; do not independently move roots. Source-registry/attribution remain required.

The module has no DOM, fetch, RAF, scroll, observer or global dependencies. `createCameraDirector(THREE,envelope)` caches small math scratch objects and applies only the supplied display camera. `createStudioRig(THREE,{scene,renderer})` creates its own key/fill/rim/detail and shadow ground/soft studio bed; optionally pass existing owned key/fill/rim/ground to refine those instead. Host retains ownership of asset materials, renderer and environment; rig mutates roughness/metalness of alabaster/paper and owned light settings. Dispose the rig before scene/renderer disposal. It removes and disposes its own lights/geometry/materials. Existing passed lights and ground stay owned by host.

```js
import {createCameraDirector,createStudioRig} from './cinematic-runtime-r2.js';
// Fetch local envelope and camera contract during the same generation-owned asset load.
const director = createCameraDirector(THREE, envelope);
const studio = createStudioRig(THREE, {scene, renderer});
studio.setTheme(isDark);
// Host environment: original local RoomEnvironment + PMREM; no remote HDR/textures.
// Set up owned GLB shadow flags: copy/printed text does not receive self shadow;
// ink/bronze and oversized authored desk do not cast; suppress authored desk if present.
// BEFORE compileAsync, configure studio and restore pose0 so shaders warm once.

function updateScene(frame, canvasWidth, canvasHeight) {
  frame = Math.max(0, Math.min(191, frame));
  actions.forEach(action => { action.paused=false; action.enabled=true; });
  mixer.setTime(frame / 24);
  const aspect = canvasWidth / canvasHeight;
  const variant = aspect < .9 ? 'portrait' : 'desktop';
  const sourceCamera = gltf.scene.getObjectByName(variant === 'portrait' ? 'Camera_Portrait' : 'Camera_Hero');
  const track = contract.tracks[variant][Math.round(frame)];
  director.apply({camera, sourceCamera, frame, aspect, variant, track});
  renderer.render(scene, camera);
}
// On theme switch: studio.setTheme(isDark); request one render.
// On disposal: studio.dispose(); then mixer/root/PMREM/material/geometry/renderer cleanup.
```

Camera shots (host decides exact scroll segment mapping): frames0–12 brain macro;12–40 smooth pullback;40–102 full-scene wide;102–120 approach twin;120–141 twin reading macro;141–166 pullback;166–191 full-scene wide. Suggested homepage story anchors0 /53 /137 /191. Frame137 is the clearer reading hold; original diagnostic harness still maps its three sample anchors0/53/127 and is not the app timeline. Camera tracks/morph/transform time must advance together from one scalar. No automatic portrait roll. Macro shots intentionally allow secondary objects outside frame; wide holds retain whole scene. Do not reuse old whole-scene-fit assertions at macro poses.

Host budget/lifecycle: DPR≤1 portrait /≤1.5 desktop; drawing buffer≤1.6M pixels;1024 VSM shadow map with6 blur samples; no additional shadow lights/textures. Demand render on pose/theme/resize only; pause/visibility/intersection stop; reduced motion/SaveData/failure/context loss use owned static art. Renderer/context-loss ownership and generation checks stay in app adapter. The rig adds one two-triangle procedural shader bed, no textures. The existing runtime’s render instrumentation counted40geometries /17textureobjects after full sweep. Measure again in the app: independent canvas size and extra UI can change budget.

Actual browser checks:38 forward/reverse poses per desktop1440×900 and360×640; every120–132 reading-entry frame, selected subject fit, wide fit, no JS errors/warnings; same-light/camera v6/v7 controls at119/120/123/125/128/132/137/145; lifecycle and missing/delayed asset ownership pass. Rig factory test creates7objects then disposes to0; mismatched envelope hash rejects. Review evidence/report in parent candidate directory.

This is an isolated integration prototype patch. Parent independent review and actual app QA remain gates. Physical Android, Safari, clean cold load and thermal tests are not completed; no visual parity or production acceptance claimed.
