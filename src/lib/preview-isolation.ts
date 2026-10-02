import { previewOriginFromHost } from "../../preview-environment.cjs";
/** Client marker is derived by next.config, never trusted from a provider credential. */
export function isPreviewIsolated(): boolean {
  return process.env.VERCEL_ENV === "preview" || process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED === "true";
}
export function assertExternalServiceAllowed(): void {
  if (isPreviewIsolated()) throw new Error("External services are disabled in Preview");
}

/** Compiled client origin comes from validated Vercel metadata; server never trusts Host. */
export function previewCanonicalOrigin(): string | undefined {
  if (!isPreviewIsolated()) return undefined;
  const origin = process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ORIGIN;
  if (origin) {
    const validated = previewOriginFromHost(origin.replace(/^https:\/\//, ""));
    if (origin !== validated) throw new Error("Invalid Preview canonical origin");
    return validated;
  }
  return previewOriginFromHost(process.env.VERCEL_BRANCH_URL);
}
