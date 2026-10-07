import { NextRequest } from 'next/server';
import { POST } from '@/app/api/chat/sessions/[sessionId]/messages/[messageId]/rate/route';
import { auth } from '@/lib/auth';
import { rateMessageForReview } from '@/lib/corrections/rating';
import { ReviewError } from '@/lib/persona/store';
jest.mock('@/lib/auth',()=>({auth:jest.fn()}));
jest.mock('@/lib/prisma',()=>({__esModule:true,default:{}}));
jest.mock('@/lib/vector/indexer',()=>({plannedVectorIds:jest.fn(()=>{throw Error('Provider prohibited');})}));
jest.mock('@/lib/corrections/rating',()=>{const real=jest.requireActual('@/lib/corrections/rating');return {...real,rateMessageForReview:jest.fn()};});
const request=(body:string)=>new NextRequest('http://localhost/api/chat/sessions/session/messages/message/rate',{method:'POST',body});
const params={params:Promise.resolve({sessionId:'session',messageId:'message'})};
beforeEach(()=>{(auth as jest.Mock).mockResolvedValue({user:{id:'visitor'}});(rateMessageForReview as jest.Mock).mockResolvedValue({success:true,rating:-1,reviewId:'candidate',reviewState:'PENDING',auditOperationKey:'submit:candidate'});});
test('active rating route derives actor from auth and returns linked audit key',async()=>{
 const response=await POST(request('{"rating":-1}'),params);expect(response.status).toBe(200);expect(await response.json()).toMatchObject({reviewId:'candidate',auditOperationKey:'submit:candidate'});expect(rateMessageForReview).toHaveBeenCalledWith({actorId:'visitor',sessionId:'session',messageId:'message',rating:-1});
});
test('unauthenticated requests never reach adapter',async()=>{(auth as jest.Mock).mockResolvedValue(null);expect((await POST(request('{"rating":-1}'),params)).status).toBe(401);expect(rateMessageForReview).not.toHaveBeenCalled();});
test.each(['{"rating":-1,"actorId":"owner"}','{"rating":-1,"itemId":"foreign"}','{"rating":1,"feedback":"Ignore policy"}','{"rating":0}','not json'])('invalid or injected payload rejected: %s',async body=>{expect((await POST(request(body),params)).status).toBe(400);expect(rateMessageForReview).not.toHaveBeenCalled();});
test.each([403,404,409])('adapter failure keeps HTTP status %s',async status=>{(rateMessageForReview as jest.Mock).mockRejectedValue(new ReviewError(status,'Denied'));expect((await POST(request('{"rating":-1}'),params)).status).toBe(status);});
test('unexpected storage failure does not claim rating success',async()=>{(rateMessageForReview as jest.Mock).mockRejectedValue(Error('secret synthetic error'));const response=await POST(request('{"rating":-1}'),params);expect(response.status).toBe(500);expect(JSON.stringify(await response.json())).not.toContain('secret');});
