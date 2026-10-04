# Public / admin lane — partial integration checkpoint

Base: `9e0f49d2bcc474a9c7896497bfe546c9356d87a4`.
Isolated clone: `/Users/rikteshs20/Documents/Codex/2026-10-04/task-6/experthub-lane`.
Source checkout was not edited. Existing node_modules reused via read-only use of a symlink; no packages installed.

## Delivered composition

- Public expert: editorial two-column biography/AI entry composition, narrow-screen stack, semantic surfaces, reduced-motion entrance. Existing backend counts and verification remain unchanged. AI fallback copy identifies an AI representation; removed unsupported unlimited-access claim.
- Shared conversation: wide reading transcript, explicit learner/question and AI/response labels, larger prose, existing share eligibility and server data path untouched.
- Post: wider reading measure and title, comment label, back/lightbox control labels, restrained CTA. Existing middleware, API actions, media and comments remain intact.
- Offline/error/not-found: left-aligned reading composition, semantic primary actions. Retry/reset/home/sign-in preserved.
- Admin: local workspace module controls headings, responsive tabs, touch targets, tables and inputs. Overview has page-owned operations header, existing actual stats and navigation. Page-specific blue accents replaced by primary tokens; warning/destructive/success distinctions preserved. Role guards and every operation handler unchanged.
- Embed: semantic colors, narrow viewport height and truthful initialization instruction; script and existing nested document structure unchanged.

Admin subpages are a presentation foundation, not fully verified finished compositions. No route inventory completion claims were made.

## Verification

PASS: `node node_modules/typescript/bin/tsc --project tsconfig.ui-check.json --noEmit --incremental false` (exit 0).
PASS: `git diff --check`.
No full build, install, schema change, provider configuration, remote write, push or deploy.

Runtime attempt: synthetic-only env, preview isolation, external network guard, unavailable loopback synthetic database `127.0.0.1:59996`, unique host/port `127.0.0.1:3466`. No auth bypass or synthetic session injection.
Initial sandbox failure: `listen EPERM: operation not permitted 127.0.0.1:3466`. This was an ordinary sandbox listen restriction, not an approval-review denial. After the explicit follow-up instruction, normal `require_escalated` approval succeeded for the exact guarded local server command.

Browser QA through installed CUA:
- Actual offline route: repeated Try Again reloads retained the route; dark theme persisted across navigation.
- Actual public profile unavailable state: loading skeleton then Expert Not Found with unavailable synthetic DB; captured dark mobile. This confirms the error presentation, not a true database missing-row result.
- Populated profile presentation: extracted the exact production view into a page-owned component; fixture uses only synthetic data. Light/dark desktop and 390px mobile screenshots; no horizontal overflow at 390px.
- Shared transcript presentation: exact production SharedConversationView with explicitly synthetic messages. Light desktop, light/dark mobile screenshots; no horizontal overflow at 390px.
- Admin presentation fixture: header/table/search using scoped admin CSS, **not actual admin data/components or authenticated operations**. Populated and empty search work; light/dark desktop and dark mobile captured with no 390px horizontal overflow.
- Error component fixture: two consecutive reset clicks incremented a local fixture counter to 2. This verifies callback interaction, not real error-boundary recovery.

Explicit approval-review blocker: navigation to local `/admin` redirected to `https://synthetic-public-admin-lane.vercel.app`; browser auto-review denied access to the external untrusted Vercel origin because scope authorized only the local synthetic server and it could expose browser state or credentials. No bypass or external navigation retry was attempted. A later local public Go to ExpertHub action also triggered canonical-origin rejection. No protected admin/post authenticated flows or browser back flow are claimed complete. Authorization for that external origin has not been supplied; the safer next step is shared-owner review of local canonical-origin configuration, not removal of auth guards.

Captures: `audit/ui-overhaul/public-admin-captures/*.jpg` (14 files). No successful actual authenticated runtime; fixtures are development-only, gated by `EXPERTHUB_UI_FIXTURES=1` and NODE_ENV development. They do not mint sessions or grant roles.

Remaining QA: actual admin and post actions/forms/repeated clicks, shared share eligibility/revoked/private states, embed script operation, global error, all route-specific composition and state coverage. This is still a partial lane checkpoint, not completed all-page QA.

## Shared needs / integration cautions

- Embed layout and page both emit html/body inside root layout. Retained by explicit focused-review boundary; shared owner should review document nesting and inherited theme tokens before approving embed.
- Shared transcript retains original plain-text content path. No source/citation parser or evidence semantics changed. Any evidence-rendering enhancement belongs in the shared evidence system, not this styling lane.
- Global error retains NextError and Sentry isolation logic; it remains a separate root-failure review item.
- Admin authenticated operation flows still require authorized actual-role QA; no fabricated data or metrics were added.

Shared owner observation: existing PWA install prompt still uses violet styling and overlays mobile content; dismissed via Not now during captures. Shared component was not edited.
