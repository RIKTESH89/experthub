# ExpertHub UI overhaul route and state inventory

Baseline: `7e7c5b256846a447caf940379c6023a77957fef1`. Worktree branch: `design/full-ui-overhaul`.

This is a staged overhaul. Token coverage is global; individual route composition remains pending unless marked implemented. Synthetic fixture is development-only and separate from product routes.

| Full route | Implementation status | Source |
|---|---|---|
| `/forgot-password` | Pending page composition; shared theme applied | `src/app/(auth)/forgot-password/page.tsx` |
| `/login` | Implemented, review pending | `src/app/(auth)/login/page.tsx` |
| `/register` | Pending page composition; shared theme applied | `src/app/(auth)/register/page.tsx` |
| `/reset-password` | Pending page composition; shared theme applied | `src/app/(auth)/reset-password/page.tsx` |
| `/admin/analytics` | Pending page composition; shared theme applied | `src/app/(dashboard)/admin/analytics/page.tsx` |
| `/admin/applications` | Pending page composition; shared theme applied | `src/app/(dashboard)/admin/applications/page.tsx` |
| `/admin/content` | Pending page composition; shared theme applied | `src/app/(dashboard)/admin/content/page.tsx` |
| `/admin/experts` | Pending page composition; shared theme applied | `src/app/(dashboard)/admin/experts/page.tsx` |
| `/admin` | Pending page composition; shared theme applied | `src/app/(dashboard)/admin/page.tsx` |
| `/admin/reports` | Pending page composition; shared theme applied | `src/app/(dashboard)/admin/reports/page.tsx` |
| `/admin/settings` | Pending page composition; shared theme applied | `src/app/(dashboard)/admin/settings/page.tsx` |
| `/admin/users/[userId]` | Pending page composition; shared theme applied | `src/app/(dashboard)/admin/users/[userId]/page.tsx` |
| `/admin/users` | Pending page composition; shared theme applied | `src/app/(dashboard)/admin/users/page.tsx` |
| `/expert/analytics` | Pending page composition; shared theme applied | `src/app/(dashboard)/expert/analytics/page.tsx` |
| `/expert/knowledge/import` | Pending page composition; shared theme applied | `src/app/(dashboard)/expert/knowledge/import/page.tsx` |
| `/expert/knowledge/new` | Pending page composition; shared theme applied | `src/app/(dashboard)/expert/knowledge/new/page.tsx` |
| `/expert/knowledge` | Pending page composition; shared theme applied | `src/app/(dashboard)/expert/knowledge/page.tsx` |
| `/expert` | Pending page composition; shared theme applied | `src/app/(dashboard)/expert/page.tsx` |
| `/expert/posts/[postId]/edit` | Pending page composition; shared theme applied | `src/app/(dashboard)/expert/posts/[postId]/edit/page.tsx` |
| `/expert/posts/[postId]` | Pending page composition; shared theme applied | `src/app/(dashboard)/expert/posts/[postId]/page.tsx` |
| `/expert/posts/new` | Pending page composition; shared theme applied | `src/app/(dashboard)/expert/posts/new/page.tsx` |
| `/expert/posts` | Pending page composition; shared theme applied | `src/app/(dashboard)/expert/posts/page.tsx` |
| `/expert/pricing` | Pending page composition; shared theme applied | `src/app/(dashboard)/expert/pricing/page.tsx` |
| `/expert/profile` | Pending page composition; shared theme applied | `src/app/(dashboard)/expert/profile/page.tsx` |
| `/expert/reviews` | Pending page composition; shared theme applied | `src/app/(dashboard)/expert/reviews/page.tsx` |
| `/expert/settings` | Pending page composition; shared theme applied | `src/app/(dashboard)/expert/settings/page.tsx` |
| `/expert/subscribers` | Pending page composition; shared theme applied | `src/app/(dashboard)/expert/subscribers/page.tsx` |
| `/expert/twin` | Pending page composition; shared theme applied | `src/app/(dashboard)/expert/twin/page.tsx` |
| `/expert/widget` | Pending page composition; shared theme applied | `src/app/(dashboard)/expert/widget/page.tsx` |
| `/subscriber/bookmarks` | Pending page composition; shared theme applied | `src/app/(dashboard)/subscriber/bookmarks/page.tsx` |
| `/subscriber/experts/[expertId]/chat` | Pending page composition; shared theme applied | `src/app/(dashboard)/subscriber/experts/[expertId]/chat/page.tsx` |
| `/subscriber/experts/[expertId]` | Pending page composition; shared theme applied | `src/app/(dashboard)/subscriber/experts/[expertId]/page.tsx` |
| `/subscriber/feed` | Pending page composition; shared theme applied | `src/app/(dashboard)/subscriber/feed/page.tsx` |
| `/subscriber/hub` | Pending page composition; shared theme applied | `src/app/(dashboard)/subscriber/hub/page.tsx` |
| `/subscriber` | Implemented, review pending | `src/app/(dashboard)/subscriber/page.tsx` |
| `/subscriber/profile` | Pending page composition; shared theme applied | `src/app/(dashboard)/subscriber/profile/page.tsx` |
| `/subscriber/settings` | Pending page composition; shared theme applied | `src/app/(dashboard)/subscriber/settings/page.tsx` |
| `/subscriber/subscriptions` | Pending page composition; shared theme applied | `src/app/(dashboard)/subscriber/subscriptions/page.tsx` |
| `/about` | Implemented, review pending | `src/app/about/page.tsx` |
| `/e/[expertId]` | Pending page composition; shared theme applied | `src/app/e/[expertId]/page.tsx` |
| `/e/design-preview/studio` | Development-only synthetic QA | `src/app/e/design-preview/studio/page.tsx` |
| `/embed/[expertId]` | Pending page composition; shared theme applied | `src/app/embed/[expertId]/page.tsx` |
| `/offline` | Pending page composition; shared theme applied | `src/app/offline/page.tsx` |
| `/` | Implemented, review pending | `src/app/page.tsx` |
| `/posts/[postId]` | Pending page composition; shared theme applied | `src/app/posts/[postId]/page.tsx` |
| `/pricing` | Implemented, review pending | `src/app/pricing/page.tsx` |
| `/sentry-example-page` | Pending page composition; shared theme applied | `src/app/sentry-example-page/page.tsx` |
| `/shared/[shareId]` | Pending page composition; shared theme applied | `src/app/shared/[shareId]/page.tsx` |

