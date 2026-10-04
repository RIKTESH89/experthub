# Combined UI verification — pending final lane QA and integration

Reviewed checkpoint diffs only: subscriber `55cc2c5`, expert `ed80095`, public/admin `0245fea`. These are not final approved integration SHAs. Public/admin has ongoing profile fixture edits. Do not cherry-pick until each owner supplies final status and QA evidence.

## Contract review findings

- No checkpoint changes root/global CSS/shared shell/theme/chat primitives; page CSS stays scoped. No schema/API/backend edits appear in those diff lists. Actual role layouts/access effects remain a required final diff check, not assumed from reports.
- Subscriber report explicitly leaves ExpertCard, ExpertProfileHeader, PostFeed and ProfileForm unchanged. They are shared-owner follow-up work, including blue accents, tiny metadata and form footer hit targets. This remains a gap in the all-page goal.
- Expert pricing retains a hardcoded `Popular` premium badge. Existing copy is not evidence; remove unless product data actually substantiates it. Existing tier fields and billing policy must remain intact.
- Expert twin page now blocks failed config from presenting editable defaults, but failed stats still need truthful unavailable handling rather than synthetic zeros. Inspect real API failure branches at combined QA.
- Public/admin reports embed emits nested html/body both in layout/page. Review this independently; valid document structure and theme inheritance are prerequisites for final embed QA.
- Admin subpages are explicitly a presentation foundation. Lane snapshots alone do not establish finished composition or real privileged-operation QA.

## Dependency isolation and Prisma

The currently borrowed node_modules contains a known stale Prisma client. `tsconfig.ui-check.json` excludes staging-webhook and is only an interim UI check, never final full-type proof.

For final verification, create an owned node_modules directory in this UI worktree (unlink only its symlink), linking already-installed packages individually. Copy @prisma/client locally and create an owned .prisma/client; do not link either generated-client location. Use an external temporary schema copy with the same model content and only generator output redirected to the owned .prisma/client. Run the installed Prisma CLI against that temporary copy with cleared/synthetic DATABASE_URL and DIRECT_URL. This generates types only: no database connection, schema push, migration or provider command. Verify copied/generated package resolution points into this worktree before using it. Do not run postinstall or mutate the original checkouts.

If exact installed Prisma engines or dependencies are unavailable, report the concrete gap instead of downloading/installing silently. Keep schema unchanged in Git and remove the temporary schema after evidence capture. Final full `tsc --noEmit --incremental false` must include staging-webhook; record full exit status and do not suppress baseline diagnostics.

## Combined checks in order

1. Record final lane commits and file ownership, cherry-pick sequentially, resolve any conflict only within shared ownership. Confirm diff contains no schema/auth backend/payment/provider/env changes. Re-run lane contract checks on merged tree.
2. Full typecheck with owned generated client; targeted lint across all touched source plus repository lint baseline. Run meaningful existing tests for subscription/trial gates, owner-review, knowledge/posts/access, theme/chat accessibility and hero eligibility. Keep static policy tests distinct from functional flow proof.
3. Coordinate one local build slot with parent. Use direct Next build, not `npm run build`: the latter executes scripts/staging/build.cjs, whose staging wrapper can verify/migrate hosted state when flags are present. `npm run build:app` also mutates default generated Prisma. Run the direct installed Next CLI in env-i with synthetic URLs/secrets, no .env copied, and external-provider/network guards. Validate build route manifest, server/client boundary, chunk sizes and no secrets. No deployment.
4. Start one isolated dev or built server on 3417 only after other heavy jobs stop. Browser fixture/public QA at 390,768,1024,1440 in both themes. Record overflow, focus/skip links, labels, 44px actions, form error messages/duplicate-submit guards, loading/error/empty, repeated clicks and back navigation. Synthetic fixtures remain explicitly labeled and disconnected from live account/billing data. Real auth/payment/admin transactions are not claimed from fixtures.
5. Reduced-motion initial and preference-change checks, tab visibility/offscreen pause, blocked WebGL/context loss, save-data eligibility, replay keyboard focus, resize/navigation/StrictMode cleanup. Actual low-end device GPU performance remains a separate hardware check. Measure 3D deferred transfer, renderer counts, LCP/CLS against static baseline after dependency approval; targets are not passed results.
6. Capture settled full viewport screenshots, read computed motion state before capturing, inspect images rather than relying solely on DOM. Upload final review artifacts through supported Library workflow only when authorized; avoid uploading proprietary source to unrelated services.

Release report must distinguish implemented, visually verified, fixture-only, authenticated-unverified and blocked routes. A clean UI-only typecheck or a handful of screens cannot establish the requested complete overhaul.
