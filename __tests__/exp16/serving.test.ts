const query=jest.fn(), pins=jest.fn();
jest.mock("@/lib/prisma",()=>({__esModule:true,default:{$queryRaw:query}}));
jest.mock("@/lib/persona/store",()=>({currentSourcePins:pins}));
import { resolveServingPersona } from "@/lib/persona/serving";
import { manifestHash, type PersonaManifest } from "@/lib/persona/manifest";
import { EXTRACTOR_VERSION } from "@/lib/graph/evidence-extractor";
import { ACTIVE_TEMPORAL_READ_VERSION } from "@/lib/graph/temporal/read-policy";
const scope={expertProfileId:"tenant",namespace:"ns",isOwner:false,allowedVectorIds:["approved","draft","private"]};
const source={itemId:"item",sourceVersion:1,revisionId:"revision",contentHash:"content",snapshotHash:"snapshot",extractorVersion:EXTRACTOR_VERSION,vectorIds:["approved","private"]};
let manifest:PersonaManifest;
const publish=()=>query.mockResolvedValue([{id:"release",expertProfileId:"tenant",manifest,manifestHash:manifestHash(manifest)}]);
beforeEach(()=>{
 manifest={format:"persona-release-v1",expertProfileId:"tenant",config:{twinPersonality:"approved",twinGreeting:null,twinOpinions:null,twinFramework:null,twinBoundaries:null,ragEnabled:true,personalityProfile:null},sources:[source],identity:{displayName:"Released identity",specialty:[]},renderedPersona:{visitor:"approved visitor",owner:"approved owner"},algorithms:{evidence:EXTRACTOR_VERSION,temporal:ACTIVE_TEMPORAL_READ_VERSION},parentReleaseId:null,rollbackOf:null};
 pins.mockResolvedValue([source]);publish();
});
test("adopts recorded prompt/identity and intersects exact source pins with current audience",async()=>{
 const result=await resolveServingPersona({...scope,allowedVectorIds:["approved","draft"]},true);
 expect(result).toMatchObject({releaseId:"release",systemPrompt:"approved visitor",displayName:"Released identity",scope:{allowedVectorIds:["approved"],temporalReadVersion:ACTIVE_TEMPORAL_READ_VERSION}});
 expect((await resolveServingPersona({...scope,isOwner:true},true)).systemPrompt).toBe("approved owner");
});
test("changed or retired evidence cannot reappear through a historical release",async()=>{
 pins.mockResolvedValue([{...source,sourceVersion:2}]);expect((await resolveServingPersona(scope,true)).scope.allowedVectorIds).toEqual([]);
 pins.mockResolvedValue([]);expect((await resolveServingPersona(scope,true)).scope.allowedVectorIds).toEqual([]);
});
test("both live revocation and release-level disable override approved sources",async()=>{
 expect((await resolveServingPersona(scope,false)).scope.allowedVectorIds).toEqual([]);
 manifest.config.ragEnabled=false;publish();expect((await resolveServingPersona(scope,true)).scope.allowedVectorIds).toEqual([]);
});
test.each(["integrity","tenant","algorithm","missing"])("invalid active release fails closed: %s",async(mode)=>{
 if(mode==="integrity")manifest.identity.displayName="tampered";
 if(mode==="tenant"){manifest.expertProfileId="foreign";publish();}
 if(mode==="algorithm"){manifest.algorithms.temporal="unsupported";publish();}
 if(mode==="missing")query.mockResolvedValue([{manifest:null}]);
 await expect(resolveServingPersona(scope,true)).rejects.toThrow("Active persona release");
});
test("never-published experts retain live behavior; database failure does not fall back to drafts",async()=>{
 query.mockResolvedValue([]);expect(await resolveServingPersona(scope,true)).toMatchObject({releaseId:null,systemPrompt:null,scope});
 query.mockRejectedValue(new Error("database unavailable"));await expect(resolveServingPersona(scope,true)).rejects.toThrow("database unavailable");
});
