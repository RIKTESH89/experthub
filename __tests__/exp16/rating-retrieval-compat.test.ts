import { retrieveIntentEvidence } from '@/lib/retrieval/retrieve';
import { acceptedEvidence } from '@/lib/ai/dialogue/citations';
import { savedRatingLinks } from '@/lib/corrections/rating';
import { retrieveEvidenceTrace, type EvidenceTrace } from '@/lib/graph/evidence-store';
import { retrieveTemporalEvidence } from '@/lib/graph/temporal/retriever';
import { vectorStore } from '@/lib/vector/client';

jest.mock('@/lib/prisma',()=>({__esModule:true,default:{}}));
jest.mock('@/lib/vector/client',()=>({vectorStore:{query:jest.fn(),keywordSearch:jest.fn()}}));
jest.mock('@/lib/vector/embeddings',()=>({generateEmbedding:jest.fn(async()=>[1])}));
jest.mock('@/lib/graph/evidence-store',()=>({retrieveEvidenceTrace:jest.fn(),retireEvidence:()=>{throw Error('Belief writes prohibited');}}));
jest.mock('@/lib/graph/temporal/retriever',()=>({retrieveTemporalEvidence:jest.fn()}));
jest.mock('@/lib/vector/indexer',()=>({plannedVectorIds:()=>{throw Error('Provider/indexing prohibited');}}));
jest.mock('@/lib/knowledge/outbox',()=>({enqueueLifecycleJob:()=>{throw Error('Source writes prohibited');}}));
const vectorId='expert:source:v1:chunk_0',date=new Date('2026-01-01');
const assertion:EvidenceTrace={assertionId:'assertion',revisionId:'revision',spanId:'span',itemId:'source',sourceVersion:1,contentHash:'hash',authorId:'owner',uploaderId:'owner',speakerId:'owner',speakerRole:'author',audience:'public',publishedAt:null,publicationTimeBasis:'unavailable',sourceUpdatedAt:date,ingestedAt:date,start:7,end:26,text:'I prefer JetStream.',chunkIds:[vectorId],subject:'owner',predicate:'prefer',object:'JetStream',kind:'explicit',endorsedByOwner:true,extractorVersion:'literal-preference-v1',weight:1};
const scope={expertProfileId:'expert',namespace:'expert',viewerId:'visitor',isOwner:false,allowedVectorIds:[vectorId]};
const expected={itemId:'source',sourceVersion:1,revisionId:'revision',spanId:'span',assertionId:'assertion',vectorId};
beforeEach(()=>{
 jest.mocked(vectorStore.query).mockResolvedValue([]);jest.mocked(vectorStore.keywordSearch).mockResolvedValue([]);
 jest.mocked(retrieveEvidenceTrace).mockResolvedValue([assertion]);
 jest.mocked(retrieveTemporalEvidence).mockResolvedValue({resolverVersion:'literal-validity-v1',mode:'current',validAt:date.toISOString(),knownAt:null,supersededStances:[],stances:[],relations:[],coverage:'selected currently authorized sources only'});
});
async function savedSources(){
 const bundle=await retrieveIntentEvidence(scope,'JetStream');
 // Real response provenance subset used by chat-engine before messages/route JSON persists it.
 const accepted=acceptedEvidence(bundle,['span'],'viewer');
 return {bundle,saved:JSON.parse(JSON.stringify(accepted.sources))};
}
test('actual default retrieval -> accepted response -> persisted JSON retains rating support without duplicated outer item/version pins',async()=>{
 const {bundle,saved}=await savedSources();expect(bundle.trace.selected).toBe(1);expect(bundle.evidenceTrace).toHaveLength(1);
 expect(saved[0].metadata.source).toBe('authorized-temporal-neighbor');expect(saved[0].metadata).not.toHaveProperty('knowledgeItemId');expect(saved[0].metadata).not.toHaveProperty('sourceVersion');
 expect(savedRatingLinks(saved,'expert')).toEqual([expected]);
});
test('actual semantic search caller path continues to accept agreeing explicit source pins',async()=>{
 jest.mocked(vectorStore.query).mockResolvedValue([{id:vectorId,content:assertion.text,score:1,metadata:{expertProfileId:'expert',knowledgeItemId:'source',sourceVersion:1}}]);
 const {saved}=await savedSources();expect(saved[0].metadata.knowledgeItemId).toBe('source');expect(savedRatingLinks(saved,'expert')).toEqual([expected]);
});
test.each([{knowledgeItemId:'other'},{sourceVersion:2},{knowledgeItemId:null},{sourceVersion:null}])('caller-path persisted trace still rejects contradictory/malformed explicit outer pins %j',async pins=>{
 const {saved}=await savedSources();Object.assign(saved[0].metadata,pins);expect(savedRatingLinks(saved,'expert')).toEqual([]);
});
test('caller-path fallback never links owner-only, foreign-tenant, unrelated chunk or incomplete trace provenance',async()=>{
 const {saved}=await savedSources();
 for(const mutation of [(m:Record<string,unknown>)=>{m.generationAudience='owner';},(m:Record<string,unknown>)=>{m.expertProfileId='foreign';},(m:Record<string,unknown>)=>{m.vectorId='unrelated';},(m:Record<string,unknown>)=>{m.evidenceTrace=[{...assertion,spanId:''}];}]){
  const changed=structuredClone(saved);mutation(changed[0].metadata);expect(savedRatingLinks(changed,'expert')).toEqual([]);
 }
});
