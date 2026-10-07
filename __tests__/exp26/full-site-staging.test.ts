import prisma, { resetAllMocks } from '../mocks/prisma';
import { mockAuth, mockSession } from '../mocks/auth';
import { createPOST, createGET } from '../helpers/request';
jest.mock('@/lib/prisma',()=>({__esModule:true,default:prisma}));
jest.mock('@/lib/auth',()=>({auth:mockAuth}));
jest.mock('@/lib/email/resend',()=>({sendEmail:jest.fn()}));
import { POST as forgot } from '@/app/api/auth/forgot-password/route';
import { POST as reset } from '@/app/api/auth/reset-password/route';
import { POST as apply } from '@/app/api/expert-applications/route';
import { GET as search } from '@/app/api/search/route';
const mockTokens={findUnique:jest.fn(),create:jest.fn(),update:jest.fn()};
const mockApplications={findFirst:jest.fn(),create:jest.fn()};
const saved={...process.env};
const stage={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'exp25-26-launch-auth-payments',VERCEL_BRANCH_URL:'experthub-git-exp25-26-launch-au-e842c4-riktesh-singhs-projects.vercel.app'};
beforeEach(()=>{
 Object.assign(prisma,{passwordResetToken:mockTokens,expertApplication:mockApplications});
 resetAllMocks();mockAuth.mockReset();Object.assign(process.env,stage);
});
afterEach(()=>{process.env={...saved};});
test.each([forgot,reset])('staging retired recovery rejects before account/token reads or writes',async handler=>{
 const res=await handler(createPOST('/api/auth/reset-password',{email:'synthetic@example.invalid',token:'synthetic-token',password:'synthetic-password'}));
 expect(res.status).toBe(410);expect((await res.json()).code).toBe('PASSWORD_RECOVERY_RETIRED');
 expect(prisma.user.findUnique).not.toHaveBeenCalled();expect(prisma.user.update).not.toHaveBeenCalled();
 expect(mockTokens.findUnique).not.toHaveBeenCalled();expect(mockTokens.create).not.toHaveBeenCalled();expect(mockTokens.update).not.toHaveBeenCalled();
});
test.each([forgot,reset])('production and unrelated Preview recovery retain validation',async handler=>{
 for(const override of [{VERCEL_ENV:'production'},{VERCEL_GIT_COMMIT_REF:'other'},{VERCEL_BRANCH_URL:'other.vercel.app'}]) {
  Object.assign(process.env,stage,override);expect((await handler(createPOST('/api/auth/reset-password',{}))).status).toBe(400);
 }
});
const application={name:'Synthetic Tester',email:'new-tester@example.invalid',specialty:'Testing',reason:'Synthetic test application'};
test('staging application responses do not distinguish existing account or application status',async()=>{
 const results=[];
 for(const scenario of ['new','expert','pending','approved']) {
  resetAllMocks();mockApplications.findFirst.mockResolvedValue(scenario==='pending'||scenario==='approved'?{status:scenario.toUpperCase()}:null);
  prisma.user.findUnique.mockResolvedValue(scenario==='expert'?{role:'EXPERT'}:null);
  const r=await apply(createPOST('/api/expert-applications',application));results.push({status:r.status,body:await r.json()});
  expect(mockApplications.create).toHaveBeenCalledTimes(scenario==='new'?1:0);
 }
 expect(results).toEqual(Array(4).fill({status:201,body:{message:'Application submitted successfully'}}));
});
test('production application response is unchanged',async()=>{
 process.env.VERCEL_ENV='production';mockApplications.findFirst.mockResolvedValue(null);prisma.user.findUnique.mockResolvedValue({role:'EXPERT'});
 expect((await apply(createPOST('/api/expert-applications',application))).status).toBe(409);
});
test('staging search excludes orphan expert accounts; production predicate unchanged',async()=>{
 mockAuth.mockResolvedValue(mockSession.subscriber);prisma.user.findMany.mockResolvedValue([]);prisma.tag.findMany.mockResolvedValue([]);prisma.post.findMany.mockResolvedValue([]);
 expect((await search(createGET('/api/search',{q:'synthetic'}))).status).toBe(200);
 expect(prisma.user.findMany.mock.calls[0][0].where.expertProfile).toEqual({isNot:null});
 prisma.user.findMany.mockClear();process.env.VERCEL_ENV='production';await search(createGET('/api/search',{q:'synthetic'}));
 expect(prisma.user.findMany.mock.calls[0][0].where.expertProfile).toBeUndefined();
});
test('anonymous search still rejects before data queries',async()=>{
 mockAuth.mockResolvedValue(null);expect((await search(createGET('/api/search',{q:'synthetic'}))).status).toBe(401);expect(prisma.user.findMany).not.toHaveBeenCalled();
});
