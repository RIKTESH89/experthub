# Experimental B app integration preparation

Branch `integration/b-runtime-preparation` starts at accepted sequential-text commit `d3bbef37fee30616961b81a2528b843fd9ae6007`. Local review target: http://127.0.0.1:3887/. No push/deploy or final acceptance.

App ownership: `src/components/home/cinematic/b-artwork.js`, the existing app adapter/configuration, DOM safe region and loading presentation. Renderer/author ownership remains task-4's `experthub-b-animation-r1/handoff-b-r1` and its coordinated author asset. Only frozen copies are imported here. Original author files were read, never edited. The handoff report actually resides in the prototype root, not inside the handoff directory.

## Frozen experiment

Asset: `public/uploads/live3d/b-r1/scene-b-local-v4.glb`, 12,191,884 bytes, SHA-256 `142d85fe44f17f6838b16b9e8d91221a8e5d0a5a843c4b7ca1b73f920ccd1966`. This is the uncorrected local-v4 proof. `authorGeometryPending`, `attachmentValidated:false` and `fullLeafContactAccepted:false` remain truthful runtime diagnostics. Sources 02–04 copies are still hidden by the supplied runtime. Rights and attribution are included beside the asset; existing BodyParts3D CC BY 4 footer attribution is preserved.

The copied runtime differs only by explicit registry/validation URL parameters for app relocation and removal of four unused declarations to pass the app lint rules. No transform, geometry, seat, normalization, animation or material implementation was independently changed. The copied `b-timeline.js` and shared contract JSON are unchanged. Input hashes are recorded in `../b-integration-qa/FROZEN-INPUTS.json`.

## Adapter contract

The app retains seven chapters, reading holds, reverse-safe authored frame mapping, accepted sequential text controller, source anchors/history, pricing release, login/apply/pricing routes, theme, reduced-motion/static eligibility and raster cache/failure recovery. The wrapper supplies an owned canvas, abort signal, frozen asset identity, pose envelope, theme and normalized actual DOM composition rectangle to `createBRuntime`. It performs demand rendering, visibility pause, late-result disposal and context-loss fallback through the existing app lifecycle. Every recreation owns a separate renderer/scene/mixer; author-local actor roots are not normalized again.

Loading uses the author's transparent hero/overview/reading/formation posters. Their reference composition is transformed into the actual app composition rectangle using the same width/reference-aspect relation and center as B's off-axis projection. The loading image is a static milestone, not a fabricated in-progress live pose. It uses full-viewport chrome masking, clears on activation/failure/disposal and cannot revive from an obsolete decode after theme/motion changes. The live canvas is revealed only after it reports the current app frame, theme, composition and portrait state. The original raster/static fallback remains available on live failure or ineligibility.

## Coordination required before adoption

1. Renderer/author must provide the corrected asset filename, SHA, bytes, normalization/locator validation, runtime version and complete frozen contract together. Do not overwrite this fixture or add a guessed accepted hash.
2. Corrected readable seated quote orientation, whole-leaf surface contact and intersections, secondary contributions and final twin geometry remain author/native acceptance gates.
3. App keeps its accepted frame-to-chapter clock. B's readable-source pose is frames 116–137, currently the app's conversation chapter. Exact Source01 provenance is retained and remains legible, but story-to-art staging needs coordinated approval or a jointly versioned mapping. No unilateral camera/root retiming was made here.
4. B's camera fits the narrower desktop gutter between existing left/right copy lanes. Native app-fit review must decide whether this scale preserves the intended B composition; isolated gallery acceptance does not establish app acceptance.
5. Final integrated native Chrome cadence, corrected-asset visuals and physical Android remain separate gates. This is preparation only.

Cross-thread author messaging is not callable in this worker; parent must relay this contract/identity and obtain the exact corrected handoff. No other worker's files, accepted 3877 fixture, live application or public archive have been changed.
