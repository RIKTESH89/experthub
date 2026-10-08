/** Synthetic HTTP session/logout acceptance using installed Auth.js and repository callbacks.
 * No network, accounts, environment files, database connections or provider calls.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const results = [];
let reads = 0;
let current = { role: 'SUBSCRIBER', isActive: true, isBanned: false };
let config;
function load(relative, imports) {
  const filename = path.join(root, relative);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (!(name in imports)) throw Error(`Unexpected import: ${name}`);
    return imports[name];
  }, module, module.exports);
  return module.exports;
}
const isolation = { isPreviewIsolated: () => false };
const staging = { stagingGoogleConfig: () => null, approvedStagingGoogleIdentity: () => false };
const authConfig = load('src/lib/auth.config.ts', {
  '@/lib/preview-isolation': isolation,
  '../../staging-google.cjs': staging,
  'next-auth/providers/google': () => ({ id: 'google', name: 'Google', type: 'oauth', clientId: 'synthetic', clientSecret: 'synthetic', authorization: 'https://accounts.example.invalid/authorize', token: 'https://accounts.example.invalid/token', userinfo: 'https://accounts.example.invalid/userinfo' }),
});
load('src/lib/auth.ts', {
  '@/lib/preview-isolation': isolation,
  '../../staging-google.cjs': staging,
  './auth.config': authConfig,
  'next-auth': supplied => { config = supplied; return {}; },
  '@/lib/prisma': { user: { findUnique: async () => { reads++; if (current instanceof Error) throw current; return current; }, create: () => { throw Error('Unexpected identity write'); }, update: () => { throw Error('Unexpected identity write'); } } },
});
(async () => {
  const { Auth } = await import('@auth/core');
  const { encode } = await import('@auth/core/jwt');
  const secret = 'synthetic-session-contract-secret-not-a-real-credential';
  const cookieName = 'authjs.session-token';
  config = { ...config, secret, trustHost: true, basePath: '/api/auth', logger: { error() {}, warn() {}, debug() {} } };
  global.fetch = async () => { throw Error('External calls blocked'); };
  const cookie = async (token, maxAge) => `${cookieName}=${await encode({ token, secret, salt: cookieName, ...(maxAge === undefined ? {} : { maxAge }) })}`;
  const get = value => Auth(new Request('http://localhost/api/auth/session', { headers: value ? { cookie: value } : {} }), config);
  const empty = async (value, label, noReads = false) => {
    reads = 0;
    const response = await get(value);
    assert.equal(response.status, 200);
    assert.equal(await response.json(), null);
    if (value) assert.match(response.headers.get('set-cookie'), /authjs.session-token=;.*Max-Age=0/);
    if (noReads) assert.equal(reads, 0);
    results.push({ check: label, pass: true, identityReads: reads });
  };
  assert.equal(config.session.maxAge, 30 * 24 * 3600);
  await empty(undefined, 'anonymous session', true);
  const valid = await cookie({ id: 'synthetic-user', role: 'ADMIN', email: 'synthetic@example.invalid' });
  let response = await get(valid);
  assert.deepEqual((await response.json()).user, { id: 'synthetic-user', role: 'SUBSCRIBER', email: 'synthetic@example.invalid' });
  assert.match(response.headers.get('cache-control'), /no-store/);
  results.push({ check: 'encrypted session refresh reads current persisted role and has no-store response', pass: true });
  await empty(await cookie({ id: 'synthetic-user', role: 'ADMIN' }, -120), 'expired token rejected before identity read', true);
  await empty(`${cookieName}=malformed`, 'malformed encrypted token rejected', true);
  await empty(await cookie({ id: 'synthetic-user' }) + 'tampered', 'tampered encrypted token rejected', true);
  await empty(await cookie({ role: 'ADMIN' }), 'identity-less token fails closed', true);
  for (const [label, state] of [
    ['deleted identity', null], ['banned identity', { role: 'ADMIN', isActive: true, isBanned: true }],
    ['inactive identity', { role: 'ADMIN', isActive: false, isBanned: false }], ['identity database outage', Error('synthetic unavailable')],
  ]) { current = state; await empty(valid, label); }
  current = { role: 'SUBSCRIBER', isActive: true, isBanned: false };
  const csrf = await Auth(new Request('http://localhost/api/auth/csrf'), config);
  const { csrfToken } = await csrf.json();
  const csrfCookie = csrf.headers.getSetCookie().find(value => value.startsWith('authjs.csrf-token=')).split(';')[0];
  const logout = await Auth(new Request('http://localhost/api/auth/signout', {
    method: 'POST', headers: { cookie: `${valid}; ${csrfCookie}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken, callbackUrl: 'http://localhost/' }),
  }), config);
  assert.equal(logout.status, 302);
  assert.equal(logout.headers.get('location'), 'http://localhost/');
  assert.match(logout.headers.get('set-cookie'), /authjs.session-token=;.*Max-Age=0/);
  await empty(undefined, 'session after applying logout cookie deletion', true);
  results.push({ check: 'CSRF-protected logout clears browser session cookie', pass: true });
  // JWT logout clears this browser; it does not revoke an independently copied valid token.
  response = await get(valid);
  assert.equal((await response.json()).user.id, 'synthetic-user');
  results.push({ check: 'documented JWT limitation: copied token remains valid until expiry/account revocation', pass: true });
  fs.writeFileSync(path.join(root, 'audit/exp26-auth-billing-completion/session-contract.json'), JSON.stringify({ authCoreVersion: JSON.parse(fs.readFileSync(path.join(path.dirname(require.resolve('@auth/core')), 'package.json'), 'utf8')).version, results }, null, 2) + '\n');
  console.log(`${results.length} synthetic Auth.js HTTP checks passed`);
})().catch(error => { console.error(error); process.exitCode = 1; });
