import { NextRequest } from 'next/server';
import prisma, { resetAllMocks } from '../mocks/prisma';
jest.mock('@/lib/prisma',()=>({__esModule:true,default:prisma}));
jest.mock('@/lib/ai/chat-engine',()=>({runChatEngine:jest.fn()}));
const localRetrieve=jest.fn(),revalidate=jest.fn();
jest.mock('@/lib/ai/dialogue/structured/local-retrieval',()=>({retrieveLocalEvaluationEvidence:localRetrieve}));
jest.mock('@/lib/ai/dialogue/revalidate',()=>({revalidateDialogueEvidence:revalidate}));
import { runChatEngine } from '@/lib/ai/chat-engine';
import { POST } from '@/app/api/widget/chat/route';
import { baseBundle, draft } from '../../scripts/exp15-exp17/fixtures';
import { fixtureAdapters } from '../../scripts/exp15-exp17/runner';
const actualEngine=jest.requireActual('@/lib/ai/chat-engine').runChatEngine as typeof runChatEngine;
const saved=process.env;
beforeEach(()=>{
 process.env={...saved,NODE_ENV:'test',AUTH_SECRET:'widget-local-synthetic-signing',EXP15_EXP17_LOCAL_EVALUATION:'1'};delete process.env.VERCEL;delete process.env.VERCEL_ENV;delete process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED;
 resetAllMocks();(runChatEngine as jest.Mock).mockReset();localRetrieve.mockReset().mockResolvedValue(baseBundle());revalidate.mockReset().mockImplementation((_scope,bundle)=>Promise.resolve(bundle));
 prisma.widgetConfig.findUnique.mockResolvedValue({id:'synthetic-widget',expertProfileId:'profile-synthetic',apiKey:'synthetic-widget-key',allowedDomains:[],isEnabled:true,freeQuestions:10,expertProfile:{id:'profile-synthetic',userId:'expert-synthetic'}});
 prisma.widgetSession.upsert.mockResolvedValue({id:'synthetic-session',questionCount:0});prisma.widgetMessage.findMany.mockResolvedValue([]);
 prisma.expertProfile.findUnique.mockResolvedValue({id:'profile-synthetic',userId:'expert-synthetic',vectorNamespace:'synthetic-ns',ragEnabled:true});prisma.knowledgeItem.findMany.mockResolvedValue([]);
 global.fetch=jest.fn().mockRejectedValue(new Error('network forbidden'));
 jest.spyOn(console,'error').mockImplementation(()=>{});
});
afterEach(()=>{process.env=saved;jest.restoreAllMocks();});
const request=(signal:AbortSignal)=>new NextRequest('http://local.invalid/api/widget/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({apiKey:'synthetic-widget-key',visitorId:'requested-visitor',message:'Explain recursion'}),signal});
test('widget forwards cancellation through actual structured engine and emits/persists no draft',async()=>{
 const c=new AbortController(),p=fixtureAdapters({query:'Explain recursion',draft:draft('PRIVATE_DRAFT_SENTINEL'),expected:'released-synthetic-evaluation',dimensions:[]},{generation:[],verification:[]});let observed:AbortSignal|undefined;
 p.generator.generate=async r=>{observed=r.signal;c.abort();return new Promise<never>(()=>{});};
 (runChatEngine as jest.Mock).mockImplementation(options=>actualEngine({...options,structuredEvaluationAdapters:{generator:p.generator,verifier:p.verifier}}));
 const response=await POST(request(c.signal));expect(observed?.aborted).toBe(true);expect(response.status).toBe(500);expect(await response.text()).not.toContain('PRIVATE_DRAFT_SENTINEL');
 expect(prisma.widgetMessage.createMany).not.toHaveBeenCalled();expect(prisma.widgetSession.update).not.toHaveBeenCalled();expect(global.fetch).not.toHaveBeenCalled();
});
test('frozen default engine receives widget signal and aborts the synthetic provider body before delivery',async()=>{
 delete process.env.EXP15_EXP17_LOCAL_EVALUATION;const c=new AbortController();let bodyCancelled=false,providerSignal:AbortSignal|undefined;
 global.fetch=jest.fn().mockImplementation(async(_url,options)=>{providerSignal=options.signal;c.abort();return{ok:true,body:new ReadableStream({cancel(){bodyCancelled=true;}})};});
 (runChatEngine as jest.Mock).mockImplementation(options=>actualEngine(options));
 const response=await POST(request(c.signal));expect(response.status).toBe(500);expect(providerSignal?.aborted).toBe(true);expect(bodyCancelled).toBe(true);
 expect(prisma.widgetMessage.createMany).not.toHaveBeenCalled();expect(prisma.widgetSession.update).not.toHaveBeenCalled();
});
test('widget streaming disconnect cancels the upstream body and skips completion persistence',async()=>{
 const c=new AbortController();let cancelled=false;
 (runChatEngine as jest.Mock).mockResolvedValue({stream:new ReadableStream({cancel(){cancelled=true;}}),sources:[]});
 const response=await POST(request(c.signal));c.abort();await expect(response.text()).rejects.toBeDefined();
 expect(cancelled).toBe(true);expect(prisma.widgetMessage.createMany).not.toHaveBeenCalled();expect(prisma.widgetSession.update).not.toHaveBeenCalled();
});
