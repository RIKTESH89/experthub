import { isPreviewIsolated } from "@/lib/preview-isolation";
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (isPreviewIsolated()) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError: typeof Sentry.captureRequestError = (...args) => { if (!isPreviewIsolated()) Sentry.captureRequestError(...args); };
