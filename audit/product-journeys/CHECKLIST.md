# EXP36 / EXP39–48 product journey checklist — 2026-10-08

Base: 15a5e100a28c3c2a5f808855e0d0ab221fd85310, the exact deployed commit supplied by the parent. Independent local clone `product-journeys`, branch `exp36-39-48-product-journeys`. Parent owns integration and Linear writes. Linear descriptions read only to reconcile acceptance; no issue changed.

| Linear | Completed in this bounded lane | Next / blocked / untested |
|---|---|---|
| EXP-36 | Reconciled historical route inventory, authenticated guard results, newer Oct 7 EXP36 51-route/91-handler audit, and current Linear descriptions. Avoided repeating integrated admin analytics/approval fixes. Recorded new scoped cases and manifest. | NEXT: parent adds these cases to authoritative matrix. NOT RUN: complete route/state inventory re-execution at the new candidate. |
| EXP-39 | No auth implementation change; session-denial presentation is explicit on admin/history/widget save. | NEXT: auth lane owns callback/session work. NOT RUN: provider/recovery/expiry/onboarding browser journeys. |
| EXP-40 | Existing subscriber feed retry implementation retained; synthetic populated reading-shelf recovery inspected. Post buttons now have action names and pressed state; failed bookmark regression covered. | NOT RUN: full authenticated discovery/chat/citation/subscription/account workflows and mobile keyboard. |
| EXP-41 | PDF retains selection on failure, clears stale selection on rejected replacement, announces results and provides source-library handoff. Import history distinguishes failure/denial/empty, retries and refreshes processing state, aborts stale reads, exposes complete failure text. Widget saves retain drafts, lock pending edits, validate bounds, announce success/failure, and await clipboard confirmation. | BLOCKED: native file picker upload requires extension file-URL permission; no grant made. NOT RUN: actual PDF parsing/indexing/owned role layout, full editor/processing lifecycle, correction/release operations. |
| EXP-42 | Admin user list no longer fabricates empty data after load/permission failure; retry recovers populated synthetic rows. Named search/filter/row actions. | NOT RUN: full populated authenticated admin routes; no real user ban/delete/approval or role action. |
| EXP-43 | Accepted homepage and motion left untouched. | NOT RUN: broader motion acceptance; no homepage polish reopened. |
| EXP-44 | Representative light/dark host fixture captures for import, subscriber/admin and widget settings. | NOT RUN: full all-route parity. Actual embedded script retains its existing white chat surfaces on both host themes; no dark-widget parity claim. |
| EXP-45 | Widget uses native launcher/close buttons, labeled dialog/log/input, IME-safe Enter, Escape close and launcher focus return. Named post actions expose pressed state. | NOT RUN: complete screen-reader, contrast, focus/tab audit; dialog is non-modal and does not claim a focus trap. |
| EXP-46 | No performance budget claim. | NOT RUN: production build/performance, measured cold/warm device budgets, GPU/FPS/long-task profiles. |
| EXP-47 | Actual widget script with synthetic config inspected at 360×640, 375×667, 390×844, 768×1024, 1440×900. Panels within viewport; no document overflow. Native browser admin/history/subscriber/widget save recovery inspected. | BLOCKED: native upload as above. NOT RUN: physical phone/touch/GPU/keyboard, genuine hosted widget authorization, AI streaming/limits and full route regressions. |
| EXP-48 | Reviewable scoped candidate, tests, screenshots, evidence limits and manifest delivered. | NEXT: parent integrates/reviews exact candidate, reconciles other lanes and obtains owner sign-off. No issue marked Done. |

No credentials, installs, shared database writes, role/access grants, live payments/provider calls, production changes, deployment, pushes or cross-lane merges. No escalation of reasoning effort needed.

Overlap warnings were issued before edits. The desktop message-to-thread tool could not locate the parent cloud thread; the platform final response is the handoff. Release lifecycle/services, auth/billing internals, homepage, shared shell/CSS and package/schema files are untouched.

## W1 follow-up — parent re-review pending

EXP-41/45/48: inherited widget expert-name HTML injection repaired locally, with DOM/text/property construction and same-origin safe subscription URLs. Final guarded regressions: 71 tests / 11 suites, full types and lint PASS; actual Chrome synthetic hostile/legitimate cases PASS. See `WIDGET-SECURITY-REPAIR.md` and `WIDGET-SECURITY-MANIFEST.txt`. Parent re-review is required before integration; broader hosted-widget and original external gates are unchanged. No Linear write or other-lane edit.
