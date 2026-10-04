import { previewOriginFromHost } from "./preview-environment.cjs";
import { stagingGoogleConfig } from "./staging-google.cjs";
import { withSentryConfig } from "@sentry/nextjs";
import { localUiConfig } from "./local-ui-isolation.cjs";
/** @type {import('next').NextConfig} */
const previewIsolated = process.env.VERCEL_ENV === "preview";
const previewOrigin = previewIsolated ? previewOriginFromHost(process.env.VERCEL_BRANCH_URL) : undefined;
const localUi = localUiConfig(process.env, { networkGuardLoaded: globalThis[Symbol.for("experthub.local-ui-network-guard")] === true });
const nextConfig = {
  env: { NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED: String(previewIsolated),
    NEXT_PUBLIC_EXPERTHUB_LOCAL_UI_ISOLATED: String(Boolean(localUi)),
    NEXT_PUBLIC_EXPERTHUB_LOCAL_UI_ORIGIN: localUi?.origin || "",
    NEXT_PUBLIC_EXPERTHUB_STAGING_GOOGLE_ENABLED: String(Boolean(stagingGoogleConfig())),
    ...(previewIsolated ? { NEXT_PUBLIC_EXPERTHUB_PREVIEW_ORIGIN: previewOrigin, AUTH_URL: previewOrigin, NEXTAUTH_URL: previewOrigin, NEXT_PUBLIC_APP_URL: previewOrigin } : {}),
    ...(localUi ? { AUTH_URL: localUi.origin, NEXTAUTH_URL: localUi.origin, NEXT_PUBLIC_APP_URL: localUi.origin } : {}),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs", "pdf-parse", "node-html-parser"],
  },
};

export default previewIsolated || localUi ? nextConfig : withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "experthub",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
