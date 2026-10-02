import { previewOriginFromHost } from '../../preview-environment.cjs';
import { previewCanonicalOrigin } from '@/lib/preview-isolation';
afterEach(() => { for(const key of ['VERCEL_ENV','VERCEL_BRANCH_URL','NEXT_PUBLIC_EXPERTHUB_PREVIEW_ORIGIN','NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED']) delete process.env[key]; });
test.each([undefined,'','https://project.vercel.app','production.example.com','project.vercel.app/path','project.vercel.app:443','project.vercel.app.evil.invalid','user@project.vercel.app',' project.vercel.app','-project.vercel.app','a'.repeat(64)+'.vercel.app'])('invalid/missing system hostname fails closed %p', host => { expect(() => previewOriginFromHost(host)).toThrow('VERCEL_BRANCH_URL'); });
test('server uses validated system branch host and client uses derived canonical origin', () => {
 process.env.VERCEL_ENV='preview';process.env.VERCEL_BRANCH_URL='Synthetic-Branch.vercel.app';
 expect(previewCanonicalOrigin()).toBe('https://synthetic-branch.vercel.app');
 delete process.env.VERCEL_ENV;process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED='true';process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ORIGIN='https://synthetic-branch.vercel.app';
 expect(previewCanonicalOrigin()).toBe('https://synthetic-branch.vercel.app');
 process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ORIGIN='https://production.example.invalid';expect(() => previewCanonicalOrigin()).toThrow();
});
test('missing Preview host fails closed and production adds no origin override', () => {
 process.env.VERCEL_ENV='preview';expect(() => previewCanonicalOrigin()).toThrow();
 process.env.VERCEL_ENV='production';expect(previewCanonicalOrigin()).toBeUndefined();
});
test('actual Next build config overrides inherited production origins and rejects missing system host', () => {
 const { execFileSync } = require('child_process') as typeof import('child_process');
 const script = `
 const assert=(await import('node:assert/strict')).default;
 const {default:config}=await import('./next.config.mjs');
 for(const key of ['AUTH_URL','NEXTAUTH_URL','NEXT_PUBLIC_APP_URL','NEXT_PUBLIC_EXPERTHUB_PREVIEW_ORIGIN'])assert.equal(config.env[key],'https://synthetic-branch.vercel.app');
 assert.equal(config.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED,'true');
 console.log('PASS config');`;
 const env = {PATH:process.env.PATH,NODE_ENV:'test' as const,VERCEL_ENV:'preview',VERCEL_BRANCH_URL:'synthetic-branch.vercel.app',AUTH_URL:'https://production.example.invalid',NEXTAUTH_URL:'https://production.example.invalid',NEXT_PUBLIC_APP_URL:'https://production.example.invalid',NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED:'false'};
 expect(execFileSync(process.execPath,['--input-type=module','-e',script],{env,encoding:'utf8',timeout:15000}).trim()).toBe('PASS config');
 const missing = {...env,VERCEL_BRANCH_URL:''};
 const check = `const assert=(await import('node:assert/strict')).default; await assert.rejects(import('./next.config.mjs'),/VERCEL_BRANCH_URL/);console.log('PASS missing host rejected');`;
 expect(execFileSync(process.execPath,['--input-type=module','-e',check],{env:missing,encoding:'utf8',timeout:15000}).trim()).toBe('PASS missing host rejected');
});
