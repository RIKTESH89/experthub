Homepage install UI suppression — 2026-10-11

Baseline: 946a5f8a9ddd58a093f5456042d72069848f44ff. Worker: `ui/home-install-hidden-20261011`.

The root layout globally mounts `PWAInstallPrompt`. Its prior five-second fallback or `beforeinstallprompt` event could display the card and Install App action on `/`. The component now skips homepage effect registration and returns no install markup on `/`, including any previously open dialog during client navigation. Query strings still use pathname `/`. Browser-native install events are not intercepted there, and a homepage visit does not write the shared dismissal preference. The install component, manifest, service worker, root mount and off-home behavior remain intact for future use. Only the component and its focused tests change application/test source.

Validation:

- Focused Jest: 9/9 pass, including delayed homepage event/no `preventDefault`, stale off-home dialog→homepage, homepage→login fallback, unrelated-route native prompt, embed, standalone and recent dismissal.
- TypeScript `tsc --noEmit`: pass. Scoped Next lint: pass without warnings. Optimized production-mode Preview build: pass.
- Installed headless Chrome 154.0.8037.98: 18 checks pass across desktop1440×900, mobile390×844 and iPhone user-agent390×844. Actual compiled build ID `5TrLv3_FJbxa9PthBrsjI` matches build/browser receipts.
- Actual global root rendering tested with `/?install-eligible=delayed`, real5.5-second fallback waits, synthetic delayed `beforeinstallprompt`, absence of card/button/dialog, no homepage event interception, no dismissal write, manifest retained, other-route manual/native install actions, and an actual Next client navigation from an open off-home guide to `/` with a retained window marker.
- Screenshot inspection confirms desktop/mobile homepage renders without install UI. Owned server and isolated browser were stopped; no shared user/browser session was used.
- EXP-25 reviewer independently reran9/9 focused tests and reviewed source plus browser harness without findings. Final receipt review is recorded separately by the integration owner/reviewer.

Boundaries: this is local compiled-app verification with synthetic auth configuration, an unreachable loopback database, server/browser external network blocked, and browser service workers disabled only in the isolated harness. Synthetic install eligibility does not prove actual browser/OS installability. iPhone UA emulation is not real Safari/iPhone/physical-device evidence. The programmatic link click while the old modal is open probes route-state concealment, not an accessible interaction flow. No provider, real OAuth, live database, billing, production or deployment operation was performed by this worker.

Tracking: EXP-51 `Integrate continuous live 3D homepage` is the appropriate existing homepage issue; root tracks this explicit new UI request separately from its original broader acceptance and will integrate/publish after independent review. This worker does not mark the whole issue Done.

Reproduce from checkout with existing dependencies (no installs or Prisma generation):

    node node_modules/jest/bin/jest.js --runInBand __tests__/pwa-prompt-accessibility.test.ts
    node scripts/home-install-20261011/build.cjs
    node node_modules/typescript/bin/tsc --noEmit
    node node_modules/next/dist/bin/next lint --file src/components/pwa/install-prompt.tsx
    node scripts/home-install-20261011/browser.cjs

Evidence: `jest.json`, `jest.log`, `types.log`, `lint.log`, `build.json`, `build.log`, `browser.json`, `browser.log`, `browser-server.log`, and three homepage screenshots. Browser check labels were clarified after execution to explicitly name the synthetic event; assertions and measured results were unchanged.
