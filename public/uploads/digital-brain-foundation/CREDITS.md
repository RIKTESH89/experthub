# ExpertHub single-brain illustration

This homepage uses one anatomical model as an illustration of shared knowledge. It is not a brain scan, access to private memories, or a claim of consciousness. No author endorsement is implied.

## Brain model: Creative Commons Attribution 4.0

“Brain Areas” by **Versal**: https://sketchfab.com/3d-models/brain-areas-d64608a3978b47d8a39c5a15795ca8c4 (original short link: https://skfb.ly/AFry).

Licensed under **Creative Commons Attribution 4.0 International**: https://creativecommons.org/licenses/by/4.0/.

The model is redistributed from Digital Brain’s `public/assets/models/brain_c.glb`, including its painted red vertex mask and Draco compression. ExpertHub changes the materials, palette, lighting, particles, camera, framing and surrounding presentation. Geometry is not replaced or duplicated. The upstream model notice is retained in [licenses/brain-areas-source.txt](licenses/brain-areas-source.txt).

## Digital Brain: MIT

**Sahil K**, Digital Brain: https://github.com/SahilK-027/Digital-Brain

Source commit: `366cf81dad855ea238dec170fcc65579d6d9ba4b`.

Copyright (c) 2026 Sahil K. Full notice: [licenses/sahil-MIT.txt](licenses/sahil-MIT.txt).

Adapted code includes the solid-brain Fresnel/specular/electric shader, red-vertex surface sampling, groove particles, 20 × 6 curved neural threads, thread particles, sparkle particles, procedural sky and depth/vignette postprocessing. GLSL is packaged as JavaScript strings. The accepted brown/black material adds tunable highlight colour, diffuse/occlusion floors and edge intensity to the lighting shader; its exact mesh parameters are retained in art/accepted-material.js with the accepted renderer image's Library provenance. Modifications also include explicit scene context instead of the global Game singleton; scoped pointer listeners and disposal; duplicate particle construction removed; MT19937 recurrence implemented locally with the original seeds; radial sprite authored for ExpertHub; coordinated subdued brown/black accessory colours, normal blending and reduced sparkle brightness; palette and particle-size tuning; seconds-based animation clock; weighted sampling of the same red vertex mask to allocate 7,000 groove particles, whose layer remains hidden while anatomical grooves remain; corrected thread ring sampling; fixed-model particle positions computed once; bounded phone framing and raster tiers; readiness tied to a completed render; source audio and uncredited images excluded. The homepage's warm dark presentation does not change the stored theme used by other app routes.

## Cinematic3DScroll variant 2: MIT demo grant

**JosephASG / Joseph Santaamaria**, Cinematic 3D Scroll Experiences: https://github.com/JosephASG/codrops-cinematic-scroll-animations

Source commit: `7a56d1fdc12058e3a955348a7a9f3387a2bf57da`.

Demo: https://tympanus.net/Tutorials/Cinematic3DScroll/#/variant-2

The repository README identifies MIT but its root LICENSE is absent at the pinned commit. Codrops explicitly licenses downloadable demos under MIT: https://tympanus.net/codrops/licensing/ (verified 2026-10-06). The published Codrops MIT notice is retained in [licenses/codrops-MIT.txt](licenses/codrops-MIT.txt). This notice documents that grant; it is not an invented upstream LICENSE file.

The variant-2 ScrollSmoother engine, ten unequal motion intervals, text positions and SplitText entry/hold/exit timelines are ported using the source's exact GSAP version. The unchanged brain replaces the building. The renderer samples that motion progress through the approved side/above orbit in source-camera.ts. Shape-preserving cubic interpolation retains continuous camera velocity and positive clearance above the anatomical model, with continuous phone framing and wide/macro zoom. Source viewing directions, pitch and distance ratios are intentionally replaced; the source scroll intervals and text choreography remain unchanged. See `/uploads/digital-brain-foundation/SOURCE-PARITY.md` for the explicit deviations and parameters. No skyscraper model, study links, upstream audio or inspiration images are shipped.

## Runtime dependencies

GSAP 3.13.0, Copyright (c) 2008–2025 GreenSock. Official ScrollTrigger, ScrollSmoother and SplitText are used under the [standard no-charge license](https://gsap.com/community/standard-license/). Original package notices remain in the bundled dependency; [retained package notice](licenses/gsap-notice.txt). GSAP is not covered by the Codrops MIT notice.

Three.js 0.186.1, Copyright © 2010–2026 Three.js authors, MIT. [licenses/three-MIT.txt](licenses/three-MIT.txt).

Draco decoder distributed with the installed Three.js package; Google Draco, Apache License 2.0. [licenses/draco-Apache-2.0.txt](licenses/draco-Apache-2.0.txt). Decoder wrapper and WASM are self-hosted; no CDN request is required.

The dark static poster is an actual renderer capture of this same adapted scene with the groove particle layer hidden. The radial particle sprite is generated in code. There is no audio.

## Earlier studies

Earlier ExpertHub sculpture studies and their attribution files remain archived in the existing source/assets. Those studies use BodyParts3D, © The Database Center for Life Science, licensed under CC BY 4.0. Their original notices and modification descriptions are preserved; that model is not used by this new renderer.

## Sample content

The homepage’s expandable question, answer and two source records are fictional, scripted examples, not a live AI response. They illustrate citation inspection; a citation is not a correctness guarantee. Source corrections described on this page are manual.
