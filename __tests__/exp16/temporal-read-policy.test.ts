const transaction=jest.fn();
jest.mock("@/lib/prisma",()=>({__esModule:true,default:{$transaction:transaction}}));
jest.mock("@/lib/ai/prompts",()=>({getDigitalTwinSystemPrompt:()=>"Synthetic persona"}));
import { releasePersona as activatePersona, previewPersonaActivation, previewPersonaRollback } from "@/lib/persona/store";
import { manifestHash, scopeForRelease, type PersonaManifest } from "@/lib/persona/manifest";
import { TEMPORAL_EXTRACTOR_VERSION as V1 } from "@/lib/graph/temporal/extractor";
import { TEMPORAL_READ_VERSION } from "@/lib/graph/temporal/read-policy";
import { EXTRACTOR_VERSION } from "@/lib/graph/evidence-extractor";
async function releasePersona(input:Parameters<typeof activatePersona>[0]) {const preview=await previewPersonaActivation(input);return activatePersona({...input,...(preview.approvalHash?{approvalHash:preview.approvalHash}:{})});}
const config={twinPersonality:null,twinGreeting:null,twinOpinions:null,twinFramework:null,twinBoundaries:null,ragEnabled:true,personalityProfile:null};
const pins=[{itemId:"p",sourceVersion:1,revisionId:"r-p",contentHash:"hash",snapshotHash:"snapshot",extractorVersion:EXTRACTOR_VERSION,vectorIds:["tenant-a:p:v1:chunk_0"]}];
const old:PersonaManifest={format:"persona-release-v1",expertProfileId:"tenant-a",config,sources:pins,identity:{displayName:"Ada",specialty:[]},renderedPersona:{visitor:"old",owner:"old"},algorithms:{evidence:EXTRACTOR_VERSION,temporal:V1},parentReleaseId:null,rollbackOf:null};
const scope={expertProfileId:"tenant-a",namespace:"a",isOwner:false,allowedVectorIds:[pins[0].vectorIds[0],"private"]};
let target:PersonaManifest, writes:unknown[][];
let update:jest.Mock;
beforeEach(()=>{
 target=structuredClone(old);writes=[];update=jest.fn();
 const tx={
  $queryRaw:jest.fn(async(parts:TemplateStringsArray)=>{
   const sql=parts.join("?");
   if(sql.includes('SELECT "userId"'))return [{userId:"owner"}];
   if(sql.includes('"operationKey"'))return [];
   if(sql.includes('FROM "PersonaReleaseHead"'))return [{releaseId:"head"}];
   if(sql.includes('SELECT * FROM "PersonaRelease"'))return [{id:"old",expertProfileId:"tenant-a",manifest:target,manifestHash:manifestHash(target)}];
   if(sql.includes('AS "itemId"'))return pins;
   return [];
  }),
  $executeRaw:jest.fn(async(_parts:TemplateStringsArray,...values:unknown[])=>{writes.push(values);return 1;}),
  widgetConfig:{findUnique:jest.fn(async()=>null)},
  knowledgeItem:{count:jest.fn(async(arg:{where:{OR?:unknown}})=>arg.where.OR?0:1)},
  expertProfile:{findUniqueOrThrow:jest.fn(async()=>({id:"tenant-a",userId:"owner",displayName:"Ada",specialty:[],...config})),update},
 };
 transaction.mockImplementation(async fn=>fn(tx));
});
test("retained v1 manifests pin v1 reader while live scope and exact pins still intersect",()=>{
 expect(scopeForRelease(scope,old,pins)).toMatchObject({allowedVectorIds:[pins[0].vectorIds[0]],temporalReadVersion:V1});
 expect(scopeForRelease({...scope,allowedVectorIds:[]},old,pins).allowedVectorIds).toEqual([]);
 expect(scopeForRelease(scope,old,[]).allowedVectorIds).toEqual([]);
 expect(scopeForRelease({...scope,expertProfileId:"foreign"},old,pins).allowedVectorIds).toEqual([]);
 expect(scopeForRelease(scope,{...old,algorithms:{...old.algorithms,temporal:"unsupported"}},pins).allowedVectorIds).toEqual([]);
});
test("new releases stamp the active adapter read policy without rewriting historical manifests",async()=>{
 const retained=JSON.stringify(old);
 const release=await releasePersona({expertProfileId:"tenant-a",actorId:"owner",operationKey:"new",expectedHead:"head"});
 expect(release.manifest.algorithms.temporal).toBe(TEMPORAL_READ_VERSION);
 expect(scopeForRelease(scope,release.manifest,pins).temporalReadVersion).toBe(TEMPORAL_READ_VERSION);
 expect(JSON.stringify(old)).toBe(retained);expect(update).not.toHaveBeenCalled();
 expect(JSON.parse(writes[0][6] as string).algorithms.temporal).toBe(TEMPORAL_READ_VERSION);
});
test("rollback preserves target v1 temporal interpretation rather than silently adopting adapter",async()=>{
 const preview=await previewPersonaRollback({expertProfileId:"tenant-a",actorId:"owner",expectedHead:"head",rollbackTo:"old"});expect(preview.allowed).toBe(true);
 const result=await releasePersona({expertProfileId:"tenant-a",actorId:"owner",operationKey:"rollback",expectedHead:"head",rollbackTo:"old"});
 expect(result.manifest.algorithms.temporal).toBe(V1);expect(result.manifest.rollbackOf).toBe("old");expect(result.manifest.sources).toEqual(pins);
 expect(update).toHaveBeenCalledTimes(1);expect(JSON.stringify(target)).toBe(JSON.stringify(old));
});
test("rollback retains adapter targets and blocks unknown algorithms before config or manifest writes",async()=>{
 target.algorithms.temporal=TEMPORAL_READ_VERSION;
 expect((await releasePersona({expertProfileId:"tenant-a",actorId:"owner",operationKey:"rollback",expectedHead:"head",rollbackTo:"old"})).manifest.algorithms.temporal).toBe(TEMPORAL_READ_VERSION);
 writes=[];update.mockClear();target.algorithms.temporal="unknown";
 expect((await previewPersonaRollback({expertProfileId:"tenant-a",actorId:"owner",expectedHead:"head",rollbackTo:"old"})).allowed).toBe(false);
 await expect(releasePersona({expertProfileId:"tenant-a",actorId:"owner",operationKey:"rollback",expectedHead:"head",rollbackTo:"old"})).rejects.toThrow("Rollback algorithm is unsupported");
 expect(update).not.toHaveBeenCalled();expect(writes).toEqual([]);
});

test("behavioral rollback replays target rendered prompts and identity even when current identity differs",async()=>{
 target.identity={displayName:"Prior approved identity",specialty:["prior specialty"]};
 target.renderedPersona={visitor:"Prior approved visitor",owner:"Prior approved owner"};
 const result=await releasePersona({expertProfileId:"tenant-a",actorId:"owner",operationKey:"behavioral-rollback",expectedHead:"head",rollbackTo:"old"});
 expect(result.manifest.identity).toEqual(target.identity);
 expect(result.manifest.renderedPersona).toEqual(target.renderedPersona);
 expect(result.manifest.config).toEqual(target.config);
});
