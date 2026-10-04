# ExpertHub UI overhaul route and state inventory

Baseline: `7e7c5b256846a447caf940379c6023a77957fef1`. Worktree branch: `design/full-ui-overhaul`.

This is a staged overhaul. Token coverage is global; page-lane implementations are integrated. Implementation, synthetic presentation QA and authenticated-operation QA are distinct states. Synthetic fixture is development-only and separate from product routes.

| Full route | Implementation status | Source |
|---|---|---|
| `/forgot-password` | Implemented; form/theme fixture QA and unauthenticated route checks | `src/app/(auth)/forgot-password/page.tsx` |
| `/login` | Implemented; form/theme fixture QA and unauthenticated route checks | `src/app/(auth)/login/page.tsx` |
| `/register` | Existing redirect retained; login presentation implemented | `src/app/(auth)/register/page.tsx` |
| `/reset-password` | Implemented; form/theme fixture QA and unauthenticated route checks | `src/app/(auth)/reset-password/page.tsx` |
| `/admin/analytics` | Scoped presentation implemented; sample QA; authenticated operations pending | `src/app/(dashboard)/admin/analytics/page.tsx` |
| `/admin/applications` | Scoped presentation implemented; sample QA; authenticated operations pending | `src/app/(dashboard)/admin/applications/page.tsx` |
| `/admin/content` | Scoped presentation implemented; sample QA; authenticated operations pending | `src/app/(dashboard)/admin/content/page.tsx` |
| `/admin/experts` | Scoped presentation implemented; sample QA; authenticated operations pending | `src/app/(dashboard)/admin/experts/page.tsx` |
| `/admin` | Scoped presentation implemented; sample QA; authenticated operations pending | `src/app/(dashboard)/admin/page.tsx` |
| `/admin/reports` | Scoped presentation implemented; sample QA; authenticated operations pending | `src/app/(dashboard)/admin/reports/page.tsx` |
| `/admin/settings` | Scoped presentation implemented; sample QA; authenticated operations pending | `src/app/(dashboard)/admin/settings/page.tsx` |
| `/admin/users/[userId]` | Scoped presentation implemented; sample QA; authenticated operations pending | `src/app/(dashboard)/admin/users/[userId]/page.tsx` |
| `/admin/users` | Scoped presentation implemented; sample QA; authenticated operations pending | `src/app/(dashboard)/admin/users/page.tsx` |
| `/expert/analytics` | Implemented; expert synthetic/denied-state QA; populated role QA pending | `src/app/(dashboard)/expert/analytics/page.tsx` |
| `/expert/knowledge/import` | Implemented; expert synthetic/denied-state QA; populated role QA pending | `src/app/(dashboard)/expert/knowledge/import/page.tsx` |
| `/expert/knowledge/new` | Implemented; expert synthetic/denied-state QA; populated role QA pending | `src/app/(dashboard)/expert/knowledge/new/page.tsx` |
| `/expert/knowledge` | Implemented; expert synthetic/denied-state QA; populated role QA pending | `src/app/(dashboard)/expert/knowledge/page.tsx` |
| `/expert` | Implemented; expert synthetic/denied-state QA; populated role QA pending | `src/app/(dashboard)/expert/page.tsx` |
| `/expert/posts/[postId]/edit` | Implemented; expert synthetic/denied-state QA; populated role QA pending | `src/app/(dashboard)/expert/posts/[postId]/edit/page.tsx` |
| `/expert/posts/[postId]` | Implemented; expert synthetic/denied-state QA; populated role QA pending | `src/app/(dashboard)/expert/posts/[postId]/page.tsx` |
| `/expert/posts/new` | Implemented; expert synthetic/denied-state QA; populated role QA pending | `src/app/(dashboard)/expert/posts/new/page.tsx` |
| `/expert/posts` | Implemented; expert synthetic/denied-state QA; populated role QA pending | `src/app/(dashboard)/expert/posts/page.tsx` |
| `/expert/pricing` | Implemented; expert synthetic/denied-state QA; populated role QA pending | `src/app/(dashboard)/expert/pricing/page.tsx` |
| `/expert/profile` | Implemented; expert synthetic/denied-state QA; populated role QA pending | `src/app/(dashboard)/expert/profile/page.tsx` |
| `/expert/reviews` | Implemented; expert synthetic/denied-state QA; populated role QA pending | `src/app/(dashboard)/expert/reviews/page.tsx` |
| `/expert/settings` | Implemented; expert synthetic/denied-state QA; populated role QA pending | `src/app/(dashboard)/expert/settings/page.tsx` |
| `/expert/subscribers` | Implemented; expert synthetic/denied-state QA; populated role QA pending | `src/app/(dashboard)/expert/subscribers/page.tsx` |
| `/expert/twin` | Implemented; expert synthetic/denied-state QA; populated role QA pending | `src/app/(dashboard)/expert/twin/page.tsx` |
| `/expert/widget` | Implemented; expert synthetic/denied-state QA; populated role QA pending | `src/app/(dashboard)/expert/widget/page.tsx` |
| `/subscriber/bookmarks` | Implemented; subscriber synthetic QA; combined authenticated QA pending | `src/app/(dashboard)/subscriber/bookmarks/page.tsx` |
| `/subscriber/experts/[expertId]/chat` | Implemented; subscriber synthetic QA; combined authenticated QA pending | `src/app/(dashboard)/subscriber/experts/[expertId]/chat/page.tsx` |
| `/subscriber/experts/[expertId]` | Implemented; subscriber synthetic QA; combined authenticated QA pending | `src/app/(dashboard)/subscriber/experts/[expertId]/page.tsx` |
| `/subscriber/feed` | Implemented; subscriber synthetic QA; combined authenticated QA pending | `src/app/(dashboard)/subscriber/feed/page.tsx` |
| `/subscriber/hub` | Implemented; subscriber synthetic QA; combined authenticated QA pending | `src/app/(dashboard)/subscriber/hub/page.tsx` |
| `/subscriber` | Implemented; subscriber synthetic QA; combined authenticated QA pending | `src/app/(dashboard)/subscriber/page.tsx` |
| `/subscriber/profile` | Implemented; subscriber synthetic QA; combined authenticated QA pending | `src/app/(dashboard)/subscriber/profile/page.tsx` |
| `/subscriber/settings` | Implemented; subscriber synthetic QA; combined authenticated QA pending | `src/app/(dashboard)/subscriber/settings/page.tsx` |
| `/subscriber/subscriptions` | Implemented; subscriber synthetic QA; combined authenticated QA pending | `src/app/(dashboard)/subscriber/subscriptions/page.tsx` |
| `/about` | Implemented; light/dark desktop/mobile review captures | `src/app/about/page.tsx` |
| `/e/[expertId]` | Implemented; exact production view fixture QA; populated data pending | `src/app/e/[expertId]/page.tsx` |
| `/e/design-preview/studio` | Development-only synthetic QA | `src/app/e/design-preview/studio/page.tsx` |
| `/e/design-preview/expert` | Development-only synthetic QA | `src/app/e/design-preview/expert/page.tsx` |
| `/e/design-preview/public-admin` | Development-only synthetic QA | `src/app/e/design-preview/public-admin/page.tsx` |
| `/e/design-preview/shared` | Development-only synthetic QA | `src/app/e/design-preview/shared/page.tsx` |
| `/embed/[expertId]` | Implemented; document nesting corrected; widget operation QA pending | `src/app/embed/[expertId]/page.tsx` |
| `/offline` | Implemented; route/retry/theme QA | `src/app/offline/page.tsx` |
| `/` | Implemented; light/dark desktop/mobile review captures | `src/app/page.tsx` |
| `/posts/[postId]` | Implemented reading presentation; protected operation QA pending | `src/app/posts/[postId]/page.tsx` |
| `/pricing` | Implemented; light/dark desktop/mobile review captures | `src/app/pricing/page.tsx` |
| `/sentry-example-page` | Retained diagnostic route; theme tokens applied | `src/app/sentry-example-page/page.tsx` |
| `/shared/[shareId]` | Implemented; transcript fixture QA; share eligibility runtime pending | `src/app/shared/[shareId]/page.tsx` |

