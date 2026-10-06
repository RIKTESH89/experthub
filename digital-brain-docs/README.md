# Isolated Digital Brain homepage foundation

Ownership: `experthub-app-digital-brain-foundation`, branch `homepage/digital-brain-cinematic`, base `6cbcb8fab57d653b2352530daebd96042b32269e`.

Frontend module: `src/components/home/digital-brain/`. Public assets: `public/uploads/digital-brain-foundation/`. The only integration change is the homepage component import/return in `src/app/page.tsx`; server authentication and redirects are retained. Existing pricing data, expert application form, login routes and theme control are reused.

Selected art and camera sources, pinned commits, licenses and changes are recorded in the public [credits](../public/uploads/digital-brain-foundation/CREDITS.md). `adapt-source.py` reproduces the Sahil class/GLSL adaptation from the sibling read-only source checkout; the adapted runtime is self-contained and does not need that checkout to build or run.

Scroll progress is computed from the actual pinned section travel. Camera and caption evaluation share that progress, so reverse scroll does not accumulate transforms. Each of the seven intervals has a reading hold; the final invitation also has a full interval. Text remains semantic and readable in static, JavaScript-disabled, reduced-motion and failure states. Reduced-motion mode does not import Three.js or fetch the model/decoder. Animation can be explicitly enabled. Pointer rotation is horizontal; vertical touch scrolling remains native. Arrow keys rotate while the artwork has focus, and Home resets the user rotation.

The renderer owns its RAF, observers, fetch abort signal, model, shaders, particles, scene inputs, composer, decoder worker and WebGL context. Unmount aborts initialization and disposes resources; it does not alter global motion controllers. Offscreen and hidden-tab rendering pauses. All source thread geometry and particle counts are retained. Phone/desktop tiers change DPR, frame-rate cap and depth blur only; the raster budget is 2.5 million pixels. Those settings are configured limits, not measured performance claims. Windows shorter than 580px (including landscape phones and many zoomed layouts) use the complete static story. A 20-second initialization deadline also returns to that readable story instead of keeping a loader indefinitely.

No installs, backend changes, real provider calls, secrets, cloud settings or deployment are part of this work. Local Chrome QA uses the existing synthetic fixture and external-network guard. The current published homepage and its evidence remain untouched. Local QA outputs live in the sibling `digital-brain-foundation-qa/` directory, outside this app checkout.

## Illustrative question and answer

The footer includes a **fictional, scripted sample**, not live AI: “How should I begin choosing an option?” → “Begin with a clear question. Compare the available options against the stated constraint.” It links to two fictional source notes. Citations do not guarantee correctness; the page describes manual corrections only.
