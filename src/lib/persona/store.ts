import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { getDigitalTwinSystemPrompt, type PersonalityProfile } from "@/lib/ai/prompts";
import { EXTRACTOR_VERSION } from "@/lib/graph/evidence-extractor";
import { ACTIVE_TEMPORAL_READ_VERSION, supportedTemporalReadVersion } from "@/lib/graph/temporal/read-policy";
import { manifestHash, sortedPins, sourcePinsEqual, MANIFEST_VERSION, type PersonaConfig, type PersonaManifest, type SourcePin } from "./manifest";
export class ReviewError extends Error { constructor(public status: number, message: string) { super(message); } }
export type Store = Prisma.TransactionClient;
export async function lockOwner(tx: Store, expertProfileId: string, actorId: string) {
  const rows = await tx.$queryRaw<{userId:string}[]>`SELECT "userId" FROM "ExpertProfile" WHERE "id"=${expertProfileId} FOR UPDATE`;
  if (!rows.length || rows[0].userId !== actorId) throw new ReviewError(403,"Expert owner required");
}
/** Owner release construction only. Read consumers must independently apply live access. */
export async function currentSourcePins(tx: Store, expertProfileId: string): Promise<SourcePin[]> {
  const pins = await tx.$queryRaw<SourcePin[]>`SELECT i."id" AS "itemId",i."sourceVersion",r."id" AS "revisionId",r."contentHash",r."snapshotHash",r."extractorVersion",i."vectorIds"
    FROM "KnowledgeItem" i JOIN "EvidenceRevision" r ON r."expertProfileId"=i."expertProfileId" AND r."itemId"=i."id" AND r."sourceVersion"=i."sourceVersion"
    JOIN "ExpertProfile" e ON e."id"=i."expertProfileId"
    LEFT JOIN "Post" p ON i."sourceType"='post' AND p."id"=i."sourceId" AND p."authorId"=e."userId"
    WHERE i."expertProfileId"=${expertProfileId} AND i."isIndexed" AND i."indexedVersion"=i."sourceVersion" AND r."retiredAt" IS NULL
    AND (i."sourceType"<>'manual' OR r."authorId" IS NOT DISTINCT FROM (i."metadata"->>'authorId'))
    AND r."extractorVersion"=${EXTRACTOR_VERSION} AND r."content"=(i."title" || E'\n\n' || i."content")
    AND (i."sourceType"='manual' OR (p."id" IS NOT NULL AND p."isRagEnabled" AND i."title"=COALESCE(p."title",'Untitled Post') AND i."content"=COALESCE(p."content",'')))
    AND r."audience"=CASE WHEN i."sourceType"='post' THEN CASE WHEN p."status"<>'PUBLISHED' OR p."isHidden" THEN 'private' WHEN p."isPremiumOnly" THEN 'premium' ELSE 'public' END
      ELSE CASE WHEN i."metadata"->>'audience' IN ('public','premium') THEN i."metadata"->>'audience' ELSE 'private' END END`;
  return sortedPins(pins);
}
export type Release = {id:string; expertProfileId:string; manifest:PersonaManifest; manifestHash:string; requestHash:string};
export async function releasePersona(input: {expertProfileId:string; actorId:string; operationKey:string; expectedHead:string|null; rollbackTo?:string}) {
  const requestHash=manifestHash(input);
  return prisma.$transaction(async tx=>{
    await lockOwner(tx,input.expertProfileId,input.actorId);
    const existing=await tx.$queryRaw<Release[]>`SELECT * FROM "PersonaRelease" WHERE "expertProfileId"=${input.expertProfileId} AND "operationKey"=${input.operationKey}`;
    if(existing.length) { if(existing[0].requestHash!==requestHash) throw new ReviewError(409,"Idempotency key reused"); const value=existing[0]; return {id:value.id,expertProfileId:value.expertProfileId,manifest:value.manifest,manifestHash:value.manifestHash,requestHash:value.requestHash}; }
    const heads=await tx.$queryRaw<{releaseId:string}[]>`SELECT "releaseId" FROM "PersonaReleaseHead" WHERE "expertProfileId"=${input.expertProfileId}`;
    if((heads[0]?.releaseId||null)!==input.expectedHead) throw new ReviewError(409,"Release head changed");
    // Same locks as source publication/deletion. No historical source content is restored.
    await tx.$queryRaw`SELECT "id" FROM "KnowledgeItem" WHERE "expertProfileId"=${input.expertProfileId} ORDER BY "id" FOR UPDATE`;
    await tx.$queryRaw`SELECT p."id" FROM "Post" p JOIN "ExpertProfile" e ON p."authorId"=e."userId" WHERE e."id"=${input.expertProfileId} ORDER BY p."id" FOR UPDATE OF p`;
    if(await tx.knowledgeItem.count({where:{expertProfileId:input.expertProfileId,OR:[{isIndexed:false},{indexedVersion:null}]}})) throw new ReviewError(409,"Sources still require recomputation");
    const expert=await tx.expertProfile.findUniqueOrThrow({where:{id:input.expertProfileId}});
    const config:PersonaConfig={twinPersonality:expert.twinPersonality,twinGreeting:expert.twinGreeting,twinOpinions:expert.twinOpinions,twinFramework:expert.twinFramework,twinBoundaries:expert.twinBoundaries,ragEnabled:expert.ragEnabled,personalityProfile:expert.personalityProfile};
    const sources=await currentSourcePins(tx,input.expertProfileId);
    const sourceCount=await tx.knowledgeItem.count({where:{expertProfileId:input.expertProfileId}});
    if(sources.length!==sourceCount)throw new ReviewError(409,"Every source must have a current supported evidence revision before release");
    let chosen=config, temporalReadVersion:string=ACTIVE_TEMPORAL_READ_VERSION;
    if(input.rollbackTo) {
      const targets=await tx.$queryRaw<Release[]>`SELECT * FROM "PersonaRelease" WHERE "expertProfileId"=${input.expertProfileId} AND "id"=${input.rollbackTo}`;
      const target=targets[0];
      if(!target) throw new ReviewError(404,"Release not found");
      if(target.manifestHash!==manifestHash(target.manifest) || !sourcePinsEqual(target.manifest.sources,sources)) throw new ReviewError(409,"Rollback evidence is no longer current; create a new release");
      if(target.manifest.algorithms.evidence!==EXTRACTOR_VERSION || !supportedTemporalReadVersion(target.manifest.algorithms.temporal)) throw new ReviewError(409,"Rollback algorithm is unsupported");
      temporalReadVersion=target.manifest.algorithms.temporal;
      if(target.manifest.config.ragEnabled !== expert.ragEnabled) throw new ReviewError(409,"Rollback cannot change current RAG permission");
      chosen=target.manifest.config;
      await tx.expertProfile.update({where:{id:expert.id},data:{...chosen,personalityProfile:chosen.personalityProfile===null?Prisma.DbNull:chosen.personalityProfile}});
    }
    const enhancements={opinions:chosen.twinOpinions,framework:chosen.twinFramework,boundaries:chosen.twinBoundaries};
    const renderedPersona={visitor:getDigitalTwinSystemPrompt(expert.displayName,chosen.twinPersonality||undefined,null,enhancements),owner:getDigitalTwinSystemPrompt(expert.displayName,chosen.twinPersonality||undefined,chosen.personalityProfile as unknown as PersonalityProfile|null,enhancements)};
    const manifest:PersonaManifest={format:MANIFEST_VERSION,expertProfileId:expert.id,config:chosen,sources,identity:{displayName:expert.displayName,specialty:expert.specialty},renderedPersona,algorithms:{evidence:EXTRACTOR_VERSION,temporal:temporalReadVersion},parentReleaseId:input.expectedHead,rollbackOf:input.rollbackTo||null};
    const id=randomUUID(), hash=manifestHash(manifest);
    await tx.$executeRaw`INSERT INTO "PersonaRelease" ("id","expertProfileId","actorId","operationKey","requestHash","manifestHash","manifest") VALUES (${id},${expert.id},${input.actorId},${input.operationKey},${requestHash},${hash},${JSON.stringify(manifest)}::jsonb)`;
    await tx.$executeRaw`INSERT INTO "PersonaReleaseHead" ("expertProfileId","releaseId") VALUES (${expert.id},${id}) ON CONFLICT ("expertProfileId") DO UPDATE SET "releaseId"=EXCLUDED."releaseId","generation"="PersonaReleaseHead"."generation"+1`;
    return {id,expertProfileId:expert.id,manifest,manifestHash:hash,requestHash};
  });
}

