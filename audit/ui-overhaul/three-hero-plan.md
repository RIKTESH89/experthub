# Homepage Three.js enhancement — prepared contract

Status: requested by user; dependency absent; no package installed. Original renderer source prepared in `knowledge-orbit-scene.mjs`, not imported or executed. Awaiting parent dependency approval. Current shipping homepage remains unchanged.

## Narrow dependency request

Add `three` (official Three.js project) as a runtime dependency and matching `@types/three` from DefinitelyTyped as a development dependency. Pin exact mutually compatible versions after registry verification at approval time. No React Three Fiber, Drei, postprocessing, remote asset loader or external models. Do not mutate the borrowed node_modules or trigger repository postinstall/Prisma generation; approved installation must use an isolated dependency directory and disabled lifecycle scripts.

## Intended composition

Keep the readable left hero and existing evidence panel dimensions. Enhance only the 230px orbit viewport: ivory source sheets around a small forest/mint core. The short sequence settles the sheets into an ordered stack; ordinary scroll can accelerate settling. Pointer tilt offers depth without shifting the layout. Keep all explanatory text in HTML. This is a conceptual illustration, not a live retrieval trace or product capability claim. No particle field, fullscreen takeover, scroll hijacking, bloom or expensive glass material. Mobile uses three sheets and a lower-segment core.

## Integration boundary and ownership

Shared-system owner owns home.tsx, studio.css and the new isolated hero modules. Other page lanes need no edits. Client `KnowledgeOrbit` will retain the existing server-rendered diagram, reserve exactly its existing height, and lazy-import `knowledge-orbit-scene.ts` only when eligible and visible. That module will implement `HeroSceneController` from `src/components/studio/hero-motion-policy.ts`; canvas becomes visible only after the first successful render. Theme changes call setPalette with computed semantic token values. No layout/root/theme API changes needed.

## Accessibility and lifecycle

Canvas is decorative, aria-hidden, pointer-events none and never in tab order. Heading, links, disclosure and process text remain usable before JS and after any renderer failure. Reduced-motion, save-data, known <=2-core/<=2GB devices or missing WebGL2 keep static HTML and skip the Three.js import. Browser hints are advisory, not reliable hardware detection; runtime frame-time monitoring also settles the scene if consistently slow. Context loss, construction failure or shader failure restores static HTML. No user preference is inferred from touch alone.

Run one <=5-second sequence then settle; avoid perpetual auto-motion. A visible keyboard-accessible Replay animation control appears only for eligible users, outside canvas. Pointer movement is clamped to 0.08 radians, uses fine-pointer devices only, and does not restart idle motion automatically. Pause while offscreen or document hidden; reset frame timing on resume. Preference changes dispose the scene immediately. Cleanup cancels RAF, removes listeners/observers, disposes every geometry/material and renderer, and removes canvas. StrictMode mount-cleanup-remount must remain safe.

## Budgets and acceptance checks

30fps maximum, DPR <=1.5, <=12 draw calls, <=12k triangles, one transparent renderer, no shadows/textures/environment maps/postprocessing. Target separately deferred compressed 3D chunk <=180KiB; measure actual output when a coordinated build is allowed, do not claim this target passed now. No additional request before hero visibility/eligibility, no layout shift, no new backend calls.

Verify light/dark at 390/768/1024/1440, keyboard replay/focus, reduced-motion initial and live toggle, save-data/low-end eligibility, blocked WebGL/context loss, repeated navigation, offscreen/background pause, resize and StrictMode cleanup. Record renderer counts and frame-time samples on local fixture configuration; mobile emulation is not evidence of actual low-end GPU performance. Compare LCP/CLS against static baseline before acceptance.

Official technical reference: https://threejs.org/docs/pages/WebGLRenderer.html — WebGL2 support, renderer resource disposal, pixel-ratio controls and renderer statistics.

Research-informed direction: Lusion's https://lusion.co/projects/oryzo_ai/ explicitly describes a fictional satirical campaign; borrow its focus on one crafted object, not its product claims or assets. The author's 35mm breakdown https://tympanus.net/codrops/2025/05/30/deconstructing-the-35mm-website-a-look-at-the-process-and-technical-details/ explains model-part highlighting, shaders and render targets; adopt the idea of drawing attention to meaningful source parts, but keep our own primitive geometry and one-pass rendering. These sources were read directly; their live animation performance was not independently measured here.
