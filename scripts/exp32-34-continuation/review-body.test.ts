import { NextRequest } from 'next/server';
let mockRole='ADMIN';let mockSession:any={user:{id:'admin',role:'ADMIN'}};
jest.mock('@/lib/auth',()=>({auth:async()=>mockSession}));
jest.mock('@/lib/prisma',()=>({__esModule:true,default:{user:{findUnique:jest.fn(async()=>({id:'admin',role:mockRole,isActive:true,isBanned:false}))}}}));
import { POST } from '../../src/app/api/admin/billing/review/route';
const env={BILLING_REVIEW_ENABLED:'true',BILLING_REVIEW_SECRET:'synthetic-body-review-signing-not-real',NEXT_PUBLIC_APP_URL:'https://app.example.invalid'};
let saved:NodeJS.ProcessEnv;
beforeEach(()=>{saved={...process.env};Object.assign(process.env,env);mockRole='ADMIN';mockSession={user:{id:'admin',role:'ADMIN'}};});
afterEach(()=>{for(const key of Object.keys(env))if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];});
function request(stream:ReadableStream<Uint8Array>,signal?:AbortSignal) {return new NextRequest('https://app.example.invalid/api/admin/billing/review',{method:'POST',headers:{origin:'https://app.example.invalid'},body:stream,duplex:'half',signal} as any);}
test('revoked ADMIN is rejected before reading any untrusted body bytes',async()=>{
 mockRole='SUBSCRIBER';const req=request(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{}'));c.close();}}));const text=jest.spyOn(req,'text');const reader=jest.spyOn(req.body!,'getReader');
 expect((await POST(req)).status).toBe(403);expect(text).not.toHaveBeenCalled();expect(reader).not.toHaveBeenCalled();
});
test('unauthenticated body is not consumed',async()=>{
 mockSession=null;const req=request(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{}'));c.close();}}));const text=jest.spyOn(req,'text');expect((await POST(req)).status).toBe(401);expect(text).not.toHaveBeenCalled();
});
test('chunked oversized body cancels at byte cap instead of reading the full body',async()=>{
 let pulls=0;const cancel=jest.fn();const req=request(new ReadableStream({pull(c){pulls++;c.enqueue(new Uint8Array(20000));if(pulls===5)c.close();},cancel},{highWaterMark:0}));
 expect((await POST(req)).status).toBe(413);expect(pulls).toBeLessThanOrEqual(2);expect(cancel).toHaveBeenCalled();
});
test('request abort cancels body read safely',async()=>{
 const controller=new AbortController(),cancel=jest.fn();const req=request(new ReadableStream({cancel},{highWaterMark:0}),controller.signal);
 const pending=POST(req);setTimeout(()=>controller.abort(),10);expect((await pending).status).toBe(400);expect(cancel).toHaveBeenCalled();
},1000);
test('advertised oversized body is cancelled unread after authorization',async()=>{
 const cancel=jest.fn();const req=new NextRequest('https://app.example.invalid/api/admin/billing/review',{method:'POST',headers:{origin:'https://app.example.invalid','content-length':'99999999'},body:new ReadableStream({cancel},{highWaterMark:0}),duplex:'half'} as any);
 const reader=jest.spyOn(req.body!,'getReader');expect((await POST(req)).status).toBe(413);expect(reader).not.toHaveBeenCalled();expect(cancel).toHaveBeenCalled();
});
test('byte limit measures multibyte UTF-8 bytes and rejects before JSON parsing',async()=>{
 const cancel=jest.fn();const req=request(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('é'.repeat(17000)));},cancel},{highWaterMark:0}));expect((await POST(req)).status).toBe(413);expect(cancel).toHaveBeenCalled();
});
test('slow authorized body is bounded and cancelled on timeout',async()=>{
 jest.useFakeTimers();const cancel=jest.fn();const req=request(new ReadableStream({cancel},{highWaterMark:0}));
 try{const pending=POST(req);await jest.advanceTimersByTimeAsync(5001);expect((await pending).status).toBe(408);expect(cancel).toHaveBeenCalled();}finally{jest.useRealTimers();}
});
