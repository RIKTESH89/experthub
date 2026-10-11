export class ReviewRequestFailure extends Error {
  constructor(public status: number, message = "Request failed") { super(message); }
}

// Preserve the HTTP status even when a proxy returns HTML or an empty response.
// In particular, an expired owner session must clear private review data.
export async function readReviewRequest<T>(url: string, body: unknown, method: string, transport: typeof fetch): Promise<T> {
  const response = await transport(url, { cache: "no-store", ...(body === undefined ? {} : {
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }) });
  let result: unknown;
  try { result = await response.json(); }
  catch { throw new ReviewRequestFailure(response.ok ? 502 : response.status); }
  if (!response.ok) {
    const message = result && typeof result === "object" && "error" in result && typeof result.error === "string" ? result.error : "Request failed";
    throw new ReviewRequestFailure(response.status, message);
  }
  return result as T;
}

export type ReleaseOperation = "preview" | "activate";
export function releaseFailureMessage(error: unknown, operation: ReleaseOperation): string {
  const failure = error instanceof ReviewRequestFailure ? error : null;
  const reason = failure?.message;
  if (reason === "V2 writes are gated pending a compatible downgrade target")
    return "Release activation is unavailable while release safeguards are enabled. You can keep editing your draft. Contact your administrator about release readiness, then create a new preview when activation is available.";
  if (reason === "Sources still require recomputation" || reason === "Every source must have a current supported evidence revision before release")
    return "Release verification needs current evidence for every source. Open knowledge settings to resolve processing or indexing errors, then refresh reviews and create a new preview.";
  if (reason === "Rollback evidence is no longer current; create a new release" || reason === "Rollback cannot change current RAG permission")
    return "This historical release cannot be activated with current evidence and access permissions. Review your current sources and settings, then create a new release. Rollback cannot restore removed or restricted access.";
  if (reason === "Rollback algorithm is unsupported" || reason === "Rollback runtime or greeting capsule is unsupported" || reason === "Current release is invalid or unsupported")
    return "This release could not be verified with the current application. Contact your administrator before activation. Refreshing cannot make an unsupported release safe.";
  if (failure?.status === 409 || failure?.status === 400)
    return "Release verification changed or the approval receipt is invalid. Refresh reviews and create a new preview. Review the latest settings and evidence before confirming again.";
  if (failure?.status === 404)
    return "The selected release is no longer available. Refresh reviews and choose an available release or create a new one.";
  // A network/server failure after a write is ambiguous: do not claim it failed
  // or mint another operation key. Confirmation retries retain the same key.
  return operation === "activate"
    ? "Activation could not be confirmed. Retry this confirmation to check the same request, or refresh reviews to check the current release. Your reviewed request is preserved for retry."
    : "Release verification is unavailable. Check your connection and try creating the preview again. Activation requires a verified preview.";
}

export function isReleasePreview(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return typeof p.allowed === "boolean" && (p.reason === null || typeof p.reason === "string") &&
    (p.currentHead === null || typeof p.currentHead === "string") && (p.targetId === null || typeof p.targetId === "string") &&
    typeof p.sourceCount === "number" && Number.isInteger(p.sourceCount) && p.sourceCount >= 0 &&
    (p.approvalHash === null || (typeof p.approvalHash === "string" && /^[a-f0-9]{64}$/.test(p.approvalHash))) &&
    Array.isArray(p.changes) && p.changes.every(change => change && typeof change === "object" &&
      typeof change.field === "string" && "before" in change && "after" in change) &&
    (!p.allowed || typeof p.approvalHash === "string");
}
