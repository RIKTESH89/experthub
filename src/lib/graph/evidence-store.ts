import prisma from "@/lib/prisma";
import {publishTemporal} from "./temporal/publisher";
import type { KnowledgeItem, Prisma } from "@prisma/client";
import type { RetrievalScope } from "@/lib/knowledge/access";
import type { RetrievalResult } from "@/lib/vector/retriever";
import { EXTRACTOR_VERSION, extractLiteralAssertions, hashEvidence, overlappingChunks } from "./evidence-extractor";

type Store = Prisma.TransactionClient;
type Snapshot = { content: string; authorId: string | null; uploaderId: string; audience: string; publishedAt: Date | null; publicationTimeBasis: string; sourceUpdatedAt: Date };
/** Post author is authoritative; upload ownership does not establish authorship. */
async function snapshot(tx: Store, item: KnowledgeItem, ownerId: string): Promise<Snapshot | null> {
  const metadata = item.metadata as Prisma.JsonObject | null;
  if (item.sourceType === "post") {
    const post = item.sourceId ? await tx.post.findUnique({where:{id:item.sourceId}}) : null;
    if (!post || post.authorId !== ownerId || !post.isRagEnabled || item.title !== (post.title || "Untitled Post") || item.content !== (post.content || "")) return null;
    return {content:`${item.title}\n\n${item.content}`,authorId:post.authorId,uploaderId:ownerId,
      audience:post.status !== "PUBLISHED" || post.isHidden ? "private" : post.isPremiumOnly ? "premium" : "public",
      // Existing Post schema does not record publication time. Do not invent it.
      publishedAt:null,publicationTimeBasis:"unavailable",sourceUpdatedAt:post.updatedAt};
  }
  if (item.sourceType !== "manual") return null;
  return {content:`${item.title}\n\n${item.content}`,authorId:typeof metadata?.authorId === "string" ? metadata.authorId : null,
    uploaderId:ownerId,audience:metadata?.audience === "public" ? "public" : metadata?.audience === "premium" ? "premium" : "private",
    publishedAt:typeof metadata?.publishedAt === "string" && !Number.isNaN(Date.parse(metadata.publishedAt)) ? new Date(metadata.publishedAt) : null,
    publicationTimeBasis:typeof metadata?.publishedAt === "string" && !Number.isNaN(Date.parse(metadata.publishedAt)) ? "source-declared" : "unavailable",sourceUpdatedAt:item.updatedAt};
}

/** Call in source-publication transaction. Identical rebuilds cannot increment support. */
export async function publishEvidence(tx: Store, item: KnowledgeItem, ownerId: string): Promise<string | null> {
  const value = await snapshot(tx,item,ownerId);
  if (!value) return null;
  const contentHash = hashEvidence(value.content);
  const snapshotHash = hashEvidence([item.sourceVersion,contentHash,value.authorId,value.uploaderId,value.audience,value.publishedAt,value.publicationTimeBasis]);
  const revisionId = hashEvidence([item.expertProfileId,item.id,snapshotHash,EXTRACTOR_VERSION]);
  await tx.$executeRaw`UPDATE "EvidenceRevision" SET "retiredAt"=CURRENT_TIMESTAMP WHERE "expertProfileId"=${item.expertProfileId} AND "itemId"=${item.id} AND "id"<>${revisionId} AND "retiredAt" IS NULL`;
  await tx.$executeRaw`INSERT INTO "EvidenceRevision" ("id","expertProfileId","itemId","sourceType","sourceId","sourceVersion","contentHash","snapshotHash","content","authorId","uploaderId","audience","publishedAt","publicationTimeBasis","sourceUpdatedAt","extractorVersion")
    VALUES (${revisionId},${item.expertProfileId},${item.id},${item.sourceType},${item.sourceId},${item.sourceVersion},${contentHash},${snapshotHash},${value.content},${value.authorId},${value.uploaderId},${value.audience},${value.publishedAt},${value.publicationTimeBasis},${value.sourceUpdatedAt},${EXTRACTOR_VERSION}) ON CONFLICT ("id") DO NOTHING`;
  for (const assertion of extractLiteralAssertions(value.content,value.authorId,ownerId)) {
    const spanId = hashEvidence([revisionId,assertion.start,assertion.end]);
    // Unresolved speakers are source-local mentions, never merged people by name.
    const subject = assertion.speakerRole === "author" ? assertion.subject : `${item.id}:${assertion.subject}`;
    const assertionId = hashEvidence([item.expertProfileId,subject,assertion.predicate,assertion.object,assertion.kind,assertion.endorsedByOwner,EXTRACTOR_VERSION]);
    const chunkIds = overlappingChunks(item.expertProfileId,item.id,item.sourceVersion,assertion.start,assertion.end,value.content.length);
    await tx.$executeRaw`INSERT INTO "EvidenceSpan" ("id","revisionId","start","end","text","chunkIds","speakerId","speakerRole") VALUES (${spanId},${revisionId},${assertion.start},${assertion.end},${assertion.text},${chunkIds},${assertion.speakerId},${assertion.speakerRole}) ON CONFLICT ("id") DO NOTHING`;
    await tx.$executeRaw`INSERT INTO "EvidenceAssertion" ("id","expertProfileId","subject","predicate","object","kind","endorsedByOwner","extractorVersion") VALUES (${assertionId},${item.expertProfileId},${subject},${assertion.predicate},${assertion.object},${assertion.kind},${assertion.endorsedByOwner},${EXTRACTOR_VERSION}) ON CONFLICT ("id") DO NOTHING`;
    await tx.$executeRaw`INSERT INTO "EvidenceSupport" ("assertionId","spanId") VALUES (${assertionId},${spanId}) ON CONFLICT DO NOTHING`;
  }
  await publishTemporal(tx,revisionId,item,ownerId,value.content,value.authorId);
  return revisionId;
}