/** Read-only preview; confirmation always rechecks these conditions transactionally. */
export async function previewPersonaRollback(input:{expertProfileId:string;actorId:string;expectedHead:string|null;rollbackTo:string}) {
 return prisma.$transaction(async tx=>{
  await lockOwner(tx,input.expertProfileId,input.actorId);
  const heads=await tx.$queryRaw<{releaseId:string}[]>`SELECT "releaseId" FROM "PersonaReleaseHead" WHERE "expertProfileId"=${input.expertProfileId}`;
  const currentHead=heads[0]?.releaseId||null;
  const targets=await tx.$queryRaw<Release[]>`SELECT * FROM "PersonaRelease" WHERE "expertProfileId"=${input.expertProfileId} AND "id"=${input.rollbackTo}`;
  const target=targets[0];if(!target)throw new ReviewError(404,"Release not found");
  const pins=await currentSourcePins(tx,input.expertProfileId);
  const count=await tx.knowledgeItem.count({where:{expertProfileId:input.expertProfileId}});
  const expert=await tx.expertProfile.findUniqueOrThrow({where:{id:input.expertProfileId}});
  const fields=(Object.keys(target.manifest.config) as (keyof PersonaConfig)[]).filter(field=>manifestHash(target.manifest.config[field])!==manifestHash(expert[field]));
  const reason=currentHead!==input.expectedHead?"Release head changed. Refresh before previewing again.":
   target.manifestHash!==manifestHash(target.manifest)?"The target manifest failed its integrity check.":
   target.manifest.algorithms.evidence!==EXTRACTOR_VERSION || !supportedTemporalReadVersion(target.manifest.algorithms.temporal)?"The target algorithm is unsupported. Rollback is blocked.":
   expert.ragEnabled !== target.manifest.config.ragEnabled?"RAG permission changed. Rollback cannot change current access.":
   count!==pins.length || !sourcePinsEqual(target.manifest.sources,pins)?"Evidence has changed, been removed, restricted, or still needs recomputation. Rollback is blocked.":null;
  return {allowed:reason===null,reason,currentHead,targetId:target.id,changedFields:fields,targetConfig:target.manifest.config,sourceCount:target.manifest.sources.length};
 });
}
