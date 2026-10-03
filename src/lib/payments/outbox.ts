export type BillingDelivery = { id: string; leaseToken: string; attempts: number; payload: unknown };
/** enqueue belongs in the SAME transaction as the payment transition, unique dedupe key.
 * claim must atomically lease due rows (FOR UPDATE SKIP LOCKED); expired leases may be reclaimed.
 * settle must compare leaseToken so a stale worker cannot settle a new worker's lease.
 */
export interface BillingOutboxStore {
  claim(now: Date, leaseUntil: Date, limit: number): Promise<BillingDelivery[]>;
  settle(id: string, leaseToken: string, result: { state: "DELIVERED" | "RETRY" | "FAILED"; nextAttemptAt?: Date; error?: string }): Promise<boolean>;
}
export async function drainBillingOutbox(store: BillingOutboxStore, deliver: (payload: unknown, dedupeKey: string) => Promise<void>, now = new Date(), maxAttempts = 5) {
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1) throw new Error("Invalid attempt limit");
  const rows = await store.claim(now, new Date(now.getTime() + 60_000), 25);
  for (const row of rows) {
    try {
      // Receiver must honor this key: crash after delivery before settlement causes redelivery.
      await deliver(row.payload, row.id);
      await store.settle(row.id, row.leaseToken, { state: "DELIVERED" });
    } catch {
      const terminal = row.attempts >= maxAttempts;
      await store.settle(row.id, row.leaseToken, { state: terminal ? "FAILED" : "RETRY", error: "delivery-failed", ...(!terminal ? { nextAttemptAt: new Date(now.getTime() + Math.min(3600_000, 1000 * 2 ** Math.min(row.attempts, 12))) } : {}) });
    }
  }
  return rows.length;
}
