import { NextRequest } from 'next/server';
import prisma,{resetAllMocks} from '../../__tests__/mocks/prisma';
import {mockAuth,mockSession} from '../../__tests__/mocks/auth';
import {syntheticPaidPeriod} from '../../__tests__/helpers/paid-period';
const engine=jest.fn(),subscriberGuard=jest.fn(),widgetGuard=jest.fn(),memory=jest.fn();
jest.mock('@/lib/prisma',()=>({__esModule:true,default:prisma}));
jest.mock('@/lib/auth',()=>({auth:mockAuth}));
jest.mock('@/lib/ai/chat-engine',()=>({runChatEngine:engine}));
jest.mock('@/lib/ai/memory-extractor',()=>({extractMemories:memory}));
jest.mock('@/lib/ai/widget-identity',()=>({widgetIdentity:()=>({visitorId:'synthetic-visitor',token:'synthetic-token'})}));
jest.mock('@/lib/rate-limit',()=>({rateLimit:()=>({allowed:true})}));
jest.mock('@/lib/persona/persistence',()=>({authorizeChatPersistence:subscriberGuard,authorizeWidgetPersistence:widgetGuard,widgetAccessHash:()=> 'config-hash',widgetOriginAllowed:()=>true}));
import {POST as subscriberPost} from '@/app/api/chat/sessions/[sessionId]/messages/route';
import {POST as widgetPost} from '@/app/api/widget/chat/route';
const sources=[{content:'PRIVATE_CITATION_SENTINEL',score:1,metadata:{title:'Private citation',vectorId:'vector',expertProfileId:'expert'}}];
const wire='data: {"choices":[{"delta":{"content":"PRIVATE_ANSWER_SENTINEL"}}]}\n\ndata: [DONE]\n\n';
const deferred=<T>()=>{let resolve!:(value:T)=>void,reject!:(reason:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
beforeEach(()=>{
 resetAllMocks();engine.mockReset();subscriberGuard.mockReset().mockResolvedValue(undefined);widgetGuard.mockReset().mockResolvedValue(undefined);memory.mockReset().mockResolvedValue([]);
 prisma.$transaction.mockReset().mockImplementation(async callback=>callback(prisma));
 mockAuth.mockResolvedValue(mockSession.subscriber);
 prisma.chatSession.findUnique.mockResolvedValue({id:'session',subscriberId:mockSession.subscriber.user.id,expertProfileId:'expert',isTrial:false,expertProfile:{userId:'owner'},messages:[]});
 prisma.expertSubscription.findUnique.mockResolvedValue({status:'ACTIVE',tier:'PREMIUM',...syntheticPaidPeriod});
 prisma.chatMessage.create.mockResolvedValue({id:'answer'});prisma.chatSession.update.mockResolvedValue({});
 prisma.widgetConfig.findUnique.mockResolvedValue({id:'widget',isEnabled:true,freeQuestions:10,allowedDomains:[],expertProfile:{id:'expert',userId:'owner'}});
 prisma.widgetSession.upsert.mockResolvedValue({id:'widget-session',questionCount:0});prisma.widgetSession.update.mockResolvedValue({});prisma.widgetMessage.findMany.mockResolvedValue([]);
});
const prepare=(text=wire)=>engine.mockResolvedValue({stream:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(text));c.close();}}),sources,thinkingSteps:[],persistenceSnapshot:{serverOnly:true}});
async function send(kind:'subscriber'|'widget',signal?:AbortSignal){
 const request=new NextRequest('http://local.invalid/api/'+kind,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(kind==='subscriber'?{content:'Question'}:{apiKey:'synthetic',visitorId:'requested',message:'Question'}),signal});
 return kind==='subscriber'?subscriberPost(request,{params:Promise.resolve({sessionId:'session'})}):widgetPost(request);
}
test.each(['subscriber','widget'] as const)('%s withholds answer and citations until simulated COMMIT resolves',async kind=>{
 prepare();const ready=deferred<void>(),commit=deferred<void>();let calls=0;
 prisma.$transaction.mockImplementation(async callback=>{const result=await callback(prisma);if(++calls===1){ready.resolve();await commit.promise;}return result;});
 const response=await send(kind),reader=response.body!.getReader();let emitted=false;
 const first=reader.read().then(value=>{emitted=true;return value;});await ready.promise;
 await Promise.resolve();expect(emitted).toBe(false);expect(kind==='subscriber'?subscriberGuard:widgetGuard).toHaveBeenCalledTimes(2);
 commit.resolve();const firstValue=await first;expect(new TextDecoder().decode(firstValue.value)).toContain('PRIVATE_ANSWER_SENTINEL');
 let rest='';for(;;){const chunk=await reader.read();if(chunk.done)break;rest+=new TextDecoder().decode(chunk.value);}
 if(kind==='subscriber'){expect(rest).toContain('"done":true');expect(rest).toContain('PRIVATE_CITATION_SENTINEL');}else expect(rest).toContain('[DONE]');
});
test.each(['subscriber','widget'] as const)('%s rejected simulated COMMIT emits no buffered content or success',async kind=>{
 prepare();const ready=deferred<void>(),commit=deferred<void>();
 prisma.$transaction.mockImplementation(async callback=>{const result=await callback(prisma);ready.resolve();await commit.promise;return result;});
 const response=await send(kind),reader=response.body!.getReader();let bytes='';
 const first=reader.read().then(v=>{bytes+=new TextDecoder().decode(v.value);return v;});await ready.promise;commit.reject(new Error('SIMULATED_COMMIT_FAILURE'));
 await expect(first).rejects.toThrow('SIMULATED_COMMIT_FAILURE');expect(bytes).toBe('');expect(memory).not.toHaveBeenCalled();
});
test.each(['subscriber','widget'] as const)('%s disconnect while simulated COMMIT is pending emits no risky bytes',async kind=>{
 prepare();const ready=deferred<void>(),commit=deferred<void>(),abort=new AbortController();
 prisma.$transaction.mockImplementation(async callback=>{const result=await callback(prisma);ready.resolve();await commit.promise;return result;});
 const response=await send(kind,abort.signal),reader=response.body!.getReader();let bytes='';
 const first=reader.read().then(v=>{bytes+=new TextDecoder().decode(v.value);return v;});await ready.promise;abort.abort();commit.resolve();
 await expect(first).rejects.toBeDefined();expect(bytes).toBe('');expect(memory).not.toHaveBeenCalled();
});
test.each(['subscriber','widget'] as const)('%s rejects provider errors and trailing frames before guard/answer release',async kind=>{
 for(const tail of ['data: {"error":{"message":"PRIVATE_UPSTREAM_ERROR"}}\n\n','data: [DONE]\n\ndata: {"choices":[{"delta":{"content":"TRAILING_PRIVATE"}}]}\n\n']){
  (kind==='subscriber'?subscriberGuard:widgetGuard).mockClear();prepare('data: {"choices":[{"delta":{"content":"PRIVATE_ANSWER_SENTINEL"}}]}\n\n'+tail);
  const response=await send(kind),reader=response.body!.getReader();let bytes='';
  await expect(reader.read().then(v=>{bytes+=new TextDecoder().decode(v.value);})).rejects.toThrow();
  expect(bytes).toBe('');expect(kind==='subscriber'?subscriberGuard:widgetGuard).not.toHaveBeenCalled();
 }
});
test('subscriber progress cannot expose a selected source title before a later failed guard',async()=>{
 prepare();const current=await engine.getMockImplementation()!();
 engine.mockResolvedValue({...current,thinkingSteps:['Considering: "PRIVATE_TITLE_SENTINEL"']});
 subscriberGuard.mockRejectedValueOnce(new Error('source changed'));
 const response=await send('subscriber'),reader=response.body!.getReader();
 const first=new TextDecoder().decode((await reader.read()).value);
 expect(first).toContain('Reviewing source evidence');expect(first).not.toContain('PRIVATE_TITLE_SENTINEL');
 await expect(reader.read()).rejects.toThrow('source changed');
});
