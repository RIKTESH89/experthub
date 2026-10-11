import { createHash } from 'crypto';
import { writeFileSync } from 'fs';
const vector={query:jest.fn(),keywordSearch:jest.fn()},embedding=jest.fn(),readAssertions=jest.fn(),readTemporal=jest.fn();
jest.mock('@/lib/vector/client',()=>({vectorStore:vector}));
jest.mock('@/lib/vector/embeddings',()=>({generateEmbedding:embedding}));
jest.mock('@/lib/graph/evidence-store',()=>({retrieveEvidenceTrace:readAssertions}));
jest.mock('@/lib/graph/temporal/retriever',()=>({retrieveTemporalEvidence:readTemporal}));
import { retrieveIntentEvidence } from '@/lib/retrieval/retrieve';
import { retrieveContext as frozenPhase0 } from '../../audit/phase0/frozen/retriever';
import { extractTemporal, temporalIdentity, TEMPORAL_EXTRACTOR_VERSION } from '@/lib/graph/temporal/extractor';
import { replayNegativePreference } from '@/lib/graph/temporal/read-projection';
import { resolveTimeline, type TemporalQuery } from '@/lib/graph/temporal/timeline';
import { TEMPORAL_SELECTION_VERSION } from '@/lib/graph/temporal/read-policy';
import { RETRIEVAL_BUDGET } from '@/lib/retrieval/intent';
import type { TemporalStanceTrace } from '@/lib/graph/temporal/retriever';
import type { RetrievalScope } from '@/lib/knowledge/access';
const at=new Date('2026-10-11T00:00:00Z');
type Source={id:string;text:string;tenant:string;allowed:boolean;revisionId:string;chunks:string[];row?:TemporalStanceTrace};
function source(id:string,text:string,extra:Partial<Source>={}):Source {
 const revisionId=`r-${id}`,spanId=`s-${id}`,chunks=[`c-${id}`],v=extractTemporal(text,'owner','owner')[0];
 let row:TemporalStanceTrace|undefined;
 if(v) row={...v,id:temporalIdentity(revisionId,spanId,v),spanId,revisionId,itemId:id,contentHash:createHash('sha256').update(text).digest('hex'),sourceVersion:1,authorId:'owner',uploaderId:'owner',audience:'public',publishedAt:null,publicationTimeBasis:'unavailable',sourceUpdatedAt:at,ingestedAt:at,recordedAt:at,start:v.start,end:v.end,text:v.text,chunkIds:chunks,speaker:'owner',extractorVersion:TEMPORAL_EXTRACTOR_VERSION,validFrom:v.validFrom?new Date(v.validFrom):null,validUntil:v.validUntil?new Date(v.validUntil):null,situation:v.decisionType?v.context:null,chosenAction:v.decisionType?v.action:null,documentedReasons:v.decisionType?v.reasons:null};
 return {id,text,tenant:'tenant',allowed:true,revisionId,chunks,row,...extra};
}
const past=source('past','From 2023-01-01 until 2025-01-01, In warehousing, I prefer NacreStore.'),present=source('present','From 2025-01-01, In warehousing, I do not prefer NacreStore.');
const yes=source('yes','In warehousing, For startup, I prefer NacreStore because simple installation; constraints: two operators; exceptions: audited systems; alternatives: paper logs; tradeoff: recovery time.');
const no=source('no','In warehousing, For startup, I do not prefer NacreStore because upgrade toil; constraints: two operators; exceptions: disposable pilots; alternatives: paper logs; tradeoff: recovery time.');
const independent=source('independent','In warehousing, For Fortune500, I chose AuroraAPI because global availability; constraints: ten operators; exceptions: regional pilots.');
const late=source('late','I prefer '+Array.from({length:30},(_,i)=>`topic${String.fromCharCode(97+i%26)}${String.fromCharCode(97+Math.floor(i/26))}`).join(' ')+' CobaltRunner.');
const held=source('held-doc','In biomedicine, I prefer HIDDEN_HELDOUT_SENTINEL.');held.chunks=['held-chunk-a','held-chunk-b'];if(held.row)held.row.chunkIds=held.chunks;
const secret=source('premium','In warehousing, I prefer PREMIUM_REVOKED_SENTINEL.',{allowed:false});
const foreign=source('foreign','In warehousing, I prefer FOREIGN_TENANT_SENTINEL.',{tenant:'foreign'});
const biography=source('bio','I was born in an unknown place.');
const semantic=source('semantic','For a single-threaded embedded datastore, I prefer NacreStore because low operational overhead.');
interface Case {id:string;question:string;sources:Source[];gold:string[];observed:string[];query?:TemporalQuery;scopeIds?:string[];limit?:string}
const cases:Case[]=[
 {id:'current-time',question:'Current stance on NacreStore',sources:[past,present],gold:['present'],observed:['present']},
 {id:'asof-time',question:'As of 2024-01-01, stance on NacreStore',sources:[past,present],gold:['past'],observed:['past']},
 {id:'recorded-knownat',question:'As of 2024-01-01, stance on NacreStore',sources:[past],gold:[],observed:[],query:{mode:'as-of',validAt:new Date('2024-01-01'),knownAt:new Date('2024-01-01')}},
 {id:'decision-pair',question:'Should I choose NacreStore for startup?',sources:[yes,no],gold:['yes','no'],observed:['yes','no']},
 {id:'late-rare-name',question:'What is the stance on CobaltRunner?',sources:[late],gold:['late'],observed:['late']},
 {id:'unknown-topic',question:'What is the stance on StarMoss?',sources:[yes],gold:[],observed:[]},
 {id:'whole-source-withheld-neighbors',question:'What is the stance on HIDDEN_HELDOUT_SENTINEL?',sources:[held,yes],scopeIds:yes.chunks,gold:[],observed:[]},
 {id:'warm-audience-revocation',question:'What is the stance on PREMIUM_REVOKED_SENTINEL?',sources:[secret,yes],gold:[],observed:[]},
 {id:'cross-tenant-neighbor',question:'What is the stance on FOREIGN_TENANT_SENTINEL?',sources:[foreign,yes],gold:[],observed:[]},
 {id:'conversation',question:'Hello!',sources:[yes],gold:[],observed:[]},
 {id:'biography-unavailable',question:'Tell me your biography',sources:[biography],gold:[],observed:[],limit:'Routing exists; biography extraction is unavailable and must remain UNKNOWN.'},
 {id:'semantic-only-paraphrase',question:'Should I use a tiny in-process database?',sources:[semantic],gold:['semantic'],observed:[],limit:'A high-score injected semantic hit cannot seed a stance without a lexical/source-field anchor. Developer treats embedded datastore/in-process database as paraphrases; independent semantic adjudication remains unrun.'},
 {id:'different-context-neighbor',question:'Should I choose NacreStore for startup?',sources:[yes,independent],gold:['yes'],observed:['yes','independent'],limit:'Same-domain expansion returns a separately documented Fortune500 case. Conservative developer gold treats it as extra context; human relevance adjudication is needed, not a demonstrated unsafe answer.'},
];
const traces:unknown[]=[];
beforeAll(()=>{delete process.env.OPENAI_API_KEY;global.fetch=async()=>{throw Error('Provider calls forbidden in synthetic breadth audit');};});
beforeEach(()=>{jest.clearAllMocks();embedding.mockResolvedValue([1]);readAssertions.mockResolvedValue([]);});
test.each(cases)('$id records actual frozen/intent-reader behavior at equal bounded evidence budget',async c=>{
 const scope:RetrievalScope={expertProfileId:'tenant',namespace:'tenant-ns',isOwner:false,allowedVectorIds:c.scopeIds||c.sources.flatMap(s=>s.chunks),temporalReadVersion:TEMPORAL_SELECTION_VERSION};
 const hits=c.sources.map(s=>({id:s.chunks[0],content:s.text,score:0.9,metadata:{expertProfileId:s.tenant,sourceId:s.id}}));
 vector.query.mockResolvedValue(hits);vector.keywordSearch.mockResolvedValue([]);
 readTemporal.mockImplementation((s:RetrievalScope,selected:{metadata:{vectorId:string}}[],query:TemporalQuery)=>{
  const ids=new Set(selected.map(r=>r.metadata.vectorId));
  return Promise.resolve({...resolveTimeline(c.sources.filter(row=>row.allowed&&row.tenant===s.expertProfileId&&row.chunks.some(id=>ids.has(id)&&s.allowedVectorIds.includes(id))).flatMap(s=>s.row?[replayNegativePreference(s.row)]:[]),query),readVersion:TEMPORAL_SELECTION_VERSION});
 });
 const oldStart=performance.now(),old=await frozenPhase0(scope.namespace,c.question,5),oldMs=performance.now()-oldStart;
 let oldBytes=0;const bounded=old.filter(r=>{const bytes=Buffer.byteLength(r.content);if(oldBytes+bytes>RETRIEVAL_BUDGET.tokens)return false;oldBytes+=bytes;return true;});
 const current=await retrieveIntentEvidence(scope,c.question,c.query||(/^\s*As of\b/i.test(c.question)?undefined:{mode:'current',now:at}));
 const selected=Array.from(new Set(current.temporalTrace.stances.map(row=>row.itemId))).sort();
 expect(selected).toEqual([...c.observed].sort());expect(current.trace.tokenUpperBound).toBeLessThanOrEqual(RETRIEVAL_BUDGET.tokens);expect(current.trace.hops).toBeLessThanOrEqual(1);
 if(c.id==='decision-pair'){expect(current.temporalTrace.stances.every(s=>s.constraints==='two operators')).toBe(true);expect(current.prompt).toContain('audited systems');expect(current.prompt).toContain('disposable pilots');expect(current.temporalTrace.relations.some(r=>r.type==='contradiction')).toBe(true);}
 if(c.id==='whole-source-withheld-neighbors')expect(JSON.stringify(current)).not.toContain('HIDDEN_HELDOUT_SENTINEL');
 if(c.id==='warm-audience-revocation')expect(JSON.stringify(current)).not.toContain('PREMIUM_REVOKED_SENTINEL');
 if(c.id==='cross-tenant-neighbor')expect(JSON.stringify(current)).not.toContain('FOREIGN_TENANT_SENTINEL');
 const stats=(ids:string[])=>({selectedSourceIds:ids,recall:c.gold.length?ids.filter(id=>c.gold.includes(id)).length/c.gold.length:null,precision:ids.length?ids.filter(id=>c.gold.includes(id)).length/ids.length:null,exactSetMatch:[...ids].sort().join('|')===[...c.gold].sort().join('|')});
 traces.push({caseId:c.id,question:c.question,intent:current.plan.intent,goldSourceIds:c.gold,baseline:{...stats(Array.from(new Set(bounded.map(r=>String(r.metadata.sourceId))))),contextBytes:oldBytes,localMs:oldMs},candidate:{...stats(selected),trace:current.trace,gaps:current.gaps,stances:current.temporalTrace.stances,relations:current.temporalTrace.relations},knownLimit:c.limit||null});
});
afterAll(()=>{
 const input=JSON.stringify(cases),report={candidateCommit:'43b784a4e71fc985ae178e1d7ab764f0ff4a85d1',fixtureSha256:createHash('sha256').update(input).digest('hex'),method:'13 developer-authored synthetic breadth cases. Actual frozen Phase0 retriever and current intent orchestration, identical4096byte cap, injected same semantic hits; source/live permission stores are mocked. Temporal extraction/replay/timeline/selector execute. No model, SQL, human review or external calls. Whole-source held-doc and both neighboring chunks are absent from permitted candidate corpus. Semantic-only hit relevance is an injected oracle, not a calibrated embedding claim. Per-case provisional source-set precision/recall only; no general held-out score.',traces};
 writeFileSync('audit/exp14-acceptance-breadth-20261011/retrieval-traces.json',JSON.stringify(report,null,2)+'\n');
});
