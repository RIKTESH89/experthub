import { createHash } from "crypto";
export type LegacyRow = { id: string; version: number; providerId: string | null; cancelled: boolean };
export type PaidEvidence = { providerId: string; paymentId: string; captured: boolean; start: Date; end: Date };
export type ReconciliationPlan = { row: LegacyRow; evidence: PaidEvidence; digest: string };
export function planReconciliation(row: LegacyRow, evidence: PaidEvidence): ReconciliationPlan {
  if (!row.providerId || evidence.providerId !== row.providerId || !evidence.captured || !evidence.paymentId || !Number.isFinite(evidence.start.getTime()) || !Number.isFinite(evidence.end.getTime()) || evidence.start >= evidence.end) throw new Error("Confirmed exact provider interval required");
  const snapshot = { row: { ...row }, evidence: { ...evidence, start: new Date(evidence.start), end: new Date(evidence.end) } };
  return { ...snapshot, digest: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex") };
}
export interface ReconciliationStore {
  /** One transaction: compare version/provider/cancelled; set exact paid interval; increment
   * version; preserve cancellation; recompute counter; record audit and notification intent. */
  apply(plan: ReconciliationPlan): Promise<boolean>;
}
export async function reconcile(plan: ReconciliationPlan, store: ReconciliationStore, options: { apply?: boolean; reviewedDigest?: string } = {}) {
  const verified = planReconciliation(plan.row, plan.evidence);
  if (verified.digest !== plan.digest) throw new Error("Plan changed");
  if (!options.apply) return { outcome: "dry-run", plan: verified };
  if (options.reviewedDigest !== verified.digest) throw new Error("Explicit reviewed digest required");
  return { outcome: await store.apply(verified) ? "applied" : "version-conflict" };
}
