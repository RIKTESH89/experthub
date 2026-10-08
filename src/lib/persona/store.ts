import { currentRuntimePolicy, supportedReplayCapsule } from "./runtime";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { getDigitalTwinSystemPrompt, type PersonalityProfile } from "@/lib/ai/prompts";
import { EXTRACTOR_VERSION } from "@/lib/graph/evidence-extractor";
import { ACTIVE_TEMPORAL_READ_VERSION, supportedTemporalReadVersion } from "@/lib/graph/temporal/read-policy";
import { manifestHash, sortedPins, sourcePinsEqual, ACTIVE_MANIFEST_VERSION, supportedManifestVersion, type PersonaConfig, type PersonaManifest, type SourcePin } from "./manifest";
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
export const v2WritesEnabled=()=>process.env.EXP16_ENABLE_V2_WRITES === "1";
type ReviewInput={expertProfileId:string;actorId:string;expectedHead:string|null;rollbackTo?:string};
async function prepareActivation(tx:Store,input:ReviewInput) {
    const heads=await tx.$queryRaw<{releaseId:string}[]>`SELECT "releaseId" FROM "PersonaReleaseHead" WHERE "expertProfileId"=${input.expertProfileId}`;
    const currentHead=heads[0]?.releaseId||null;
    if(currentHead!==input.expectedHead)throw new ReviewError(409,"Release head changed");
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
    let replayManifest: PersonaManifest | null = null;
    if(input.rollbackTo) {
      const targets=await tx.$queryRaw<Release[]>`SELECT * FROM "PersonaRelease" WHERE "expertProfileId"=${input.expertProfileId} AND "id"=${input.rollbackTo}`;
      const target=targets[0];
      if(!target) throw new ReviewError(404,"Release not found");
      if(!supportedManifestVersion(target.manifest.format) || target.manifest.expertProfileId!==input.expertProfileId || target.manifestHash!==manifestHash(target.manifest) || !sourcePinsEqual(target.manifest.sources,sources)) throw new ReviewError(409,"Rollback evidence is no longer current; create a new release");
      if(target.manifest.algorithms.evidence!==EXTRACTOR_VERSION || !supportedTemporalReadVersion(target.manifest.algorithms.temporal)) throw new ReviewError(409,"Rollback algorithm is unsupported");
      if(target.manifest.format===ACTIVE_MANIFEST_VERSION && !supportedReplayCapsule(target.manifest.runtime,target.manifest.greetings)) throw new ReviewError(409,"Rollback runtime or greeting capsule is unsupported");
      temporalReadVersion=target.manifest.algorithms.temporal;
      if(target.manifest.config.ragEnabled !== expert.ragEnabled) throw new ReviewError(409,"Rollback cannot change current RAG permission");
      chosen=target.manifest.config;
      replayManifest=target.manifest;

    }
    await tx.$queryRaw`SELECT "id" FROM "WidgetConfig" WHERE "expertProfileId"=${expert.id} FOR UPDATE`;
    const widget=await tx.widgetConfig.findUnique({where:{expertProfileId:expert.id},select:{greeting:true}});
    const enhancements={opinions:chosen.twinOpinions,framework:chosen.twinFramework,boundaries:chosen.twinBoundaries};
    const renderedPersona=replayManifest?.renderedPersona ?? {visitor:getDigitalTwinSystemPrompt(expert.displayName,chosen.twinPersonality||undefined,null,enhancements),owner:getDigitalTwinSystemPrompt(expert.displayName,chosen.twinPersonality||undefined,chosen.personalityProfile as unknown as PersonalityProfile|null,enhancements)};
    const manifest:PersonaManifest={format:replayManifest?.format ?? (v2WritesEnabled()?ACTIVE_MANIFEST_VERSION: "persona-release-v1"),expertProfileId:expert.id,config:chosen,sources,identity:replayManifest?.identity ?? {displayName:expert.displayName,specialty:expert.specialty},renderedPersona,algorithms:{evidence:EXTRACTOR_VERSION,temporal:temporalReadVersion},parentReleaseId:input.expectedHead,rollbackOf:input.rollbackTo||null};
    if (manifest.format===ACTIVE_MANIFEST_VERSION) {
      if(replayManifest){manifest.runtime=replayManifest.runtime;manifest.greetings=replayManifest.greetings;}
      else {
        manifest.runtime=currentRuntimePolicy();
        manifest.greetings={chat:chosen.twinGreeting,widget:widget?.greeting || chosen.twinGreeting || null};
      }
    }
    if(manifest.format===ACTIVE_MANIFEST_VERSION && !v2WritesEnabled())throw new ReviewError(409,"V2 writes are gated pending a compatible downgrade target");
    const currents=currentHead ? await tx.$queryRaw<Release[]>`SELECT * FROM "PersonaRelease" WHERE "expertProfileId"=${expert.id} AND "id"=${currentHead}` : [];
    const current=currents[0]?.manifest;
    if(current && (!supportedManifestVersion(current.format) || currents[0].manifestHash!==manifestHash(current) || (current.format===ACTIVE_MANIFEST_VERSION && !supportedReplayCapsule(current.runtime,current.greetings))))throw new ReviewError(409,"Current release is invalid or unsupported");
    const effective=(m:PersonaManifest)=>({config:m.config,identity:m.identity,renderedPersona:m.renderedPersona,algorithms:m.algorithms,
      runtime:m.format===ACTIVE_MANIFEST_VERSION?m.runtime:currentRuntimePolicy(),
      greetings:m.format===ACTIVE_MANIFEST_VERSION?m.greetings:{chat:m.config.twinGreeting,widget:widget?.greeting || m.config.twinGreeting || null},format:m.format});
    const draftManifest={...manifest,config,identity:{displayName:expert.displayName,specialty:expert.specialty},renderedPersona:{visitor:getDigitalTwinSystemPrompt(expert.displayName,config.twinPersonality||undefined,null,{opinions:config.twinOpinions,framework:config.twinFramework,boundaries:config.twinBoundaries}),owner:getDigitalTwinSystemPrompt(expert.displayName,config.twinPersonality||undefined,config.personalityProfile as unknown as PersonalityProfile|null,{opinions:config.twinOpinions,framework:config.twinFramework,boundaries:config.twinBoundaries})},runtime:currentRuntimePolicy(),greetings:{chat:config.twinGreeting,widget:widget?.greeting || config.twinGreeting || null}};
    const before=effective(current??draftManifest),after=effective(manifest);
    const reviewed={before,after,draftBefore:config,draftAfter:chosen};
    const approvalHash=manifestHash({expertProfileId:input.expertProfileId,expectedHead:input.expectedHead,rollbackTo:input.rollbackTo??null,manifest,reviewed});
    const changes: {field:string;before:unknown;after:unknown}[]=[];
    const compare=(prefix:string,a:unknown,b:unknown)=>{
      if(manifestHash(a)===manifestHash(b))return;
      if(a!==null&&b!==null&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)) {
        for(const key of Array.from(new Set([...Object.keys(a),...Object.keys(b)])))compare(prefix?prefix+'.'+key:key,(a as Record<string,unknown>)[key]??null,(b as Record<string,unknown>)[key]??null);
      }else changes.push({field:prefix,before:a,after:b});
    };
    compare('effective',before,after);compare('draft',config,chosen);
    return {manifest,reviewed,approvalHash,changes,expert};
}
export async function releasePersona(input:ReviewInput & {operationKey:string;approvalHash?:string}) {
 const requestHash=manifestHash(input);
 return prisma.$transaction(async tx=>{
    await lockOwner(tx,input.expertProfileId,input.actorId);
    const existing=await tx.$queryRaw<Release[]>`SELECT * FROM "PersonaRelease" WHERE "expertProfileId"=${input.expertProfileId} AND "operationKey"=${input.operationKey}`;
    if(existing.length){if(existing[0].requestHash!==requestHash)throw new ReviewError(409,"Idempotency key reused");const value=existing[0];return {id:value.id,expertProfileId:value.expertProfileId,manifest:value.manifest,manifestHash:value.manifestHash,requestHash:value.requestHash};}
    const prepared=await prepareActivation(tx,input);
    if(!input.approvalHash)throw new ReviewError(400,"Reviewed approval receipt required");
    if(input.approvalHash!==prepared.approvalHash)throw new ReviewError(409,"Reviewed payload changed; preview again before approval");
    const {manifest,expert}=prepared;
    if(input.approvalHash)manifest.approval={version:'persona-approval-v1',hash:prepared.approvalHash,...prepared.reviewed};
    if(input.rollbackTo)await tx.expertProfile.update({where:{id:expert.id},data:{...manifest.config,personalityProfile:manifest.config.personalityProfile===null?Prisma.DbNull:manifest.config.personalityProfile}});
    const id=randomUUID(), hash=manifestHash(manifest);
    await tx.$executeRaw`INSERT INTO "PersonaRelease" ("id","expertProfileId","actorId","operationKey","requestHash","manifestHash","manifest") VALUES (${id},${expert.id},${input.actorId},${input.operationKey},${requestHash},${hash},${JSON.stringify(manifest)}::jsonb)`;
    await tx.$executeRaw`INSERT INTO "PersonaReleaseHead" ("expertProfileId","releaseId") VALUES (${expert.id},${id}) ON CONFLICT ("expertProfileId") DO UPDATE SET "releaseId"=EXCLUDED."releaseId","generation"="PersonaReleaseHead"."generation"+1`;
    return {id,expertProfileId:expert.id,manifest,manifestHash:hash,requestHash};
  });
}

/** Read-only disclosure; confirmation recomputes the same payload under the same locks. */
export async function previewPersonaActivation(input:ReviewInput) {
 return prisma.$transaction(async tx=>{
  await lockOwner(tx,input.expertProfileId,input.actorId);
  try {
   const p=await prepareActivation(tx,input);
   return {allowed:true,reason:null,currentHead:input.expectedHead,targetId:input.rollbackTo??null,targetConfig:p.manifest.config,changedFields:p.changes.map(c=>c.field),changes:p.changes,sourceCount:p.manifest.sources.length,approvalHash:p.approvalHash,activation:p.manifest,reviewed:p.reviewed};
  }catch(error){if(error instanceof ReviewError&&error.status===409)return {allowed:false,reason:error.message,currentHead:input.expectedHead,targetId:input.rollbackTo??null,changes:[],changedFields:[],sourceCount:0,approvalHash:null};throw error;}
 });
}
export const previewPersonaRollback=(input:ReviewInput & {rollbackTo:string})=>previewPersonaActivation(input);