export async function retireEvidence(tx: Store, expertProfileId: string, itemId: string) {
  await tx.$executeRaw`UPDATE "EvidenceRevision" SET "retiredAt"=CURRENT_TIMESTAMP WHERE "expertProfileId"=${expertProfileId} AND "itemId"=${itemId} AND "retiredAt" IS NULL`;
}

/** Explicit bounded backfill/rebuild; tenant lock serializes with indexing/deletion. */
export async function rebuildEvidenceSource(expertProfileId: string, itemId: string) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "KnowledgeItem" WHERE "id"=${itemId} AND "expertProfileId"=${expertProfileId} FOR UPDATE`;
    const item = await tx.knowledgeItem.findUnique({where:{id:itemId},include:{expertProfile:true}});
    if (!item || item.expertProfileId !== expertProfileId || !item.isIndexed || item.indexedVersion !== item.sourceVersion) return null;
    return publishEvidence(tx,item,item.expertProfile.userId);
  });
}

export interface EvidenceTrace {
  assertionId: string; revisionId: string; spanId: string; itemId: string; contentHash: string;
  sourceVersion: number; subject: string; predicate: string; object: string; kind: string;
  endorsedByOwner: boolean; authorId: string | null; uploaderId: string; speakerId: string | null;
  speakerRole: string; audience: string; publishedAt: Date | null; publicationTimeBasis: string; sourceUpdatedAt: Date; ingestedAt: Date;
  start: number; end: number; text: string; chunkIds: string[]; extractorVersion: string; weight: number;
}

/** Re-resolve permission on every chat request. Only selected AND allowed current chunks.
 * Weight is recomputed from visible supports, never from a mixed-audience global aggregate.
 */
export async function retrieveEvidenceTrace(scope: RetrievalScope, results: RetrievalResult[]): Promise<EvidenceTrace[]> {
  const allowed = new Set(scope.allowedVectorIds);
  const selected = results.filter(r=>r.metadata.expertProfileId===scope.expertProfileId && typeof r.metadata.vectorId === "string" && allowed.has(r.metadata.vectorId)).map(r=>r.metadata.vectorId as string);
  if (!selected.length) return [];
  const spans=await authorizedEvidenceSpans(scope,results);
  if(!spans.length)return [];
  const assertions=await prisma.$queryRaw<(Pick<EvidenceTrace,"assertionId"|"spanId"|"subject"|"predicate"|"object"|"kind"|"endorsedByOwner"|"extractorVersion">)[]>`SELECT a."id" AS "assertionId",s."spanId",a."subject",a."predicate",a."object",a."kind",a."endorsedByOwner",a."extractorVersion" FROM "EvidenceAssertion" a JOIN "EvidenceSupport" s ON s."assertionId"=a."id" WHERE a."expertProfileId"=${scope.expertProfileId} AND s."spanId"=ANY(${spans.map(s=>s.spanId)}::text[])`;
  const bySpan=new Map(spans.map(s=>[s.spanId,s]));
  const merged=assertions.flatMap(a=>{const span=bySpan.get(a.spanId);return span?[{...span,...a}]:[];});
  const weights=new Map<string,Set<string>>();for(const t of merged){const ids=weights.get(t.assertionId)||new Set<string>();ids.add(t.revisionId);weights.set(t.assertionId,ids);}
  return merged.map(t=>({...t,weight:weights.get(t.assertionId)!.size})).sort((a,b)=>a.assertionId.localeCompare(b.assertionId)||a.revisionId.localeCompare(b.revisionId)||a.spanId.localeCompare(b.spanId)).slice(0,30);
}

export type AuthorizedSpan = Pick<EvidenceTrace,"revisionId"|"spanId"|"itemId"|"contentHash"|"sourceVersion"|"authorId"|"uploaderId"|"speakerId"|"speakerRole"|"audience"|"publishedAt"|"publicationTimeBasis"|"sourceUpdatedAt"|"ingestedAt"|"start"|"end"|"text"|"chunkIds">;

/** Shared live-source permission gate. As-of never resurrects retired/deleted evidence. */
export async function authorizedEvidenceSpans(scope:RetrievalScope,results:RetrievalResult[]):Promise<AuthorizedSpan[]> {
 const allowed=new Set(scope.allowedVectorIds);
 const selected=results.filter(r=>r.metadata.expertProfileId===scope.expertProfileId&&typeof r.metadata.vectorId==="string"&&allowed.has(r.metadata.vectorId)).map(r=>r.metadata.vectorId as string);
 if(!selected.length)return [];
 return prisma.$queryRaw<AuthorizedSpan[]>`WITH eligible AS (
    SELECT r."id" AS "revisionId", p."id" AS "spanId",r."itemId",r."contentHash",r."sourceVersion",
    r."authorId",r."uploaderId",p."speakerId",p."speakerRole",r."audience",r."publishedAt",r."publicationTimeBasis",r."sourceUpdatedAt",r."ingestedAt",
    p."start",p."end",p."text",p."chunkIds"
    FROM "EvidenceSpan" p JOIN "EvidenceRevision" r ON r."id"=p."revisionId"
    JOIN "KnowledgeItem" i ON i."id"=r."itemId" AND i."expertProfileId"=r."expertProfileId"
    JOIN "ExpertProfile" e ON e."id"=r."expertProfileId"
    LEFT JOIN "Post" post ON i."sourceType"='post' AND post."id"=i."sourceId" AND post."authorId"=e."userId"
    WHERE r."expertProfileId"=${scope.expertProfileId}
    AND r."retiredAt" IS NULL AND i."sourceVersion"=r."sourceVersion" AND i."indexedVersion"=r."sourceVersion" AND i."isIndexed"=true
    AND (i."title" || E'\n\n' || i."content")=r."content"
    AND (i."sourceType"='manual' OR (post."id" IS NOT NULL AND post."isRagEnabled"=true AND i."title"=COALESCE(post."title",'Untitled Post') AND i."content"=COALESCE(post."content",'')))
    AND r."audience"=CASE WHEN i."sourceType"='post' THEN
       CASE WHEN post."status"<>'PUBLISHED' OR post."isHidden" THEN 'private' WHEN post."isPremiumOnly" THEN 'premium' ELSE 'public' END
       ELSE CASE WHEN i."metadata"->>'audience' IN ('public','premium') THEN i."metadata"->>'audience' ELSE 'private' END END
    AND (${scope.viewerId || null}::text=e."userId" OR r."audience"='public' OR (r."audience"='premium' AND EXISTS (
       SELECT 1 FROM "ExpertSubscription" sub WHERE sub."expertProfileId"=e."id" AND sub."subscriberId"=${scope.viewerId || null}
       AND sub."status" IN ('ACTIVE','CANCELLED','PAST_DUE','EXPIRED') AND sub."tier"='PREMIUM'
       AND sub."razorpayPaymentId" IS NOT NULL AND sub."paidPeriodStart"<=CURRENT_TIMESTAMP AND sub."currentPeriodEnd">CURRENT_TIMESTAMP)))
    AND p."chunkIds" && ${selected}::text[] AND p."chunkIds" && ${scope.allowedVectorIds}::text[]
  ) SELECT * FROM eligible ORDER BY "revisionId","spanId" LIMIT 100`;
}


export function evidencePrompt(trace: EvidenceTrace[]): string[] {
  if (!trace.length) return [];
  return ["Attribution rules: quoted statements report only the quoted speaker\'s view. Uploading does not establish authorship or endorsement. Unknown speakers are not the expert. Only owner endorsement true can support an attributed expert view; retain explicit/inferred/unknown labels and cite the supporting source.", ...trace.map(t=>`[assertion ${t.assertionId}; revision ${t.revisionId}; span ${t.start}:${t.end}; ${t.kind}; speaker ${t.speakerId || "unknown"}; ${t.speakerRole}; owner endorsement ${t.endorsedByOwner}] ${t.text}`)];
}
