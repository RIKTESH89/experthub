import mockPrisma,{resetAllMocks} from './mocks/prisma';
import {mockAuth} from './mocks/auth';
import {createPATCH} from './helpers/request';
jest.mock('@/lib/prisma',()=>({__esModule:true,default:mockPrisma}));
jest.mock('@/lib/auth',()=>({auth:mockAuth}));
import {GET,PATCH} from '@/app/api/subscriber/settings/route';
beforeEach(()=>{resetAllMocks();mockAuth.mockReset();});
it('round-trips preferences through actual handlers with session-scoped in-memory persistence across two subscribers',async()=>{
 const rows=new Map<string,Record<string,unknown>>([
  ['synthetic-a',{emailOnNewSubscriber:true,emailOnComment:false,emailDigest:'weekly',twoFactorEnabled:false}],
  ['synthetic-b',{emailOnNewSubscriber:false,emailOnComment:true,emailDigest:'monthly',twoFactorEnabled:false}],
 ]);
 mockPrisma.userSettings.findUnique.mockImplementation(async({where}:{where:{userId:string}})=>rows.get(where.userId));
 mockPrisma.userSettings.upsert.mockImplementation(async({where,update}:{where:{userId:string};update:Record<string,unknown>})=>{const row={...rows.get(where.userId),...update};rows.set(where.userId,row);return row;});
 mockAuth.mockResolvedValue({user:{id:'synthetic-a',role:'SUBSCRIBER'}});
 expect((await (await GET()).json()).emailDigest).toBe('weekly');
 const result=await PATCH(createPATCH('/api/subscriber/settings',{userId:'synthetic-b',emailOnNewPost:false,emailOnReply:true,emailDigest:'daily'}));expect(result.status).toBe(200);
 expect(await (await GET()).json()).toMatchObject({emailOnNewPost:false,emailOnReply:true,emailDigest:'daily'});
 mockAuth.mockResolvedValue({user:{id:'synthetic-b',role:'SUBSCRIBER'}});expect(await (await GET()).json()).toMatchObject({emailOnNewPost:false,emailOnReply:true,emailDigest:'monthly'});
 expect(mockPrisma.userSettings.upsert.mock.calls[0][0].where).toEqual({userId:'synthetic-a'});expect(mockPrisma.user.update).not.toHaveBeenCalled();
});
it('denies anonymous preference reads and writes before the mocked store is touched',async()=>{
 mockAuth.mockResolvedValue(null);expect((await GET()).status).toBe(401);expect((await PATCH(createPATCH('/api/subscriber/settings',{emailDigest:'daily'}))).status).toBe(401);expect(mockPrisma.userSettings.findUnique).not.toHaveBeenCalled();expect(mockPrisma.userSettings.upsert).not.toHaveBeenCalled();
});
it('rejects invalid digest without changing the mocked preferences',async()=>{
 mockAuth.mockResolvedValue({user:{id:'synthetic-a',role:'SUBSCRIBER'}});expect((await PATCH(createPATCH('/api/subscriber/settings',{emailDigest:'hourly'}))).status).toBe(400);expect(mockPrisma.userSettings.upsert).not.toHaveBeenCalled();
});
