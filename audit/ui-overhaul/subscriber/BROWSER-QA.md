# Browser QA completed 2026-10-04

Normal `require_escalated` approval succeeded for the exact local development command on `127.0.0.1:3144`. Earlier ordinary-sandbox `listen EPERM` was not a reviewer denial. Existing system Google Chrome was used through the borrowed installed Playwright package; no browser/dependency installation.

`browser-results.json`: 77 successful captures/checks. `browser-extra-results.json`: 17 additional successful captures/checks. No page errors or horizontal overflow. Ready subscriber pages captured at 1440 and 390px in light/dark; hub additionally at 768/1024px. Screenshots were visually inspected for subscriptions, profile, settings, hub, expert, access and auth. Full fixture state capture set in `screenshots/`.

Functional checks: profile validation/save, settings toggle/digest/save success and error, disabled saving/controls after settings load failure, bookmark selected sort state, feed retry recovery, subscription empty states and active/cancelled/expired/past-due/pending labels, cancelled renewal retaining paid-period access, access allowance copy, auth password length/mismatch/error/success, reset/forgot/settings repeated-click guards, back navigation, register redirect, preview-disabled Google button, reduced-motion fixture, unauthenticated real `/subscriber/settings` redirect.

All API requests were intercepted with synthetic JSON responses. Browser context blocked service workers and aborted any non-localhost request. No logged-in account, OAuth provider, actual password reset/email, database, payments or AI calls. Public auth layout and middleware actually rendered on localhost; subscriber page components were mounted through a temporary development-only public review fixture. **This is not proof of actual authenticated role flows, billing verification, trial accounting, streaming or persisted preference delivery.**

The development fixture was removed from `src/app` after testing. Its exact source templates and `prepare-fixture.cjs` are audit-only. Reproduction (approved local dev-server environment required):

```
node audit/ui-overhaul/subscriber/prepare-fixture.cjs create
EXPERTHUB_UI_FIXTURES=1 VERCEL_ENV=preview VERCEL_BRANCH_URL=subscriber-ui-review.vercel.app AUTH_SECRET=synthetic-local-ui-review-only AUTH_TRUST_HOST=true DATABASE_URL=postgresql://fixture:fixture@127.0.0.1:1/fixture node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3144
node audit/ui-overhaul/subscriber/browser-qa.cjs
QA_EXTRA_ONLY=1 node audit/ui-overhaul/subscriber/browser-qa.cjs
node audit/ui-overhaul/subscriber/prepare-fixture.cjs clean
```

## Findings requiring shared owner

- `shared-pwa-obstructs-settings.png`: shared mobile install prompt intercepts the Settings save button. Normal “Not now” dismissal was used to continue; shared prompt behavior was untouched.
- `bookmarks-error.png`: shared `PostFeed` treats a synthetic 503 as empty bookmarks. Owned subscriber feed, subscriptions, hub and settings distinguish failed load from empty content.
- Shared ExpertProfileHeader still renders a blue banner and “From Free” independent of the available pricing tiers. Shared expert/post cards retain legacy colored metadata.
- Shared ProfileForm avatar upload is hover-only and input is hidden. Validation/save passed, but upload keyboard behavior and account-backed upload were not changed or claimed verified.

## Baseline type diagnostics / borrowed client provenance

The exact source diagnostics are in `types-baseline.log`; final diagnostics are in `types-final.log`. The only differences are the source-checkout path prefixes. All are in `staging-webhook/inbox.test.ts`:

| Location | Code | Missing generated type |
|---|---|---|
| 44:198 | TS2339 | PrismaClient.billingOutbox |
| 49:122 | TS2339 | PrismaClient.billingOutbox |
| 83:122 | TS2339 | PrismaClient.billingOutbox |
| 97:59 | TS2339 | ExpertSubscription.billingVersion |
| 99:97 | TS2339 | ExpertSubscription.billingVersion |
| 99:124 | TS2339 | ExpertSubscription.billingVersion |
| 100:64 | TS2353 | ExpertSubscriptionWhereInput.billingVersion |
| 101:80 | TS2339 | PrismaClient.billingReconciliation |
| 212:192 | TS2339 | PrismaClient.billingOutbox |
| 214:255 | TS2339 | PrismaClient.billingOutbox |

`prisma-client-provenance.json` records the read-only dependency symlink and schema comparison. Repository `prisma/schema.prisma` defines billingVersion at line 272, BillingOutbox at 837 and BillingReconciliation at 864. Borrowed `node_modules/.prisma/client/schema.prisma` lacks all three. Therefore these are pre-existing generated-client/schema mismatch diagnostics from borrowed dependencies, not subscriber UI type failures. No Prisma generation, schema/dependency change or baseline-source edit was performed.

`browser-failure.json` preserves the earlier rapid Settings click failure before the in-flight ref fix. The successful main/extra results supersede that failure. Dev compilation emitted pre-existing OpenTelemetry/require-in-the-middle dynamic dependency warnings through shared Sentry imports, with no page error or framework overlay. No Sentry DSN/provider credentials or source `.env` files were copied into this clone.
