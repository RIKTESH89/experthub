import type { NextAuthConfig } from "next-auth";
import mockPrisma, { resetAllMocks } from "../mocks/prisma";
const mockNextAuth = jest.fn(() => ({ auth: jest.fn(), handlers: {}, signIn: jest.fn(), signOut: jest.fn() }));
jest.mock("next-auth", () => ({ __esModule: true, default: mockNextAuth }));
jest.mock("next-auth/providers/google", () => ({ __esModule: true, default: () => ({ id: "google" }) }));
jest.mock("@/lib/prisma", () => ({ __esModule: true, default: mockPrisma }));
import "@/lib/auth";
const config = (mockNextAuth.mock.calls as unknown[][])[0][0] as NextAuthConfig;
const jwt = config.callbacks!.jwt!;
const signIn = config.callbacks!.signIn!;
beforeEach(() => resetAllMocks());
test.each([null, { role: "ADMIN", isBanned: true, isActive: true }, { role: "ADMIN", isBanned: false, isActive: false }])("existing token fails closed for missing/banned/inactive account %p", async current => {
  mockPrisma.user.findUnique.mockResolvedValue(current);
  const token = await jwt({ token: { id: "synthetic-user", role: "ADMIN" } } as unknown as Parameters<typeof jwt>[0]);
  expect(token).toBeNull();
});
test.each(["EXPERT", "SUBSCRIBER"])("existing token reads current %s role immediately", async role => {
  mockPrisma.user.findUnique.mockResolvedValue({ role, isBanned: false, isActive: true });
  expect(await jwt({ token: { id: "synthetic-user", role: "ADMIN" } } as unknown as Parameters<typeof jwt>[0])).toMatchObject({ id: "synthetic-user", role });
  expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: "synthetic-user" }, select: { role: true, isBanned: true, isActive: true } });
});
test("database outage does not preserve stale authorization", async () => {
  mockPrisma.user.findUnique.mockRejectedValue(new Error("unavailable"));
  await expect(jwt({ token: { id: "synthetic-user", role: "ADMIN" } } as unknown as Parameters<typeof jwt>[0])).rejects.toThrow("unavailable");
});
test("Google email must be verified before identity creation or linking", async () => {
  expect(await signIn({ account: { provider: "google" }, user: { email: "synthetic@example.invalid" }, profile: { email_verified: false } } as Parameters<typeof signIn>[0])).toBe(false);
  expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  expect(mockPrisma.user.create).not.toHaveBeenCalled();
});
test('Preview Google callback rejects verified identity before database linking', async () => {
 process.env.VERCEL_ENV = 'preview';
 try {
  expect(await signIn({ account: { provider: 'google' }, user: { email: 'synthetic@example.invalid' }, profile: { email_verified: true } } as Parameters<typeof signIn>[0])).toBe(false);
  expect(mockPrisma.user.findUnique).not.toHaveBeenCalled(); expect(mockPrisma.user.create).not.toHaveBeenCalled();
 } finally { delete process.env.VERCEL_ENV; }
});
const stagingEnv={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'exp25-26-launch-auth-payments',VERCEL_BRANCH_URL:'experthub-git-exp25-26-launch-au-e842c4-riktesh-singhs-projects.vercel.app',EXPERTHUB_STAGING_GOOGLE_ENABLED:'1',EXPERTHUB_STAGING_GOOGLE_CLIENT_ID:'123456-synthetic.apps.googleusercontent.com',EXPERTHUB_STAGING_GOOGLE_APPROVED_CLIENT_ID:'123456-synthetic.apps.googleusercontent.com',EXPERTHUB_STAGING_GOOGLE_CLIENT_SECRET:'synthetic-only'};
const approvedEmail='rikteshsingh28801@gmail.com';
const approvedLogin={account:{provider:'google'},user:{email:approvedEmail,name:'Synthetic Owner',image:null},profile:{email:approvedEmail,email_verified:true,sub:'synthetic-subject'}};
test.each([
 {account:{provider:'other'}},{account:null},{user:{email:'wrong@example.invalid'}},
 {user:{email:undefined}},{profile:{...approvedLogin.profile,email_verified:false}},
 {profile:{...approvedLogin.profile,email:'wrong@example.invalid'}},{profile:{...approvedLogin.profile,sub:undefined}},
])('staging callback denies before every database operation %p',async override=>{
 const saved={...process.env};Object.assign(process.env,stagingEnv);
 try{expect(await signIn({...approvedLogin,...override} as unknown as Parameters<typeof signIn>[0])).toBe(false);
 expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();expect(mockPrisma.user.create).not.toHaveBeenCalled();expect(mockPrisma.user.update).not.toHaveBeenCalled();}finally{process.env=saved;}
});
test('approved staging owner creates only subscriber; Google claims cannot grant admin',async()=>{
 const saved={...process.env};Object.assign(process.env,stagingEnv);
 mockPrisma.user.findUnique.mockResolvedValue(null);mockPrisma.user.create.mockResolvedValue({id:'synthetic-db-user'});
 const login={...approvedLogin,user:{...approvedLogin.user,role:'ADMIN'},profile:{...approvedLogin.profile,role:'ADMIN'}};
 try{expect(await signIn(login as unknown as Parameters<typeof signIn>[0])).toBe(true);expect(mockPrisma.user.create).toHaveBeenCalledWith({data:{name:'Synthetic Owner',email:approvedEmail,image:null,role:'SUBSCRIBER'}});expect(login.user).toHaveProperty('id','synthetic-db-user');expect(config.adapter).toBeUndefined();expect(config.session?.strategy).toBe('jwt');}finally{process.env=saved;}
});
test.each([{isBanned:true,isActive:true},{isBanned:false,isActive:false}])('approved staging identity still respects account state',async state=>{
 const saved={...process.env};Object.assign(process.env,stagingEnv);mockPrisma.user.findUnique.mockResolvedValue({id:'existing-synthetic',...state});
 try{expect(await signIn(approvedLogin as unknown as Parameters<typeof signIn>[0])).toBe(false);expect(mockPrisma.user.create).not.toHaveBeenCalled();expect(mockPrisma.user.update).not.toHaveBeenCalled();}finally{process.env=saved;}
});
test('approved repeat staging sign-in uses existing subscriber without duplicate creation',async()=>{
 const saved={...process.env};Object.assign(process.env,stagingEnv);mockPrisma.user.findUnique.mockResolvedValue({id:'existing-synthetic',isActive:true,isBanned:false,image:'synthetic-image'});
 try{expect(await signIn(approvedLogin as unknown as Parameters<typeof signIn>[0])).toBe(true);expect(mockPrisma.user.create).not.toHaveBeenCalled();expect(mockPrisma.user.update).not.toHaveBeenCalled();}finally{process.env=saved;}
});
test.each([
 {EXPERTHUB_STAGING_GOOGLE_CLIENT_ID:undefined},{EXPERTHUB_STAGING_GOOGLE_APPROVED_CLIENT_ID:undefined},
 {EXPERTHUB_STAGING_GOOGLE_CLIENT_SECRET:undefined},{VERCEL_BRANCH_URL:'other.vercel.app'},
 {VERCEL_GIT_COMMIT_REF:'other'},{EXPERTHUB_STAGING_GOOGLE_ENABLED:undefined},
])('approved email cannot bypass missing/wrong staging configuration %p',async override=>{
 const saved={...process.env};Object.assign(process.env,stagingEnv);for(const [key,value] of Object.entries(override)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 try{expect(await signIn(approvedLogin as unknown as Parameters<typeof signIn>[0])).toBe(false);expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();expect(mockPrisma.user.create).not.toHaveBeenCalled();expect(mockPrisma.user.update).not.toHaveBeenCalled();}finally{process.env=saved;}
});
test('production verified Google enrollment retains existing behavior for other emails',async()=>{
 const saved={...process.env};process.env.VERCEL_ENV='production';delete process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED;
 mockPrisma.user.findUnique.mockResolvedValue(null);mockPrisma.user.create.mockResolvedValue({id:'production-synthetic'});
 try{expect(await signIn({account:{provider:'google'},user:{email:'synthetic-production@example.invalid',name:'Synthetic'},profile:{email_verified:true}} as Parameters<typeof signIn>[0])).toBe(true);expect(mockPrisma.user.create).toHaveBeenCalledWith({data:{name:'Synthetic',email:'synthetic-production@example.invalid',image:undefined,role:'SUBSCRIBER'}});}finally{process.env=saved;}
});