## Route semantics and states

- Public: `/`, `/about`, `/pricing`, `/e/[expertId]`; expert application is `/#apply-expert`, not a separate route. Discovery is `/subscriber/hub` and `/subscriber/feed`, not a public directory route. `/posts/[postId]` is protected by existing middleware despite its reading-page layout. No new public access rules.
- Auth: `/login`, `/register`, `/forgot-password`, `/reset-password`. Preserve Google availability gates and existing credential form behavior. Shared auth visual layout implemented; each form still needs both-theme validation.
- Subscriber: overview, feed/hub filters, profile and settings forms, expert detail, cumulative trial allowance, payment-pending/verified/subscribed/expired gates, bookmarks and subscription empty/loading/error states. Chat includes history, memory consent, streaming, sources, temporal context, corrections, rating, share dialog, trial counter/paywall, retry and scroll behavior. Functional policy controls remain intact.
- Expert: content list/detail/new/edit and validation/upload/processing/retry; knowledge import URL/PDF/history; twin configuration and release previews; review/corrections, subscribers, analytics, pricing, public profile, settings and widget. Preserve consent, citation and release controls.
- Admin: overview plus analytics, applications, content, experts, reports, settings, users and user detail. Preserve role guard, confirmation, review and billing operation semantics.
- Share/embed: revoked/missing/expired/private/available shared conversations, embed configuration and AI limits, narrow viewport, source details. Existing `/embed/layout.tsx` nested html/body needs a separate focused review before changing it.
- System: `/offline`, `error.tsx`, `global-error.tsx`, `not-found.tsx`. Network failure, retry, empty data, skeleton, long content, validation, disabled/submitting and success states required per page family. `/sentry-example-page` is diagnostics, not customer marketing.

## Shared ownership

Single owner: `src/app/studio.css`, root font/import/provider changes, shared shell, theme toggle, navigation, shared primitives. Page-family workers may add scoped modules and page composition; do not edit these shared files concurrently.

Suggested independent batches after checkpoint:
1. Subscriber feed/hub/expert profile/subscriptions/bookmarks/profile/settings, plus experts/post cards.
2. Expert knowledge/import/posts/editor and expert-owned content components.
3. Expert twin/reviews/analytics/subscribers/pricing/profile/settings/widget.
4. Admin pages and admin-owned components.
5. Public expert profile/shared/posts/embed/offline/error; each keeps existing access enforcement.
6. Auth forms and state audit, preserving current auth service and policy.

All workers start from the checkpoint, keep backend files untouched, avoid full concurrent builds, and use their own port. Report CSS token needs to shared owner. No package installation required.
