import { NextRequest } from 'next/server';
import prisma,{resetAllMocks} from '../mocks/prisma';
const engine=jest.fn(),guard=jest.fn();
jest.mock('@/lib/prisma',()=>({__esModule:true,default:prisma}));
jest.mock('@/lib/ai/chat-engine',()=>({runChatEngine:engine}));
jest.mock('@/lib/persona/persistence',()=>({...jest.requireActual('@/lib/persona/persistence'),authorizeWidgetPersistence:guard}));
import { POST } from '@/app/api/widget/chat/route';
const originalEnv=process.env;
beforeEach(()=>{
 process.env={...originalEnv,AUTH_SECRET:'local-synthetic-widget-only'};resetAllMocks();engine.mockReset();guard.mockReset().mockResolvedValue(undefined);
 prisma.widgetConfig.findUnique.mockResolvedValue({id:'config',expertProfileId:'expert',apiKey:'synthetic-key',isEnabled:true,allowedDomains:['allowed.synthetic.invalid'],freeQuestions:2,expertProfile:{id:'expert',userId:'owner'}});
 prisma.widgetSession.upsert.mockResolvedValue({id:'session',questionCount:0});prisma.widgetMessage.findMany.mockResolvedValue([]);
});
afterEach(()=>{process.env=originalEnv;});
const snapshot={scope:{expertProfileId:'expert',namespace:'ns',isOwner:false,allowedVectorIds:['vector']},ownerId:'owner',releaseId:'release',ragEnabled:true,sourceStateHash:'synthetic-hash'};
const wire=(text='Synthetic')=>`data: ${JSON.stringify({choices:[{delta:{content:text}}]})}\n\ndata: [DONE]\n\n`;
function prepare(text=wire()){engine.mockResolvedValue({stream:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(text));c.close();}}),sources:[],persistenceSnapshot:snapshot});}
function request(origin='https://allowed.synthetic.invalid'){return new NextRequest('http://local.invalid/api/widget/chat',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify({apiKey:'synthetic-key',visitorId:'requested',message:'Question'})});}
test('widget full answer and terminal appear after both SQL guard boundaries, with server-signed visitor identity',async()=>{
 prepare();const response=await POST(request());const output=await response.text();expect(output).toContain('"content":"Synthetic"');expect(output).toContain('data: [DONE]');
 expect(guard).toHaveBeenCalledTimes(2);expect(guard.mock.calls[0][2]).toMatchObject({sessionId:'session',configId:'config',origin:'https://allowed.synthetic.invalid'});
 expect(guard.mock.calls[0][2].visitorId).not.toBe('requested');expect(guard.mock.calls[1][3]).toBe(true);
 expect(guard.mock.invocationCallOrder[0]).toBeLessThan(prisma.widgetMessage.createMany.mock.invocationCallOrder[0]);expect(guard.mock.invocationCallOrder[1]).toBeGreaterThan(prisma.widgetSession.update.mock.invocationCallOrder[0]);
});
test.each([1,2])('widget guard failure at boundary %s emits no answer or successful DONE',async check=>{
 prepare();if(check===2)guard.mockResolvedValueOnce(undefined);guard.mockRejectedValueOnce(new Error('widget revoked'));
 const response=await POST(request());await expect(response.text()).rejects.toThrow('widget revoked');if(check===1)expect(prisma.widgetMessage.createMany).not.toHaveBeenCalled();
});
test('widget answer stays withheld before EOF and revocation cannot release its buffered text',async()=>{
 let provider!:ReadableStreamDefaultController<Uint8Array>;
 engine.mockResolvedValue({stream:new ReadableStream({start(c){provider=c;c.enqueue(new TextEncoder().encode(wire('PRIVATE_WITHHELD_SENTINEL').split('data: [DONE]')[0]));}}),sources:[],persistenceSnapshot:snapshot});
 const response=await POST(request());let settled=false;const read=response.body!.getReader().read().then(value=>{settled=true;return value;},error=>{settled=true;throw error;});
 await new Promise(r=>setTimeout(r,20));expect(settled).toBe(false);guard.mockRejectedValueOnce(new Error('widget revoked'));
 provider.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));provider.close();await expect(read).rejects.toThrow('widget revoked');expect(prisma.widgetMessage.createMany).not.toHaveBeenCalled();
});
test.each(['data: not-json\n\n','data: [DONE]\n\n','data: {"choices":[{"delta":{"content":"  "}}]}\n\ndata: [DONE]\n\n',wire()+'data: {}\n\n'])('malformed/empty/post-terminal widget data does not persist or complete successfully',async text=>{
 prepare(text);const response=await POST(request());await expect(response.text()).rejects.toThrow();expect(guard).not.toHaveBeenCalled();expect(prisma.widgetMessage.createMany).not.toHaveBeenCalled();
});
test('fragmented Unicode SSE frames reassemble before guarded persistence',async()=>{
 const bytes=new TextEncoder().encode(wire('नमस्ते'));
 engine.mockResolvedValue({stream:new ReadableStream({start(c){for(const byte of Array.from(bytes))c.enqueue(Uint8Array.of(byte));c.close();}}),sources:[],persistenceSnapshot:snapshot});
 const response=await POST(request());expect(await response.text()).toContain('नमस्ते');expect(guard).toHaveBeenCalledTimes(2);
});
test('disallowed exact-origin domain blocks the request before session/provider work',async()=>{
 prepare();const response=await POST(request('https://allowed.synthetic.invalid.evil.invalid'));expect(response.status).toBe(403);expect(engine).not.toHaveBeenCalled();expect(prisma.widgetSession.upsert).not.toHaveBeenCalled();
});
