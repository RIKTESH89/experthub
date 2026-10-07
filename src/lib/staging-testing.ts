import { isStagingPreview } from "../../preview-environment.cjs";

/** Exact deployment identity: never inferred from a caller-controlled hostname. */
export function isFullSiteStaging(): boolean {
  return isStagingPreview();
}
