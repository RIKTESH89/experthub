import type { Prisma } from "@prisma/client";

/** Source writers use expert -> source -> post -> outbox/evidence ordering.
 * Take this gate BEFORE source/job writes, including FK-taking evidence inserts.
 * Owner decisions/releases use their existing authenticated ExpertProfile lock.
 * Outbox claims/acks are separate autocommit statements, never held across handlers.
 */
export async function lockExpertSourceWrites(tx: Prisma.TransactionClient, expertProfileId: string) {
  await tx.$queryRaw`SELECT "id" FROM "ExpertProfile" WHERE "id"=${expertProfileId} FOR UPDATE`;
}
