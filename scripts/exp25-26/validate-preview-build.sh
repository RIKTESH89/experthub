#!/bin/bash
# No database startup/migration, installs or provider calls. Uses installed offline font response.
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p audit/preview-isolation
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin VERCEL_ENV=preview VERCEL_BRANCH_URL=synthetic-experthub-staging.vercel.app AUTH_URL=https://production.example.invalid NEXTAUTH_URL=https://production.example.invalid NEXT_PUBLIC_APP_URL=https://production.example.invalid NEXT_TELEMETRY_DISABLED=1 AUTH_SECRET=synthetic-preview-only-build-secret \
 DATABASE_URL=postgresql://synthetic:synthetic@127.0.0.1:55432/no_database DIRECT_URL=postgresql://synthetic:synthetic@127.0.0.1:55432/no_database \
 OPENAI_API_KEY=synthetic-inherited RESEND_API_KEY=synthetic-inherited RAZORPAY_KEY_ID=synthetic-inherited RAZORPAY_KEY_SECRET=synthetic-inherited \
 SENTRY_AUTH_TOKEN=synthetic-inherited GOOGLE_CLIENT_ID=synthetic-inherited GOOGLE_CLIENT_SECRET=synthetic-inherited \
 NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED=false NEXT_FONT_GOOGLE_MOCKED_RESPONSES="$PWD/scripts/exp25-26/font-mock.cjs" \
 NODE_OPTIONS="--require=$PWD/scripts/exp25-26/network-guard.cjs" \
 node node_modules/next/dist/bin/next build > audit/preview-isolation/build.log 2>&1
