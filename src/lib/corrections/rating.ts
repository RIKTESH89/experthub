import prisma from "@/lib/prisma";
import { z } from "zod";
import { manifestHash } from "@/lib/persona/manifest";
import { ReviewError, type Store } from "@/lib/persona/store";
import { submitCorrectionInTransaction } from "./service";

export const ratingSchema = z.object({ rating: z.union([z.literal(1), z.literal(-1)]) }).strict();
export type RatingEvidenceLink = { itemId: string; sourceVersion: number; revisionId: string; spanId: string; assertionId: string; vectorId: string };
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const id = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 200;

/** Saved provenance only. Ratings and request bodies never select a claim or source. */
export function savedRatingLinks(sources: unknown, expertProfileId: string): RatingEvidenceLink[] {
  if (!Array.isArray(sources)) return [];
  const links = new Map<string, RatingEvidenceLink>();
  for (const source of sources.slice(0, 30)) {
    const metadata = record(record(source)?.metadata);
    if (!metadata || metadata.expertProfileId !== expertProfileId || !id(metadata.vectorId) || metadata.generationAudience === "owner") continue;
    if (!Array.isArray(metadata.evidenceTrace)) continue;
    for (const value of metadata.evidenceTrace.slice(0, 30)) {
      const trace = record(value);
      if (!trace || !id(trace.itemId) || !id(trace.revisionId) || !id(trace.spanId) || !id(trace.assertionId) ||
          !Number.isSafeInteger(trace.sourceVersion) || (trace.sourceVersion as number) < 1 ||
          ("knowledgeItemId" in metadata && trace.itemId !== metadata.knowledgeItemId) ||
          ("sourceVersion" in metadata && trace.sourceVersion !== metadata.sourceVersion) ||
          !Array.isArray(trace.chunkIds) || !trace.chunkIds.includes(metadata.vectorId)) continue;
      // Default authorized-neighbor retrieval stores item/version only in the trace.
      // Explicit outer pins, when present, must still agree; SQL validates the full tuple.
      const link = { itemId: trace.itemId, sourceVersion: trace.sourceVersion as number, revisionId: trace.revisionId,
        spanId: trace.spanId, assertionId: trace.assertionId, vectorId: metadata.vectorId };
      links.set(manifestHash(link), link);
      if (links.size === 30) return Array.from(links.values());
    }
  }
  return Array.from(links.values());
}

async function verifiedLinks(tx: Store, sources: unknown, expertProfileId: string) {
  const links: RatingEvidenceLink[] = [];
  for (const link of savedRatingLinks(sources, expertProfileId)) {
    // Historical references are audit pointers, never authority for retrieval or acceptance.
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT r."id" FROM "EvidenceRevision" r
      JOIN "EvidenceSpan" s ON s."revisionId"=r."id"
      JOIN "EvidenceSupport" p ON p."spanId"=s."id"
      JOIN "EvidenceAssertion" a ON a."id"=p."assertionId"
      WHERE r."expertProfileId"=${expertProfileId} AND a."expertProfileId"=${expertProfileId}
      AND r."itemId"=${link.itemId} AND r."sourceVersion"=${link.sourceVersion} AND r."id"=${link.revisionId}
      AND s."id"=${link.spanId} AND a."id"=${link.assertionId} AND ${link.vectorId}=ANY(s."chunkIds")`;
    if (rows.length) links.push(link);
  }
  return links;
}

/** One candidate per assistant message/polarity; repeated clicks never reopen decisions. */
export async function rateMessageForReview(input: { actorId: string; sessionId: string; messageId: string; rating: 1 | -1 }) {
  const { rating } = ratingSchema.parse({ rating: input.rating });
  return prisma.$transaction(async tx => {
    let message = await tx.chatMessage.findUnique({ where: { id: input.messageId }, include: { chatSession: true } });
    if (!message || message.chatSessionId !== input.sessionId) throw new ReviewError(404, "Message not found in session");
    if (message.chatSession.subscriberId !== input.actorId) throw new ReviewError(403, "Message access denied");
    if (message.role !== "assistant") throw new ReviewError(400, "Only assistant messages can be rated");
    const expertProfileId = message.chatSession.expertProfileId;
    // Same expert-first lock order as the existing review workflow.
    await tx.$queryRaw`SELECT "id" FROM "ExpertProfile" WHERE "id"=${expertProfileId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "ChatSession" WHERE "id"=${input.sessionId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "ChatMessage" WHERE "id"=${input.messageId} FOR UPDATE`;
    message = await tx.chatMessage.findUnique({ where: { id: input.messageId }, include: { chatSession: true } });
    if (!message || message.chatSessionId !== input.sessionId || message.role !== "assistant" ||
        message.chatSession.subscriberId !== input.actorId || message.chatSession.expertProfileId !== expertProfileId) throw new ReviewError(403, "Message access changed");
    const submissionKey = `rating:${manifestHash([input.messageId, rating])}`;
    const review = await submitCorrectionInTransaction(tx, {
      expertProfileId, actorId: input.actorId, messageId: input.messageId, submissionKey,
      proposal: { feedback: rating === -1 ? "Visitor rated this response unhelpful. Expert review required; this is not evidence of a belief." : "Visitor rated this response helpful. Expert review required; this is not evidence of a belief." },
    }, { kind: "visitor-rating-v1", rating, sessionId: input.sessionId, messageId: input.messageId,
      evidenceLinks: await verifiedLinks(tx, message.sources, expertProfileId) });
    await tx.chatMessage.update({ where: { id: input.messageId }, data: { rating } });
    return { success: true, rating, reviewId: review.id, reviewState: review.state, auditOperationKey: `submit:${review.id}` };
  });
}
