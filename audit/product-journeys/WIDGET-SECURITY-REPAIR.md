# W1 widget repair — parent re-review required

Repair starts from `fd682ad78d3694ae7c435a0476f7cd19f58397dc`, after the scoped product code `681db85d64f9ceb054dd93ad43504549c5c8e102`. Read parent independent review at `/Users/rikteshs20/Documents/Codex/2026-10-04/task-13/full-site-staging/product-candidate-review/REVIEW.md`. Its inherited W1 was reproduced against deployed base and candidate by the reviewer; this local repair does not relabel earlier review as a full security pass.

**Outcome:** expert names render as literal text. Header/input/paywall controls are constructed as DOM nodes; dynamic configuration never enters HTML markup. The only remaining `innerHTML` assignments are owned constant SVG icons. Message clearing uses `replaceChildren`, and messages/greetings retain `textContent`.

Configured colors are parsed solely as a color property, then assigned through `style.backgroundColor`; invalid declaration lists fall back to the existing default color. Valid colors, legitimate text, controls, layout, focus and chat behavior are preserved.

Subscription destinations are resolved with `URL` against the widget service origin and allowed only for same-origin HTTP(S) without embedded credentials. Links use the `href` property plus `noopener noreferrer`. Invalid/cross-origin/script destinations produce plain unavailable guidance, with no clickable unsafe link. The config key is encoded as one query value; service origin comes from parsed script URL and excludes its query string.

No backend/widget authorization/billing/session/lifecycle/provider or other-lane change. No deployment, push, live record/key, exploitation of a real host, credential, grant or database action.

## Verification

- PASS: **11 suites / 71 tests**, clean `env -i` and existing external-network guard. `widget-security-regressions.log` includes ten actual-script cases: original phone/accessibility/config-denial/singleton cases plus literal hostile name/greeting, injected-color refusal, preserved legitimate text/color, safely constructed local URL with quote/markup-like query, four unsafe URL variants, and key/query encoding.
- PASS: full `tsc --noEmit --incremental false` (`widget-security-types.log`, empty success log); lint for the only changed TSX fixture (`widget-security-lint.log`); JS syntax and diff whitespace checks.
- PASS: actual Chrome/CUA with the actual script and in-memory synthetic config/chat responses on guarded loopback 3461. Hostile name remained literal; zero injected image/script/handler nodes; `data-widget-name-executed` absent. Invalid configured declaration list produced default rgb(99,102,241). Synthetic forbidden chat response with a `javascript:` subscribe URL created zero links and left `data-widget-url-executed` absent. Legitimate name and rgb(54,84,73) color retained.
- PASS: same 390×844 panel geometry before/after, x20/y304/w350/h520; document width390; close/Escape returns focus to launcher. Screenshots visually inspected. `widget-security-browser.json` records final hostile-case and legitimate-case observations. The final hostile case was reloaded after the last script edit.
- Actual script SHA-256: `47275a7f45ec9458523ccf02c2036bf8c2e965c1b9f4b0d0470dd63729cc1a6a`.

Screenshots: `widget-security-name-390.png`, `widget-security-url-390.png`, `widget-security-legitimate-390.png`. Synthetic payload's handler only attempted to set a harmless fixture marker; no live/private data or provider was used. Parent reviewer already established baseline exploitation independently; no live exploitation or broader security audit is asserted by this repair.

**Gate:** parent re-review remains REQUIRED before integration. Scope is W1 repair and context-safe rendering/URLs, not hosted-widget acceptance, full XSS/security assurance, streaming/token/trial behavior, physical-device QA or a production build. Original checklist's external gates remain open. Parent owns Linear; no tracker write. Local server stopped at handoff.

## Reproduce

Use existing dependencies; no installation. `sh scripts/ui-preview/run-local.sh 3461 59998`, then the development-only `/e/design-preview/journeys` → `widget-security` tab. Open AI Twin chat; inspect literal markup-like name; send a synthetic question to inspect unsafe-link refusal. `installed-widget` tab retains the legitimate synthetic configuration. This fixture never grants a role or calls a model/database/token service. Development+explicit flag gate remains unchanged and covered by tests.
