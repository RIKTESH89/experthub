# Homepage copy handoff

Frozen base: `c8d33c7ea77ce2333d2833702a0ee3404444018b` (includes phone animation repair).
App file: `src/components/home/cinematic/home.tsx` only. This sparse revision supersedes the first `1537a12` copy draft.

## Final scene copy

The pre-redesign homepage at `820c67c:src/app/page.tsx` led with “Learn from Expert Digital Twins”, followed by subscribing, asking and learning. This version restores that product positioning without unsupported replicas, instant answers, 24/7 availability, learner counts or testimonials. The latest user refinement asks for ORYZO-like sparse text density and exact illustration mapping: each scene now has one headline and one essential supporting sentence, with no stacked lead/paragraph/note.

| Scene | Headline | Supporting line |
| --- | --- | --- |
| 01 / Introduction | Learn from expert Digital Twins. | Read expert content and chat with an AI representation shaped by their work. |
| 02 / Contributions | Start with what you know. | Add your posts and notes, or import text from supported PDFs and blog articles. |
| 03 / Context | Keep the context close. | Relevant passages and related ideas give your twin context for a question. |
| 04 / Construction | Your knowledge takes shape. | Your shared content helps shape an AI twin that people can ask questions. |
| 05 / Conversation | Ask a question. Keep learning. | Ask follow-ups and check available sources behind the answers. |
| 06 / Control | Keep your knowledge up to date. | Add new material and correct your notes as your work and thinking change. |
| 07 / Close | Find your next conversation. | Choose an expert to learn from, or apply to share your own expertise. |

CTA pairs appear only at entry and close. Scene 02 has a “Read the fictional source examples” link; scene 05 has “Read the fictional conversation · scripted, not live”. Both use the existing fragment navigation to native expandable details below the story. Keeping long examples outside fixed cinematic panels avoids expansion overflowing a phone scene. The existing source records and exact sample question/answer stay intact. Detailed AI limitations, fictional-source disclosure, metaphor limits and anatomical license remain accessible below the story. AI identity is clear in the entry supporting line.

## Exact visual beat mapping

Based on the checked-in `frame-manifest.json` keyframes, `source-registry.json`, existing runtime captions and visual inspection of all 20 listed desktop frames. Frame numbers refer to authored assets, not a fabricated product workflow or model architecture. The chapter headline and support stay consistent across its beats; these visual descriptions belong in the handoff, not as extra paragraph text on the page.

| Scene / phase hold | Authored frames | Illustration and copy relationship |
| --- | --- | --- |
| Introduction / .12–.32, .72–.88 | 000, 022 | Wide composition introduces original brain, shared records and partial twin; camera approaches the original and records. “Learn from expert Digital Twins” introduces the actual product; “AI representation shaped by their work” names what the metaphor represents. |
| Contributions / .06–.20 | 028 | Bound source explanation enters view. “Start with what you know” identifies contributed material as the start. |
| Contributions / .30–.45 | 035 | Relationship diagram sits beside the source explanation. The same support covers posts and notes without claiming arbitrary diagram-file import. |
| Contributions / .55–.70 | 042 | Case-note and decision-note records sit around the folio. The fictional-source link identifies the entire example set. |
| Contributions / .80–.94 | 049 | Original brain and full source collection remain together; copy still describes adding shared material. |
| Context / .06–.20 | 053 | Original source collection remains visible. “Keep the context close” preserves its relationship to the passage. |
| Context / .30–.45 | 055 | Camera focuses on the selected source passage. The supporting line names relevant passages. |
| Context / .55–.70 | 064 | Selected excerpt rises away from the original record. It is represented as contributed context, not private memory extraction. |
| Context / .80–.94 | 076 | Excerpt travels toward a sparse partial twin. Related ideas provide context; this is not a claim that AI reproduces all of a person's knowledge. |
| Construction / .06–.20 | 076 | Sparse foundation and incoming excerpt. “Your knowledge takes shape” maps directly to the construction. |
| Construction / .30–.45 | 094 | First contributed context layer joins the foundation. Support describes shared content shaping the twin. |
| Construction / .55–.70 | 110 | Related source records join the layered representation. Same support remains accurate without implying guaranteed source coverage. |
| Construction / .80–.94 | 119 | A recognizable but partial layered twin forms. Caption explicitly calls it partial. |
| Conversation / .06–.20 | 125 | Layered twin is ready beside the original and source collection. “Ask a question. Keep learning” names the user action. |
| Conversation / .30–.45 | 128 | Relevant layers/ideas are emphasized. Support names follow-ups and available sources, avoiding an every-answer citation guarantee. |
| Conversation / .55–.70 | 137 | Source excerpt opens outward beside the twin. Checking available sources maps to this movement. |
| Conversation / .80–.94, end | 145, 151 | Excerpt remains open beside the twin before returning. Visible link/caption labels the conversation fictional, scripted and not live AI. The exact script is accessible below. |
| Control / .12–.32, .72–.88 | 151, 172 | Source leaf returns as camera widens; original source collection remains distinct. Maintaining shared material is a real expert control. The visual is not claimed to show a live database edit or instant AI retraining. |
| Close / .12–.32, .72–.88 | 172, 191 | Final wide composition holds original, source collection and layered twin. “Find your next conversation” closes with exploring or applying, instead of another explanation of the sculpture. |

