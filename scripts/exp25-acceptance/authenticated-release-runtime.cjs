/** Synthetic encrypted-session + real release HTTP handlers; no provider/socket/database calls. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const results = [];
let current = { role: 'EXPERT', isActive: true, isBanned: false };
let config, requestCookie = '', calls = 0;
function load(relative, imports) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
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
  '@/lib/preview-isolation': isolation, '../../staging-google.cjs': staging,
  'next-auth/providers/google': () => ({ id: 'google', name: 'Google', type: 'oauth', clientId: 'synthetic', clientSecret: 'synthetic', authorization: 'https://accounts.example.invalid/authorize', token: 'https://accounts.example.invalid/token', userinfo: 'https://accounts.example.invalid/userinfo' }),
});
const prisma = {
  user: { findUnique: async () => { if (current instanceof Error) throw current; return current; } },
  expertProfile: { findUnique: async () => ({ id: 'synthetic-expert', userId: 'synthetic-owner' }) },
  $queryRaw: async () => [],
};
load('src/lib/auth.ts', {
  '@/lib/preview-isolation': isolation, '../../staging-google.cjs': staging,
  './auth.config': authConfig, 'next-auth': value => { config = value; return {}; }, '@/lib/prisma': prisma,
});
// Load the application's actual error class, while forbidding store execution.
const { ReviewError } = load('src/lib/persona/store.ts', {
  './runtime': {}, '@/lib/prisma': prisma, '@prisma/client': {}, crypto: require('node:crypto'),
  '@/lib/ai/prompts': {}, '@/lib/graph/evidence-extractor': {}, '@/lib/graph/temporal/read-policy': {}, './manifest': {},
});
(async () => {
  const { Auth } = await import('@auth/core');
  const { encode } = await import('@auth/core/jwt');
  const secret = 'synthetic-exp25-runtime-secret-never-a-real-credential';
  const cookieName = 'authjs.session-token';
  config = { ...config, secret, trustHost: true, basePath: '/api/auth', logger: { error() {}, warn() {}, debug() {} } };
  global.fetch = async () => { throw Error('External calls blocked'); };
  const auth = async () => {
    const response = await Auth(new Request('http://localhost/api/auth/session', { headers: requestCookie ? { cookie: requestCookie } : {} }), config);
    return response.json();
  };
  let gate = false;
  const store = { ReviewError, releasePersona: async input => { calls++; assert.equal(input.expertProfileId, 'synthetic-expert'); assert.equal(input.actorId, 'synthetic-owner'); return { id: 'synthetic-release' }; },
    previewPersonaActivation: async () => { calls++; return gate ? { allowed: false, reason: 'V2 writes are gated pending a compatible downgrade target', approvalHash: null, changes: [] } : { allowed: true, approvalHash: 'a'.repeat(64), changes: [] }; } };
  const next = require('next/server');
  const http = load('src/lib/corrections/http.ts', { 'next/server': next, zod: require('zod'), '@/lib/auth': { auth }, '@/lib/prisma': prisma, '@/lib/persona/store': store });
  const imports = { 'next/server': next, zod: require('zod'), '@/lib/prisma': prisma, '@/lib/corrections/http': http, '@/lib/persona/store': store };
  const release = load('src/app/api/expert/persona-releases/route.ts', imports);
  const preview = load('src/app/api/expert/persona-releases/preview/route.ts', imports);
  const req = body => new next.NextRequest('http://localhost/api/expert/persona-releases', { method: 'POST', body: JSON.stringify(body) });
  const validBody = { expectedHead: null, approvalHash: 'a'.repeat(64), operationKey: 'synthetic-operation' };
  const token = async (body, maxAge) => `${cookieName}=${await encode({ token: body, secret, salt: cookieName, ...(maxAge === undefined ? {} : { maxAge }) })}`;
  const valid = await token({ id: 'synthetic-owner', role: 'ADMIN' });
  async function denied(label, cookie, state, status) {
    requestCookie = cookie; current = state; calls = 0;
    for (const response of [await release.GET(), await release.POST(req(validBody)), await preview.POST(req({ expectedHead: null }))]) assert.equal(response.status, status);
    assert.equal(calls, 0); results.push({ caseId: label, outcome: 'PASS', handlers: ['release GET', 'release POST', 'preview POST'], storeCalls: calls });
  }
  await denied('anonymous', '', current, 401);
  await denied('expired encrypted session', await token({ id: 'synthetic-owner', role: 'EXPERT' }, -120), current, 401);
  await denied('tampered encrypted session', valid + 'tampered', current, 401);
  await denied('current subscriber overrides forged JWT role', valid, { role: 'SUBSCRIBER', isActive: true, isBanned: false }, 403);
  await denied('banned owner', valid, { role: 'EXPERT', isActive: true, isBanned: true }, 401);
  await denied('inactive owner', valid, { role: 'EXPERT', isActive: false, isBanned: false }, 401);
  await denied('deleted owner', valid, null, 401);
  await denied('identity lookup unavailable', valid, Error('synthetic DB outage'), 401);
  current = { role: 'EXPERT', isActive: true, isBanned: false }; requestCookie = valid; calls = 0;
  assert.equal((await release.POST(req(validBody))).status, 201); assert.equal(calls, 1);
  results.push({ caseId: 'current expert owner reaches release store with server-derived identity', outcome: 'PASS', storeCalls: calls });
  calls = 0; assert.equal((await release.POST(req({ ...validBody, expertProfileId: 'foreign-tenant' }))).status, 400); assert.equal(calls, 0);
  assert.equal((await release.POST(req({ expectedHead: null, operationKey: 'missing-receipt' }))).status, 400);
  results.push({ caseId: 'foreign identity fields and missing reviewed receipt rejected before store', outcome: 'PASS', storeCalls: calls });
  gate = true;
  const blocked = await preview.POST(req({ expectedHead: null })); assert.equal(blocked.status, 200); assert.equal((await blocked.json()).allowed, false);
  results.push({ caseId: 'blocked release preview remains explicit structured response', outcome: 'PASS' });
  await denied('entitlement loss: owner role revoked between requests', valid, { role: 'SUBSCRIBER', isActive: true, isBanned: false }, 403);
  const report = { mode: 'local synthetic HTTP/session runtime', externalCalls: 0, databaseConnections: 0, realOAuth: 'NOT RUN', persistence: 'NOT RUN: store and identity rows substituted', results };
  fs.writeFileSync(path.join(root, 'audit/exp25-acceptance-20261011/authenticated-release-runtime.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`${results.length} synthetic encrypted-session/release-handler scenario groups passed`);
})().catch(error => { console.error(error); process.exitCode = 1; });
