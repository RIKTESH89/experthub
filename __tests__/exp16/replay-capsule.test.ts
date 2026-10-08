import prisma from '../mocks/prisma';
jest.mock('@/lib/prisma',()=>({__esModule:true,default:prisma}));
import { currentRuntimePolicy,supportedRuntimePolicy } from '@/lib/persona/runtime';
import { manifestHash } from '@/lib/persona/manifest';
import { resolveReleasedPresentation } from '@/lib/persona/serving';
import { importedSnapshot } from '@/lib/corrections/import-provenance';
import { EXTRACTOR_VERSION } from '@/lib/graph/evidence-extractor';
import { ACTIVE_TEMPORAL_READ_VERSION } from '@/lib/graph/temporal/read-policy';
import type { KnowledgeItem } from '@prisma/client';
const priorModel=process.env.OPENAI_MODEL;
afterEach(()=>{if(priorModel===undefined)delete process.env.OPENAI_MODEL;else process.env.OPENAI_MODEL=priorModel;});
const sealed=(manifest:unknown)=>[{id:'release',expertProfileId:'expert',manifest,manifestHash:manifestHash(manifest)}];
function manifest(){return {format:'persona-release-v2',expertProfileId:'expert',config:{ragEnabled:true},identity:{displayName:'Approved'},renderedPersona:{owner:'owner',visitor:'visitor'},sources:[],algorithms:{evidence:EXTRACTOR_VERSION,temporal:ACTIVE_TEMPORAL_READ_VERSION},runtime:currentRuntimePolicy(),greetings:{chat:null,widget:'Approved widget'}};}
test('capsule pins model while refusing future unsupported reader policies',()=>{
 process.env.OPENAI_MODEL='model-A';const policy=currentRuntimePolicy();process.env.OPENAI_MODEL='model-B';expect(policy.generation.model).toBe('model-A');expect(supportedRuntimePolicy(policy)).toBe(true);
 expect(supportedRuntimePolicy({...policy,retrieval:{...policy.retrieval,contract:'future'}})).toBe(false);
 expect(supportedRuntimePolicy({...policy,unrecognized:true})).toBe(false);
});
test('presentation keeps deliberate null greeting and exact widget override',async()=>{
 prisma.$queryRaw.mockResolvedValue(sealed(manifest()));expect(await resolveReleasedPresentation('expert')).toEqual({releaseId:'release',format:'persona-release-v2',displayName:'Approved',greeting:null,widgetGreeting:'Approved widget'});
});
test.each(['runtime','greetings'])('v2 missing %s fails closed even with valid hash',async key=>{
 const m:Record<string,unknown>=manifest();delete m[key];prisma.$queryRaw.mockResolvedValue(sealed(m));await expect(resolveReleasedPresentation('expert')).rejects.toThrow('invalid or unsupported');
});
test('legacy release and no-head compatibility remain explicit',async()=>{
 const m={...manifest(),format:'persona-release-v1',config:{ragEnabled:true,twinGreeting:'Legacy'}};prisma.$queryRaw.mockResolvedValue(sealed(m));expect(await resolveReleasedPresentation('expert')).toMatchObject({greeting:'Legacy',widgetGreeting:null});prisma.$queryRaw.mockResolvedValue([]);expect(await resolveReleasedPresentation('expert')).toBeNull();
});
test('parsed import snapshot refuses metadata authorship and hashes exact version',()=>{
 const item={id:'item',expertProfileId:'expert',sourceType:'pdf',sourceId:'file',sourceVersion:2,title:'Imported',content:'Parsed',metadata:{authorId:'spoof',audience:'private'}} as unknown as KnowledgeItem;
 const a=importedSnapshot(item,'owner')!;expect(a).toMatchObject({authorId:null,uploaderId:null,binaryHash:null,attribution:'unverified-import',ownerAtSubmission:'owner',snapshot:{metadata:{authorId:'spoof'}}});
 expect(importedSnapshot({...item,sourceVersion:3},'owner')!.snapshotHash).not.toBe(a.snapshotHash);expect(importedSnapshot({...item,content:'Changed'},'owner')!.contentHash).not.toBe(a.contentHash);
 expect(()=>importedSnapshot({...item,content:'é'.repeat(70000)},'owner')).toThrow('audit bound');
});
