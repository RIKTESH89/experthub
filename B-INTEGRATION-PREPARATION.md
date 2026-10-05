# Experimental B app integration preparation

Refinement branch `integration/b-app-native-refinement` follows preparation commit `4131c52c1ac881494e24f10e9278bb26263679b1`, which starts at accepted sequential-text commit `d3bbef37fee30616961b81a2528b843fd9ae6007`. Local review target: http://127.0.0.1:3897/. No push/deploy or final acceptance.

App ownership: `src/components/home/cinematic/b-artwork.js`, the existing app adapter/configuration, DOM safe region and loading presentation. Renderer/author ownership remains task-4's `experthub-b-animation-r1/handoff-b-r1` and its coordinated author asset. Only frozen copies are imported here. Original author files were read, never edited. The handoff report actually resides in the prototype root, not inside the handoff directory.

## Frozen experiment

Asset: `public/uploads/live3d/b-r1/scene-b-local-v4.glb`, 12,191,884 bytes, SHA-256 `142d85fe44f17f6838b16b9e8d91221a8e5d0a5a843c4b7ca1b73f920ccd1966`. This is the uncorrected local-v4 proof. `authorGeometryPending`, `attachmentValidated:false` and `fullLeafContactAccepted:false` remain truthful runtime diagnostics. Sources 02–04 copies are still hidden by the supplied runtime. Rights and attribution are included beside the asset; existing BodyParts3D CC BY 4 footer attribution is preserved.

The copied runtime differs only by explicit registry/validation URL parameters for app relocation and removal of four unused declarations to pass the app lint rules. No transform, geometry, seat, normalization, animation or material implementation was independently changed. The copied `b-timeline.js` and shared contract JSON are unchanged. Input hashes are recorded in `../b-integration-qa/FROZEN-INPUTS.json` (unchanged imported assets).

## Adapter contract

The app retains seven chapters, reading holds, reverse-safe versioned B chapter frame mapping, accepted sequential text controller, source anchors/history, pricing release, login/apply/pricing routes, theme, reduced-motion/static eligibility and raster cache/failure recovery. The wrapper supplies an owned canvas, abort signal, frozen asset identity, pose envelope, theme and normalized actual DOM composition rectangle to `createBRuntime`. It performs demand rendering, visibility pause, late-result disposal and context-loss fallback through the existing app lifecycle. Every recreation owns a separate renderer/scene/mixer; author-local actor roots are not normalized again.

Loading uses the author's transparent hero/overview/reading/formation posters. Their reference composition is transformed into the actual app composition rectangle using the same width/reference-aspect relation and center as B's off-axis projection. The loading image is a static milestone, not a fabricated in-progress live pose. It uses full-viewport chrome masking, clears on activation/failure/disposal and cannot revive from an obsolete decode after theme/motion changes. The live canvas is revealed only after it reports the current app frame, theme, composition and portrait state. The original raster/static fallback remains available on live failure or ineligibility.

## Coordination required before adoption

1. Renderer/author must provide the corrected asset filename, SHA, bytes, normalization/locator validation, runtime version and complete frozen contract together. Do not overwrite this fixture or add a guessed accepted hash.
2. Corrected readable seated quote orientation, whole-leaf surface contact and intersections, secondary contributions and final twin geometry remain author/native acceptance gates.
3. App now proposes B chapter map v2 under the parent's explicit app-refinement instruction (table below). B renderer/author Story root/camera tracks remain byte-identical. This app mapping and Source01-specific copy need a coordinated native gate; they are not author asset acceptance.
4. Desktop support copy now shares the left heading column, letting B's camera fit a broad right scene. Phone fitting uses available height and retains visible outgoing lanes through sequential exit. Integrated native app-fit review remains required; isolated gallery acceptance does not establish app acceptance.
5. Final integrated native Chrome cadence, corrected-asset visuals and physical Android remain separate gates. This is preparation only.

Cross-thread author messaging is not callable in this worker; parent must relay this contract/identity and obtain the exact corrected handoff. No other worker's files, accepted 3877 fixture, live application or public archive have been changed.


## App refinement v2

| Chapter | B Story range | App hold |
|---|---:|---|
| Introduction | 0–14 | hero0 through phase .16 |
| Contributions | 14–86 | reveal/selection, end86 |
| Context | 86–137 | physical source137 from phase .55 to1 |
| Construction | 137–152 | source-preserving fragment approach |
| Conversation | 152–164 | answer152 through phase .78 |
| Maintain | 164–176 | seat transition; author correction pending |
| Close | 176–191 | final191 from phase .72 |

All chapter seams are exact and monotone, including reverse sampling. Seven existing chapter lengths, text boundaries and the sequential controller are retained. Live clauses/captions now describe the shown Source01 note, selected fragment and shared source identity; they do not claim displayed secondary copied contributions. The accessible expanded source records01–04 and original static semantic DOM remain intact.

`live3d-adapter.js` reserves the union of target and actually visible outgoing title/body lanes until outgoing panel opacity ≤0.001. Phone camera width is capped by available height using a continuous pose-stage fit ratio, with horizontal centering. Desktop places support below heading in one left column and allocates the broader right rectangle. The owned live-stage clip enforces that same safe rectangle for both live canvas and loading image; this is an additional containment guard, not a replacement for camera fitting. Some secondary travel can meet the clip boundary, so native visual refinement must still inspect silhouettes.

Pricing error classification: identical application auth/pricing code; preparation3887 and initially unconfigured refinement3897 had Auth.js `UntrustedHost`, while accepted3877 returned anonymous `null`. Same compiled refinement build at a guarded loopback control origin with explicit synthetic `AUTH_TRUST_HOST=true` returned200/null without console errors. Review3897 now uses that verified local-only startup setting. No application authentication code, provider configuration, user identity, login cookie or authorization was changed; final anonymous pricing/session read matches3877. Server/browser external requests remain blocked. Details in `../b-refinement-qa/pricing-baseline.json`, `pricing-host-control.json`, `pricing-final.json`.