## Route semantics and states

- Public: `/`, `/about`, `/pricing`, `/e/[expertId]`; expert application is `/#apply-expert`, not a separate route. Discovery is `/subscriber/hub` and `/subscriber/feed`, not a public directory route. `/posts/[postId]` is protected by existing middleware despite its reading-page layout. No new public access rules.
- Auth: `/login`, `/register`, `/forgot-password`, `/reset-password`. Preserve Google availability gates and existing credential form behavior. Shared auth layout/forms and both-theme synthetic checks are implemented; actual account sign-in remains unverified.
- Subscriber: overview, feed/hub filters, profile and settings forms, expert detail, cumulative trial allowance, payment-pending/verified/subscribed/expired gates, bookmarks and subscription empty/loading/error states. Chat includes history, memory consent, streaming, sources, temporal context, corrections, rating, share dialog, trial counter/paywall, retry and scroll behavior. Functional policy controls remain intact.
- Expert: content list/detail/new/edit and validation/upload/processing/retry; knowledge import URL/PDF/history; twin configuration and release previews; review/corrections, subscribers, analytics, pricing, public profile, settings and widget. Preserve consent, citation and release controls.
- Admin: overview plus analytics, applications, content, experts, reports, settings, users and user detail. Preserve role guard, confirmation, review and billing operation semantics.
- Share/embed: revoked/missing/expired/private/available shared conversations, embed configuration and AI limits, narrow viewport, source details. Nested embed html/body is corrected; root document remains single-owner and install suggestions are suppressed in embed frames. Actual widget script operation remains pending.
- System: `/offline`, `error.tsx`, `global-error.tsx`, `not-found.tsx`. Network failure, retry, empty data, skeleton, long content, validation, disabled/submitting and success states required per page family. `/sentry-example-page` is diagnostics, not customer marketing.

## Shared ownership

Single owner: `src/app/studio.css`, root font/import/provider changes, shared shell, theme toggle, navigation, shared primitives. Page-family workers may add scoped modules and page composition; do not edit these shared files concurrently.

Completed integration lane split (source commits recorded in integration/report.md):
1. Subscriber feed/hub/expert profile/subscriptions/bookmarks/profile/settings, plus experts/post cards.
2. Expert knowledge/import/posts/editor and expert-owned content components.
3. Expert twin/reviews/analytics/subscribers/pricing/profile/settings/widget.
4. Admin pages and admin-owned components.
5. Public expert profile/shared/posts/embed/offline/error; each keeps existing access enforcement.
6. Auth forms and state audit, preserving current auth service and policy.

All workers start from the checkpoint, keep backend files untouched, avoid full concurrent builds, and use their own port. Report CSS token needs to shared owner. No package installation was performed. Three.js remains blocked by approval review pending direct authorization in this task.
