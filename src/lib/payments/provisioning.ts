/** Durable store must serialize begin by subscriber/expert and commit before provider I/O.
 * UNKNOWN is intentionally sticky: provider timeout is not proof of failure.
 */
export type ProvisioningIntent = {
  id: string; version: number; state: "READY" | "IN_FLIGHT" | "UNKNOWN" | "ATTACHED";
  planId?: string; providerId?: string;
};
export interface ProvisioningStore {
  claim(id: string, expectedVersion: number): Promise<ProvisioningIntent | null>;
  save(id: string, expectedVersion: number, patch: Partial<ProvisioningIntent>): Promise<ProvisioningIntent>;
  attach(intent: ProvisioningIntent): Promise<void>; // atomic version guard + PENDING only, never paid activation
}
export interface ProvisioningProvider {
  createPlan(intentId: string): Promise<string>;
  createSubscription(planId: string, intentId: string): Promise<string>;
}
export async function provision(intent: ProvisioningIntent, store: ProvisioningStore, provider: ProvisioningProvider) {
  if (intent.state !== "READY") return { outcome: intent.state === "ATTACHED" ? "attached" : "review-required", ...(intent.state === "ATTACHED" ? { providerId: intent.providerId } : {}) };
  let current = await store.claim(intent.id, intent.version);
  if (!current) return { outcome: "concurrent-request" };
  try {
    if (!current.planId) current = await store.save(current.id, current.version, { planId: await provider.createPlan(current.id) });
    current = await store.save(current.id, current.version, { providerId: await provider.createSubscription(current.planId!, current.id) });
    await store.attach(current);
    return { outcome: "attached", providerId: current.providerId };
  } catch {
    // Even a lost save/attachment response can be ambiguous. Never create another provider object blindly.
    await store.save(current.id, current.version, { state: "UNKNOWN" }).catch(() => {});
    return { outcome: "review-required" };
  }
}
/** Recovery accepts only an explicitly reviewed, exact provider identity; no provider call. */
export async function recoverProvisioning(intent: ProvisioningIntent, evidence: { reviewed: boolean; intentId: string; providerId: string }, store: ProvisioningStore) {
  if (evidence.reviewed !== true || !Number.isSafeInteger(intent.version) || intent.version < 0 || evidence.intentId !== intent.id || typeof evidence.providerId !== "string" || !evidence.providerId || !["UNKNOWN", "IN_FLIGHT"].includes(intent.state)) throw new Error("Reviewed recovery evidence required");
  if (intent.providerId && intent.providerId !== evidence.providerId) throw new Error("Provider identity mismatch");
  await store.attach({ ...intent, providerId: evidence.providerId });
}
