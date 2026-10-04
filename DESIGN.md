# ExpertHub — Knowledge Studio

## Product and voice

ExpertHub connects learners with expert-provided content and AI representations. Expertise is the source; AI is a tool; the learner retains judgment. Use truthful descriptions of current product behavior, keep expert and AI identity visibly distinct, and retain approved trial, consent, payment and citation language. No manufactured testimonials, user counts or outcome promises.

## Visual contract

Use an editorial composition with left-aligned, generous type; warm paper surfaces in light mode; deep green-black in dark mode; and restrained forest/mint actions. Geist is loaded from the already checked-in font, with Georgia as a deliberate serif accent on marketing statements. No network font dependency. Headline 44–76px, section 32–48px, body 16–18px, operational UI 14–16px. Small disclosures retain readable contrast.

Semantic HSL tokens live in `src/app/studio.css` and override existing utility tokens without changing Tailwind contracts. Use `background`, `card`, `foreground`, `muted-foreground`, `primary`, `primary-foreground`, `border` and `ring`; do not add page-specific purple/blue gradients. Warm hairline divisions organize content. Border radii 6–12px. Marketing section spacing 48px mobile / 72px desktop; dashboard content padding 20–40px. Three meaningful grid columns are acceptable for plans/statistics; avoid repeated nested cards as the default layout.

Desktop navigation stays visible; mobile keeps existing role navigation. Keyboard focus must be visible, icons need names when interactive, and actions use buttons while navigation uses links. Keep skip links, heading hierarchy, zoom, noindex/canonical policy and every existing role guard.

## Motion and performance

One-time opacity/12px entrance of 350–450ms establishes the reading order. Native details reveal pricing explanations. Existing Motion receives `reducedMotion="user"`; CSS entrances run only with no reduced-motion preference and smooth scrolling stops when reduced. No perpetual orbit motion or animated background; orbit geometry explains the relationship between content/questions/references. No WebGL or Three.js needed for this function, so low-powered phones receive the same complete content.

Budget: zero added packages, no remote font request, no WebGL context, zero perpetual decorative animations, transform/opacity only for new animation; preserve layout while loading. Target no horizontal overflow at 390/768/1024/1440px and WCAG AA normal text. Source labels, AI limits and controls must remain readable in both themes. Runtime reduced-motion and actual authenticated role flows remain release QA items; do not treat fixture review as their completion.

## Reference decisions and limits (independently read 2026-10-04)

| Reference | Concrete material read | Adopted decision |
|---|---|---|
| [Taste Skill](https://www.tasteskill.dev/) | Audit-first redesign, dual-mode parity, layout variance and pre-flight descriptions | Inventory before design; own composition rather than generic centered gradient hero; equal theme hierarchy. |
| [21st / Magic README](https://github.com/21st-dev/magic-mcp) | Compatibility migration to unified HTTP MCP, API key requirements and component/generation access distinction | No connection or credentials created; hand-authored components using existing Lucide/Radix/Motion. No claim of 21st-generated UI. |
| [Vercel web-design skill](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md) and [actual guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) | Labels, focus, semantics, motion, local fonts, overflow, state and theme rules | Labeled chat input/history; persistent navigation; 44px send button; root motion preference and visible focus. |
| [Image-to-code skill](https://github.com/Leonxlnx/taste-skill/blob/main/skills/image-to-code-skill/SKILL.md) | Read actual image-first, section clarity, spacing, hierarchy and nested-card avoidance rules | Use readable section-specific review captures and deliberate typography. Treated as design reference, not an invoked instruction to generate bitmap mockups; UI artwork is native CSS/vector geometry. Supplied owner `LeonxInx` was inaccessible; followed verified owner `Leonxlnx`. |
| [VoltAgent collection](https://github.com/VoltAgent/awesome-design-md/) | README plus [actual Notion DESIGN.md](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/notion/DESIGN.md) and [actual Mintlify DESIGN.md](https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/mintlify/DESIGN.md) | Adopt explicit typography/spacing/surface contracts and reading-oriented navigation. Actual Notion file uses colorful navy/purple marketing, beyond the directory's short warm-minimal descriptor; we do not copy its palette or logo. Mintlify distinguishes prose/sidebar surfaces and semantic action accents; use that separation with ExpertHub's own forest palette. |
| [Microsoft playwright-cli](https://github.com/microsoft/playwright-cli) | README command families for isolated sessions, viewport/media, forms, snapshots, screenshots and errors | Use unique port and synthetic fixture with browser screenshots and navigation/form verification. CLI was not installed/executed; installed CUA browser supplied Playwright locators and screenshot controls. |

Local `.claude/skills/ui-ux-pro-max/SKILL.md` and existing design-system master were read; local design-system generator run as input, then adapted to this product. Its generic horizontal-scroll recommendation was rejected because predictable reading/navigation better serves the brief. Installed Next.js/browser verification skills consulted. Agent-browser is absent; CUA performed verification instead, with limitations recorded.

## Current rollout

Home, About, Pricing, shared auth layout, subscriber overview composition, shared shell, font/theme and chat message/input appearance are implemented. Remaining page-specific composition is tracked in `audit/ui-overhaul/route-inventory.md`; global recoloring does not count as a finished page. Development-only fixture `/e/design-preview/studio` requires both `EXPERTHUB_UI_FIXTURES=1` and development mode. It holds synthetic content and does not grant auth or call accounts, payments or AI.
