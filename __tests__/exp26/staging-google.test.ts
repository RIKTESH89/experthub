import { isGoogleSignInEnabled } from '@/lib/google-sign-in';
const {stagingGoogleConfig,approvedStagingGoogleIdentity}=require('../../staging-google.cjs');
const syntheticId='123456-synthetic.apps.googleusercontent.com';
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'exp25-26-launch-auth-payments',VERCEL_BRANCH_URL:'experthub-git-exp25-26-launch-au-e842c4-riktesh-singhs-projects.vercel.app',EXPERTHUB_STAGING_GOOGLE_ENABLED:'1',EXPERTHUB_STAGING_GOOGLE_CLIENT_ID:syntheticId,EXPERTHUB_STAGING_GOOGLE_APPROVED_CLIENT_ID:syntheticId,EXPERTHUB_STAGING_GOOGLE_CLIENT_SECRET:'synthetic-only'};
const email='tester-one@example.invalid';const profile={email,email_verified:true,sub:'synthetic-subject'};
jest.mock('next-auth/providers/google',()=>({__esModule:true,default:(options:object)=>({id:'google',...options})}));
test.each([
 {VERCEL_ENV:'production'},{VERCEL_ENV:undefined},{VERCEL_GIT_COMMIT_REF:'master'},{VERCEL_GIT_COMMIT_REF:undefined},
 {VERCEL_BRANCH_URL:undefined},{VERCEL_BRANCH_URL:'https://'+env.VERCEL_BRANCH_URL},{VERCEL_BRANCH_URL:'other.vercel.app'},
 {EXPERTHUB_STAGING_GOOGLE_ENABLED:undefined},{EXPERTHUB_STAGING_GOOGLE_ENABLED:'true'},
 {EXPERTHUB_STAGING_GOOGLE_CLIENT_ID:undefined},{EXPERTHUB_STAGING_GOOGLE_CLIENT_ID:'malformed'},
 {EXPERTHUB_STAGING_GOOGLE_APPROVED_CLIENT_ID:undefined},{EXPERTHUB_STAGING_GOOGLE_APPROVED_CLIENT_ID:'123456-other.apps.googleusercontent.com'},
 {EXPERTHUB_STAGING_GOOGLE_CLIENT_SECRET:undefined},{EXPERTHUB_STAGING_GOOGLE_CLIENT_SECRET:' '},
])('configuration fails closed %p',override=>{
 expect(stagingGoogleConfig({...env,...override,GOOGLE_CLIENT_ID:syntheticId,GOOGLE_CLIENT_SECRET:'synthetic-production'})).toBeNull();
 expect(approvedStagingGoogleIdentity(email,profile,{...env,...override})).toBe(false);
});
test('exact approved staging configuration returns only separate credentials',()=>{
 expect(stagingGoogleConfig(env)).toEqual({clientId:syntheticId,clientSecret:'synthetic-only'});
});
test.each([
 [undefined,profile],[null,profile],['other@example.invalid',profile],[email,undefined],[email,null],
 [email,{...profile,email:'other@example.invalid'}],[email,{...profile,email_verified:false}],
 [email,{...profile,email_verified:'true'}],[email,{...profile,email_verified:undefined}],
 [email,{...profile,sub:undefined}],[email,{...profile,sub:''}],
])('identity enrollment rejects invalid claims', (candidate,p)=>expect(approvedStagingGoogleIdentity(candidate,p,env)).toBe(false));
test('verified new testers need no email allowlist or global subject pin',()=>{
 expect(approvedStagingGoogleIdentity(email,profile,env)).toBe(true);
 expect(approvedStagingGoogleIdentity('tester-two@example.invalid',{email:'tester-two@example.invalid',email_verified:true,sub:'second-subject'},env)).toBe(true);
 expect(approvedStagingGoogleIdentity(email,profile,{...env,EXPERTHUB_STAGING_GOOGLE_APPROVED_SUBJECT:'old-owner-subject'})).toBe(true);
 expect(approvedStagingGoogleIdentity(email,{...profile,sub:' '},env)).toBe(false);
});
test('provider appears only behind staging gate and uses minimal scopes/separate client',()=>{
 const saved={...process.env};Object.assign(process.env,env);
 try{jest.isolateModules(()=>{const {authConfig}=require('@/lib/auth.config');expect(authConfig.providers).toEqual([{id:'google',clientId:syntheticId,clientSecret:'synthetic-only',authorization:{params:{scope:'openid email profile'}}}]);expect(authConfig.adapter).toBeUndefined();});}
 finally{process.env=saved;}
});
test('client only consumes derived boolean; production sign-in behavior retained',()=>{
 const saved={...process.env};try{
 process.env.VERCEL_ENV='preview';process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED='true';
 delete process.env.NEXT_PUBLIC_EXPERTHUB_STAGING_GOOGLE_ENABLED;expect(isGoogleSignInEnabled()).toBe(false);
 process.env.NEXT_PUBLIC_EXPERTHUB_STAGING_GOOGLE_ENABLED='true';expect(isGoogleSignInEnabled()).toBe(true);
 process.env.NEXT_PUBLIC_EXPERTHUB_STAGING_GOOGLE_ENABLED='1';expect(isGoogleSignInEnabled()).toBe(false);
 process.env.VERCEL_ENV='production';delete process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED;expect(isGoogleSignInEnabled()).toBe(true);
 }finally{process.env=saved;}
});
test('Google enablement never lifts the general Preview service guard',()=>{
 const saved={...process.env};Object.assign(process.env,env);try{
 expect(stagingGoogleConfig()).not.toBeNull();const {isPreviewIsolated,assertExternalServiceAllowed}=require('@/lib/preview-isolation');expect(isPreviewIsolated()).toBe(true);expect(()=>assertExternalServiceAllowed()).toThrow('External services are disabled in Preview');
 }finally{process.env=saved;}
});