Portrait uses the same chapter order and beat keyframes with portrait-composed assets. A portrait crop and integrated layout review remains the integration owner's task.

## Feature grounding

- Profiles, posts and conversations: `src/app/(dashboard)/subscriber/experts/[expertId]/page.tsx`, `src/app/(dashboard)/subscriber/experts/[expertId]/chat/page.tsx`, `src/components/chat/chat-interface.tsx`.
- Knowledge input, editing and supported imports: `src/components/knowledge/knowledge-form.tsx`, `src/app/api/knowledge/[itemId]/route.ts`, `src/app/(dashboard)/expert/knowledge/import/page.tsx`, `src/app/api/knowledge/import/pdf/route.ts`, `src/app/api/knowledge/import/blog/route.ts`.
- Available references and related context: `src/components/chat/source-citation.tsx`, `src/components/chat/chat-message.tsx`, `src/lib/ai/chat-engine.ts`, `src/lib/ai/prompts.ts`. “Available” avoids promising citations on every response or correctness.
- Prices and access: existing `src/lib/public-launch-copy.ts`; no new amounts, allowances or commercial guarantees. Shared tier copy is untouched.

Read `DESIGN.md`, `docs/cinematic-homepage-integration.md` and checkout `.claude/skills/ui-ux-pro-max/SKILL.md`. Followed the existing truthful product voice and readable semantic content. No new styling or visual system is introduced in this copy lane.

## Runtime-caption suggestions for integration owner

`sequence.js` is owned by the phone/runtime lane and remains unchanged. Its captions overwrite the authored static captions in context, construction and conversation. These short replacements preserve beat order and source identifiers and match the sparse copy. They are draft suggestions, not a runtime patch:

- context: “01 / Original source”; “01 / ‘a clear question’”; “01 / A passage in context”; “01 + 02 / Related ideas”.
- construction: “A sparse foundation”; “01 / First context layer”; “02 + 03 + 04 / Related knowledge”; “A partial Digital Twin”.
- conversation: “Fictional question”; “01 + 04 / Available sources”; “Check the source passages”; “Scripted answer · not live AI”.

## Verification and limits

All checks ran in the isolated clone using installed dependencies linked from the source checkout; no installation, provider, DB, push or deployment actions.

- Focused lifecycle/geometry: 2 suites, 16 tests passed after the sparse revision.
- TypeScript `--noEmit --incremental false`: passed.
- Next single-file lint: no warnings or errors.
- Static semantic render using React DOM with external UI components stubbed: exactly seven chapters, exactly one direct supporting paragraph each, maximum 18 words, all local fragment targets resolve, sample remains accessible in native details, frozen loading control unchanged. This is content/semantics evidence, not a browser layout capture.
- The first draft's “all 167 JSX elements unchanged” claim no longer applies: dense record panels, context panel, build list and repeated notes were deliberately removed from scene bodies. All chapter IDs, frames, live-caption hooks, runtime controls, main navigation and application/pricing content remain intact. The runtime safely queries an empty build-list collection; no runtime change is needed.
- `git diff --check`: clean.

Integrated render review remains necessary with phone/theme work. No independent browser layout, live authenticated flow or provider behavior is claimed for this copy-only delivery.
