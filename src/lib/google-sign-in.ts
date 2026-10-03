import { isPreviewIsolated } from "@/lib/preview-isolation";
/** Only this build-derived boolean reaches the client; it never enables other services. */
export function isGoogleSignInEnabled(): boolean {
  return !isPreviewIsolated() || process.env.NEXT_PUBLIC_EXPERTHUB_STAGING_GOOGLE_ENABLED === "true";
}
