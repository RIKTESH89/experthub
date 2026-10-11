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
