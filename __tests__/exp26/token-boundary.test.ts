import { execFileSync } from 'child_process';
import { widgetIdentity } from '@/lib/ai/widget-identity';
test('actual installed Auth.js rejects production JWT under distinct staging secret and accepts its own JWT', () => {
 const script = `
 const {encode,decode}=await import('next-auth/jwt');
 const assert=(await import('node:assert/strict')).default;
 const salt='__Secure-authjs.session-token';
 const production='synthetic-production-secret-only'; const staging='synthetic-staging-distinct-secret-only';
 const token=await encode({token:{id:'synthetic-user',role:'ADMIN'},secret:production,salt,maxAge:60});
 assert.equal((await decode({token,secret:production,salt})).id,'synthetic-user');
 await assert.rejects(decode({token,secret:staging,salt}));
 const own=await encode({token:{id:'synthetic-staging-user'},secret:staging,salt,maxAge:60});
 assert.equal((await decode({token:own,secret:staging,salt})).id,'synthetic-staging-user');
 console.log('PASS cross-secret JWT boundary; no tokens printed');
 `;
 const output = execFileSync(process.execPath, ['--input-type=module','-e',script], { cwd: process.cwd(), env: { PATH: process.env.PATH, NODE_ENV: 'test' }, encoding: 'utf8', timeout: 10000 });
 expect(output.trim()).toBe('PASS cross-secret JWT boundary; no tokens printed');
});
test('actual widget verifier rejects production signature under staging secret', () => {
 const previous = process.env.AUTH_SECRET;
 try {
  process.env.AUTH_SECRET = 'synthetic-production-secret-only';
  const original = widgetIdentity('synthetic-widget', null, null);
  expect(widgetIdentity('synthetic-widget', original.visitorId, original.token)).toEqual(original);
  process.env.AUTH_SECRET = 'synthetic-staging-distinct-secret-only';
  expect(() => widgetIdentity('synthetic-widget', original.visitorId, original.token)).toThrow('Invalid widget identity');
  const own = widgetIdentity('synthetic-widget', null, null);
  expect(widgetIdentity('synthetic-widget', own.visitorId, own.token)).toEqual(own);
 } finally { if(previous === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET=previous; }
});
