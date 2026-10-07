import { previewOriginFromEnvironment, validatePreviewOrigin } from "../../preview-environment.cjs";
import { assertLocalUiContext, localOriginFromUrl } from "../../local-ui-isolation.cjs";
/** Only next.config can derive this client marker after validating synthetic env. */
export function isLocalUiIsolated(): boolean {
  const requested = process.env.EXPERTHUB_LOCAL_UI_TEST !== undefined || process.env.NEXT_PUBLIC_EXPERTHUB_LOCAL_UI_ISOLATED === "true";
  if (!requested) return false;
  if (process.env.EXPERTHUB_LOCAL_UI_TEST !== undefined && process.env.EXPERTHUB_LOCAL_UI_TEST !== "1") throw new Error("Invalid local UI test flag");
  assertLocalUiContext({ NODE_ENV: process.env.NODE_ENV, VERCEL: process.env.VERCEL, VERCEL_ENV: process.env.VERCEL_ENV, VERCEL_URL: process.env.VERCEL_URL, VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL, VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF });
  return process.env.NEXT_PUBLIC_EXPERTHUB_LOCAL_UI_ISOLATED === "true";
}
/** Client marker is derived by next.config, never trusted from a provider credential. */
export function isPreviewIsolated(): boolean {
  if (isLocalUiIsolated()) return true;
  return process.env.VERCEL_ENV === "preview" || process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED === "true";
}
export function assertExternalServiceAllowed(): void {
  if (isLocalUiIsolated()) throw new Error("External services are disabled in local UI tests");
  if (isPreviewIsolated()) throw new Error("External services are disabled in Preview");
}

/** Compiled client origin comes from validated Vercel metadata; server never trusts Host. */
export function previewCanonicalOrigin(): string | undefined {
  if (isLocalUiIsolated()) return localOriginFromUrl(process.env.NEXT_PUBLIC_EXPERTHUB_LOCAL_UI_ORIGIN);
  if (!isPreviewIsolated()) return undefined;
  const origin = process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ORIGIN;
  if (origin) {
    return validatePreviewOrigin(origin);
  }
  return previewOriginFromEnvironment();
}
