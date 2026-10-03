import { TerminalBillingDeliveryError } from "./billing-email";
export type BillingDelivery = { id: string; leaseToken: string; attempts: number; payload: unknown };
/** enqueue belongs in the SAME transaction as the payment transition, unique dedupe key.
 * claim must atomically lease due rows (FOR UPDATE SKIP LOCKED); expired leases may be reclaimed.
 * settle must compare leaseToken so a stale worker cannot settle a new worker's lease.
 */
export interface BillingOutboxStore {
  claim(now: Date, leaseUntil: Date, limit: number, maxAttempts?: number): Promise<BillingDelivery[]>;
  owns(id: string, leaseToken: string, now: Date): Promise<boolean>;
  settle(id: string, leaseToken: string, result: { state: "DELIVERED" | "RETRY" | "FAILED"; nextAttemptAt?: Date; error?: string }): Promise<boolean>;
}
export async function drainBillingOutbox(store: BillingOutboxStore, deliver: (payload: unknown, dedupeKey: string) => Promise<void>, now = new Date(), maxAttempts = 5, maxJobs = 25) {
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1) throw new Error("Invalid attempt limit");
  if (!Number.isSafeInteger(maxJobs) || maxJobs < 1 || maxJobs > 25) throw new Error("Invalid job budget");
  const startedAt = Date.now();
  const clock = () => new Date(now.getTime() + Date.now() - startedAt);
  let processed = 0;
  // Claim immediately before each delivery: later jobs never wait behind a shared lease.
  for (let index = 0; index < maxJobs; index++) {
    const claimedAt = clock();
    const rows = await store.claim(claimedAt, new Date(claimedAt.getTime() + 60_000), 1, maxAttempts);
    if (!rows.length) break;
    const row = rows[0];
    if (!await store.owns(row.id, row.leaseToken, clock())) continue;
    processed++;
    try {
      // Receiver must honor this key: slow delivery or a crash can outlive the lease.
      await deliver(row.payload, row.id);
      await store.settle(row.id, row.leaseToken, { state: "DELIVERED" });
    } catch (error) {
      const terminal = error instanceof TerminalBillingDeliveryError || row.attempts >= maxAttempts;
      await store.settle(row.id, row.leaseToken, { state: terminal ? "FAILED" : "RETRY", error: error instanceof TerminalBillingDeliveryError ? error.message : "delivery-failed", ...(!terminal ? { nextAttemptAt: new Date(clock().getTime() + Math.min(3600_000, 1000 * 2 ** Math.min(row.attempts, 12))) } : {}) });
    }
  }
  return processed;
}
