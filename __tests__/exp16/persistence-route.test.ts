import prisma, { resetAllMocks } from '../mocks/prisma';
import { mockAuth, mockSession } from '../mocks/auth';
import { createPOST } from '../helpers/request';
import { syntheticPaidPeriod } from '../helpers/paid-period';
const engine=jest.fn(), guard=jest.fn(), memories=jest.fn();
jest.mock('@/lib/prisma',()=>({__esModule:true,default:prisma}));
jest.mock('@/lib/auth',()=>({auth:mockAuth}));
jest.mock('@/lib/ai/chat-engine',()=>({runChatEngine:engine}));
jest.mock('@/lib/persona/persistence',()=>({authorizeChatPersistence:guard}));
jest.mock('@/lib/ai/memory-extractor',()=>({extractMemories:memories}));
import { POST } from '@/app/api/chat/sessions/[sessionId]/messages/route';
const snapshot={scope:{expertProfileId:'expert',namespace:'ns',viewerId:'subscriber-id-1',isOwner:false,allowedVectorIds:['vector']},ownerId:'owner',releaseId:'release',ragEnabled:true};
beforeEach(()=>{
 resetAllMocks();mockAuth.mockResolvedValue(mockSession.subscriber);
 engine.mockReset();guard.mockReset().mockResolvedValue(undefined);memories.mockReset().mockResolvedValue([]);
 prisma.chatSession.findUnique.mockResolvedValue({id:'session',subscriberId:mockSession.subscriber.user.id,expertProfileId:'expert',isTrial:false,expertProfile:{userId:'owner'},messages:[]});
 prisma.expertSubscription.findUnique.mockResolvedValue({status:'ACTIVE',tier:'PREMIUM',...syntheticPaidPeriod});
 prisma.chatMessage.create.mockResolvedValue({id:'answer'});prisma.chatSession.update.mockResolvedValue({});
});
function prepare(wire='data: {"choices":[{"delta":{"content":"Synthetic"}}]}\n\ndata: [DONE]\n\n'){
 engine.mockResolvedValue({stream:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(wire));c.close();}}),sources:[],thinkingSteps:[],persistenceSnapshot:snapshot});
}
const send=()=>POST(createPOST('/api/chat/sessions/session/messages',{content:'Question'}),{params:Promise.resolve({sessionId:'session'})});
test('route passes server receipt to transaction guard before writes and before commit, then emits durable message receipt',async()=>{
 prepare();const response=await send();const wire=await response.text();
 expect(guard).toHaveBeenCalledTimes(2);expect(guard).toHaveBeenNthCalledWith(1,prisma,snapshot,'session',mockSession.subscriber.user.id,mockSession.subscriber.user.role);
 expect(guard.mock.invocationCallOrder[0]).toBeLessThan(prisma.chatMessage.create.mock.invocationCallOrder[1]);
 expect(guard.mock.invocationCallOrder[1]).toBeGreaterThan(prisma.chatSession.update.mock.invocationCallOrder[0]);
 expect(wire).toContain('"messageId":"answer"');expect(wire).not.toContain('persistenceSnapshot');
});
test.each([1,2])('route guard failure at check %s closes stream without success receipt or background memory',async check=>{
 prepare();if(check===2)guard.mockResolvedValueOnce(undefined);guard.mockRejectedValueOnce(new Error('release or permission changed'));
 const response=await send();await expect(response.text()).rejects.toThrow('release or permission changed');
 expect(memories).not.toHaveBeenCalled();expect(prisma.twinInteraction.create).not.toHaveBeenCalled();
 if(check===1)expect(prisma.chatMessage.create).toHaveBeenCalledTimes(1); // submitted question only
});
test('malformed/unterminated provider stream never reaches the persistence guard',async()=>{
 prepare('data: {"choices":[{"delta":{"content":"Synthetic"}}]}\n\n');
 const response=await send();await expect(response.text()).rejects.toThrow('without DONE');expect(guard).not.toHaveBeenCalled();
});
test('content received before EOF stays withheld when release changes at persistence',async()=>{
 let provider!:ReadableStreamDefaultController<Uint8Array>;
 engine.mockResolvedValue({stream:new ReadableStream({start(c){provider=c;c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"PRIVATE_WITHHELD_SENTINEL"}}]}\n\n'));}}),sources:[],thinkingSteps:[],persistenceSnapshot:snapshot});
 const response=await send(),reader=response.body!.getReader();let settled=false;const read=reader.read().then(value=>{settled=true;return value;},error=>{settled=true;throw error;});
 await new Promise(r=>setTimeout(r,20));expect(settled).toBe(false);guard.mockRejectedValueOnce(new Error('source revoked before commit'));
 provider.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));provider.close();await expect(read).rejects.toThrow('source revoked before commit');
 expect(prisma.chatMessage.create).toHaveBeenCalledTimes(1);
});
test.each(['','   '])('empty/whitespace completed answer %p never reaches guard or terminal success',async text=>{
 prepare(`data: ${JSON.stringify({choices:[{delta:{content:text}}]})}\n\ndata: [DONE]\n\n`);const response=await send();await expect(response.text()).rejects.toThrow('empty answer');expect(guard).not.toHaveBeenCalled();
});
test('synthetic first-answer latency includes provider completion and both guarded SQL checks',async()=>{
 const started=performance.now();let providerDoneMs=0,lastGuardMs=0;
 engine.mockResolvedValue({stream:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Synthetic latency answer"}}]}\n\n'));setTimeout(()=>{providerDoneMs=performance.now()-started;c.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));c.close();},40);}}),sources:[],thinkingSteps:[],persistenceSnapshot:snapshot});
 guard.mockImplementation(async()=>{await new Promise(r=>setTimeout(r,20));lastGuardMs=performance.now()-started;});
 const response=await send();const first=await response.body!.getReader().read();const firstAnswerMs=performance.now()-started;
 expect(new TextDecoder().decode(first.value)).toContain('Synthetic latency answer');expect(firstAnswerMs).toBeGreaterThanOrEqual(lastGuardMs);expect(lastGuardMs).toBeGreaterThan(providerDoneMs);
 const {writeFileSync}=await import('fs');writeFileSync('audit/exp16-acceptance-20261011/synthetic-delivery-latency.json',JSON.stringify({mode:'mocked-route-buffering',providerDoneMs,lastGuardMs,firstAnswerMs,configuredProviderDelayMs:40,configuredSqlCheckDelayMs:20,sqlChecks:2,providerCalls:0,humanRatings:0,interpretation:'One in-process synthetic sample; verifies first answer waits for terminal provider data and SQL. Not network/model/production latency.'},null,2)+'\n');
});
