/** Client marker is derived by next.config, never trusted from a provider credential. */
export function isPreviewIsolated(): boolean {
  return process.env.VERCEL_ENV === "preview" || process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED === "true";
}
export function assertExternalServiceAllowed(): void {
  if (isPreviewIsolated()) throw new Error("External services are disabled in Preview");
}
