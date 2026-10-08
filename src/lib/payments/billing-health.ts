import prisma from '@/lib/prisma';
import { requireBillingAdmin } from './billing-admin-store';
import { assertBillingEnabled, BillingRuntimeError } from './billing-runtime';

const safeErrors = new Set(['attempt-limit-exhausted', 'delivery-failed', 'billing-email-rejected', 'billing-payload-invalid', 'billing-envelope-invalid', 'delivery-ambiguity-review-required']);
/** Read-only operational snapshot. Never returns message bodies, recipients, raw errors or credentials.
 * No automatic retries, replay or alert transport. Actor is rechecked in the same snapshot transaction.
 */
export async function billingHealth(actorId: string, now = new Date()) {
  assertBillingEnabled('BILLING_REVIEW_ENABLED');
  try {
    return await prisma.$transaction(async tx => {
      // Prisma's callback timeout does not cancel an in-flight PostgreSQL statement.
      // Leave 500ms for rollback; every read gets only the remaining SQL budget.
      const deadline = Date.now() + 4500;
      await tx.$executeRaw`SET LOCAL statement_timeout = '4500ms'`;
      await tx.$executeRaw`SET LOCAL idle_in_transaction_session_timeout = '5000ms'`;
      const read = async <T>(query: () => Promise<T>): Promise<T> => {
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new BillingRuntimeError('Billing health unavailable');
        await tx.$queryRaw`SELECT set_config('statement_timeout', ${`${remaining}ms`}, true), set_config('lock_timeout', ${`${Math.min(1000, remaining)}ms`}, true)`;
        if (Date.now() >= deadline) throw new BillingRuntimeError('Billing health unavailable');
        return query();
      };
      await read(() => requireBillingAdmin(tx, actorId));
      const outbox = await read(() => tx.$queryRaw<{ ready: number; due: number; leased: number; expiredLeases: number; exhaustedReady: number; failed: number }[]>`
        SELECT count(*) FILTER (WHERE "state"='READY')::int AS ready,
          count(*) FILTER (WHERE "state"='READY' AND "nextAttemptAt"<=${now})::int AS due,
          count(*) FILTER (WHERE "state"='LEASED')::int AS leased,
          count(*) FILTER (WHERE "state"='LEASED' AND "leaseUntil"<=${now})::int AS "expiredLeases",
          count(*) FILTER (WHERE "state"='READY' AND "attempts">=5)::int AS "exhaustedReady",
          count(*) FILTER (WHERE "state"='FAILED')::int AS failed FROM "BillingOutbox"`);
      const provisioning = await read(() => tx.$queryRaw<{ unknown: number; inFlight: number }[]>`
        SELECT count(*) FILTER (WHERE "state"='UNKNOWN')::int AS unknown,
          count(*) FILTER (WHERE "state"='IN_FLIGHT')::int AS "inFlight" FROM "BillingProvisioning"`);
      const failed = await read(() => tx.$queryRaw<{ id: string; attempts: number; lastError: string | null }[]>`
        SELECT "id", "attempts", "lastError" FROM "BillingOutbox" WHERE "state"='FAILED' ORDER BY "createdAt", "id" LIMIT 25`);
      const unresolved = await read(() => tx.$queryRaw<{ id: string; state: string; version: number }[]>`
        SELECT "id", "state", "version" FROM "BillingProvisioning" WHERE "state" IN ('UNKNOWN','IN_FLIGHT') ORDER BY "createdAt", "id" LIMIT 25`);
      return {
        observedAt: now.toISOString(),
        attentionRequired: outbox[0].failed > 0 || outbox[0].expiredLeases > 0 || outbox[0].exhaustedReady > 0 || provisioning[0].unknown > 0 || provisioning[0].inFlight > 0,
        outbox: outbox[0], provisioning: provisioning[0], sampleLimit: 25,
        failures: failed.map(row => ({ id: row.id, attempts: row.attempts, code: row.lastError && safeErrors.has(row.lastError) ? row.lastError : 'review-required' })),
        unresolved,
      };
    }, { isolationLevel: 'RepeatableRead', timeout: 5000, maxWait: 2000 });
  } catch (error) {
    // Await Prisma rollback before returning; do not expose SQL/provider error details.
    if (error instanceof BillingRuntimeError) throw error;
    throw new BillingRuntimeError('Billing health unavailable');
  }
}
