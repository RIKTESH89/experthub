# Local Three.js homepage prototype — 4 October 2026

Direct human approval in this task authorized `three@0.186.1` and `@types/three@0.186.0`. Both installed from the official npm registry in `.ui-runtime/three-deps` with clean empty npm configs, cache inside the worktree, lifecycle scripts disabled, audit/funding calls disabled. The first authorized attempt failed because npm rejects loading `/dev/null` for both user/global configuration; distinct empty files corrected that ordinary error. Earlier approval denials are superseded by the direct user authorization, not bypassed. The project manifest and lockfile record exact versions. The only additional lock entries are the approved types package's declared transitive dependencies; none are imported into the scene. Existing linked packages and owned Prisma client were preserved.

## Implemented

`evidence-sculpture.tsx` owns eligibility, lazy import, theme/breakpoint changes, reduced-motion preference changes, visibility/intersection pause, resize, keyboard-accessible replay, context-loss fallback and cleanup. `evidence-scene.ts` owns original beveled and gently bowed archival fragments, instanced engraved marks, forest ceramic medallion, recessed rings, satin brass seam and geometric e mark. Three local lights and ACES tone mapping separate material families without remote assets, textures, models, effects or service calls. Native homepage copy, actions, AI disclosure and source explanation remain independent of the canvas.

A five-second arrival/orbit settles into a layered source fan. Pointer tilt is capped at .08 radians during the active sequence and does not restart idle animation. The poster uses owned CSS geometry with the same fan/medallion composition. Reduced-motion, Save-Data, missing WebGL2 and known <=2 cores/GB retain it without importing the renderer. No scroll interception. Resize rebuilds for the mobile breakpoint; background/offscreen pause resets the time origin rather than jumping forward. Unmount disposes geometry/materials/renderer. A discovered forced-context-loss race on theme changes was corrected by retaining standard renderer/resource disposal rather than forcing an asynchronous context loss on a reused canvas.

## Evidence

- Full TypeScript check passes; studio ESLint check passes.
- Two suites, ten tests pass: capability restrictions, five-second/DPR contract, actual component eligibility, route disposal, and live reduced-motion preference cleanup.
- CUA observed a real `three.js r186` canvas in light/dark desktop and 390px mobile; no console errors in the sampled startup logs. Keyboard Enter on Replay removed the settled marker and restarted the sequence.
- Desktop: 15 draw calls, 6,524 triangles, DPR <=1.5. Explicit draw-call budget raised from the structural draft's 12 to 16 for this composition, below the art-direction ceiling of 24. Triangle budget remains 12,000.
- Mobile: 11 draw calls, 5,788 triangles, DPR1, three fragments, document width390 at viewport390 (no horizontal overflow).
- Captures: `three-home-light.jpg`, `three-home-dark.jpg`, `three-mobile-light.jpg`, `three-mobile-dark.jpg`. Mobile full-page captures include actual application form and readable AI disclaimer.
- Local development observed p95 rendered-frame *interval* approximately50ms at the <=30fps throttle. This is not GPU frame cost or a representative phone performance measurement. The prototype is a review candidate, not a claim of ORYZO/Lusion visual or performance parity.

## Remaining review

Production chunk transfer/LCP/CLS, physical low-end devices, actual browser reduced-motion/WebGL-loss fault injection, offscreen/background motion measurements and opening/midpoint motion capture remain to be measured. No new full build was run alongside staging work; the combined page tree passed the prior full build before this scene addition. Populated authenticated subscriber/expert/admin actual-route QA with disposable session/DB fixtures remains a separate outstanding verification item. No hosted preview, push, deployment, migration, live credentials, account/provider/payment/backend edits occurred.
