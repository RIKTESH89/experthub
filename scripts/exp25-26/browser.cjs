// Actual built Next server + actual JWT/session callbacks + synthetic PostgreSQL.
// No OAuth handshake or payment provider traffic; all browser external traffic is aborted.
const { chromium } = require('@playwright/test');
const { PrismaClient } = require('@prisma/client');
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');
const prisma = new PrismaClient();
const base = 'http://127.0.0.1:3341';
const secret = 'synthetic-exp25-26-session-only';
const results = [];
let server, browser, context;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function check(name, action) { await action(); results.push({ name, status: 'PASS' }); console.log('PASS:', name); }
async function run() {
  const db = await prisma.$queryRaw`SELECT current_database() AS name`;
  assert(db[0]?.name === 'experthub_phase0_test' && process.env.DATABASE_URL?.includes('127.0.0.1:55432'), 'Unsafe DB');
  await new Promise((resolve, reject) => { const probe = net.createServer(); probe.once('error', reject); probe.listen(3341, '127.0.0.1', () => probe.close(resolve)); });
  await prisma.$executeRawUnsafe('TRUNCATE "ExpertApplication", "PaymentEvent", "User" CASCADE');
  await prisma.user.create({ data: { id: 'synthetic-built-owner', email: 'owner@example.invalid', role: 'EXPERT', expertProfile: { create: { id: 'synthetic-built-expert', displayName: 'Synthetic Built Expert', specialty: ['testing'], vectorNamespace: 'synthetic-built' } } } });
  await prisma.user.create({ data: { id: 'synthetic-built-viewer', email: 'viewer@example.invalid', name: 'Built Viewer', role: 'SUBSCRIBER' } });
  await prisma.expertPricingTier.createMany({ data: [{ expertProfileId: 'synthetic-built-expert', tier: 'FREE', price: 0 }, { expertProfileId: 'synthetic-built-expert', tier: 'PREMIUM', price: 10 }] });
  const manifest = JSON.parse(fs.readFileSync('.next/server/middleware-manifest.json', 'utf8'));
  assert(Object.keys(manifest.middleware).length > 0, 'Built middleware missing');
  const log = fs.openSync('audit/exp25-26/next-server.log', 'w');
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', '3341'], {
    stdio: ['ignore', log, log], env: { PATH: '/opt/homebrew/bin:/usr/bin:/bin', HOME: '/Users/rikteshs20', NODE_ENV: 'production',
      DATABASE_URL: process.env.DATABASE_URL, DIRECT_URL: process.env.DATABASE_URL, AUTH_SECRET: secret, AUTH_TRUST_HOST: 'true', AUTH_URL: base,
      NEXT_TELEMETRY_DISABLED: '1', DOTENV_CONFIG_PATH: '/dev/null', NODE_OPTIONS: `--require=${path.resolve('scripts/exp25-26/network-guard.cjs')}` },
  });
  fs.closeSync(log);
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error('Next server exited');
    try { const response = await fetch(base + '/login'); if (response.status === 200) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, 'Built server did not start');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  context = await browser.newContext();
  await context.route('**/*', route => route.request().url().startsWith(base + '/') && !route.request().url().startsWith(base + '/monitoring') ? route.continue() : route.abort());
  const page = await context.newPage();
  const api = async (pathname, options = {}) => page.evaluate(async ({ pathname, options }) => {
    const response = await fetch(pathname, { ...options, redirect: 'manual', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    return { status: response.status, type: response.type, body: await response.text() };
  }, { pathname, options });
  await check('built login and Google provider declaration load', async () => {
    await page.goto(base + '/login'); await page.getByRole('button', { name: /Google/i }).waitFor();
    const providers = await api('/api/auth/providers'); assert(providers.status === 200 && JSON.parse(providers.body).google.id === 'google', 'Google provider unavailable');
  });
  await check('anonymous webhook reaches signature validation; anonymous expert application reaches handler', async () => {
    const webhook = await api('/api/payments/webhook', { method: 'POST', body: '{}' });
    assert(webhook.status === 503 && JSON.parse(webhook.body).error === 'Webhook unavailable', 'Webhook intercepted by middleware');
    const application = await api('/api/expert-applications', { method: 'POST', body: JSON.stringify({ name: 'Synthetic Candidate', email: 'candidate@example.invalid', specialty: 'Testing', reason: 'A synthetic isolated application.' }) });
    assert(application.status === 201, 'Anonymous application status=' + application.status + ' body=' + application.body);
  });
  await check('anonymous protected APIs and dotted/prefix bypasses remain protected', async () => {
    for (const route of ['/api/experts', '/api/admin/users/test.with.dot', '/api/authz', '/api/payments/webhook/extra']) { const response = await api(route); assert(response.status === 401, 'Unprotected ' + route + ' status=' + response.status); }
  });
  await check('retired password registration cannot create an expert or reserve identity', async () => {
    const response = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: 'Attack', email: 'attack@example.invalid', password: 'synthetic-only', role: 'EXPERT' }) });
    assert(response.status === 410, 'Registration not retired'); assert(await prisma.user.count({ where: { email: 'attack@example.invalid' } }) === 0, 'Registration created account');
  });
  const { encode } = await import('next-auth/jwt');
  const token = await encode({ token: { id: 'synthetic-built-viewer', role: 'SUBSCRIBER', name: 'Built Viewer', email: 'viewer@example.invalid' }, secret, salt: 'authjs.session-token', maxAge: 3600 });
  await context.addCookies([{ name: 'authjs.session-token', value: token, url: base, httpOnly: true, sameSite: 'Lax' }]);
  await check('signed synthetic subscriber traverses middleware to experts/pricing/free subscribe APIs', async () => {
    assert((await api('/api/experts')).status === 200, 'Subscriber experts list blocked');
    const pricing = await api('/api/experts/synthetic-built-owner/pricing'); assert(pricing.status === 200 && JSON.parse(pricing.body).tiers.length === 2, 'Subscriber pricing blocked');
    const response = await api('/api/experts/synthetic-built-owner/subscribe', { method: 'POST', body: '{"tier":"FREE"}' });
    assert(response.status === 200 && JSON.parse(response.body).isSubscribed === true, 'Subscriber free subscription blocked');
    assert((await api('/api/expert/pricing')).status === 403, 'Subscriber accessed expert management');
    assert((await api('/api/admin/users')).status === 403, 'Subscriber accessed admin');
    await page.goto(base + '/subscriber/feed'); await page.locator('main').waitFor(); assert(page.url().includes('/subscriber/feed'), 'Subscriber navigation failed');
  });
  await check('cancelled paid feed access ends exactly at verified paid expiry', async () => {
    await prisma.post.create({ data: { id: 'synthetic-paid-feed', authorId: 'synthetic-built-owner', title: 'Paid feed proof', content: 'Synthetic', status: 'PUBLISHED', isPremiumOnly: true } });
    await prisma.expertSubscription.updateMany({ where: { subscriberId: 'synthetic-built-viewer' }, data: { tier: 'PREMIUM', status: 'CANCELLED', razorpayPaymentId: 'synthetic-confirmed-charge', paidPeriodStart: new Date('2020-01-01'), currentPeriodEnd: new Date('2099-01-01') } });
    const active = await api('/api/subscriber/feed');
    assert(active.status === 200 && JSON.parse(active.body).posts.some(post => post.id === 'synthetic-paid-feed'), 'Cancelled paid feed lost access');
    await prisma.expertSubscription.updateMany({ where: { subscriberId: 'synthetic-built-viewer' }, data: { currentPeriodEnd: new Date('2020-02-01') } });
    const expired = await api('/api/subscriber/feed');
    assert(expired.status === 200 && JSON.parse(expired.body).posts.length === 0, 'Expired paid feed retains access');
    await prisma.expertSubscription.updateMany({ where: { subscriberId: 'synthetic-built-viewer' }, data: { tier: 'FREE', status: 'ACTIVE', razorpayPaymentId: null, paidPeriodStart: null, currentPeriodEnd: null } });
  });
  await check('built chat UI renders retained citation revision/span and removes it after revocation', async () => {
    await prisma.knowledgeItem.create({ data: { id: 'synthetic-built-source', expertProfileId: 'synthetic-built-expert', title: 'Architecture evidence', content: 'Synthetic source', sourceType: 'manual', metadata: { audience: 'public' }, isIndexed: true, sourceVersion: 1, indexedVersion: 1, vectorIds: ['synthetic-built-vector'] } });
    await prisma.chatSession.create({ data: { id: 'synthetic-built-chat', subscriberId: 'synthetic-built-viewer', expertProfileId: 'synthetic-built-expert', messages: { create: { role: 'assistant', content: 'Synthetic persisted answer', sources: [{ content: 'Synthetic exact span', score: 1, metadata: { title: 'Architecture evidence', expertProfileId: 'synthetic-built-expert', vectorId: 'synthetic-built-vector', generationAudience: 'viewer', evidenceTrace: [{ revisionId: 'synthetic-ui-revision', spanId: 'synthetic-ui-span', start: 0, end: 20, text: 'Synthetic exact span', speakerRole: 'author', kind: 'explicit', endorsedByOwner: true }] } }] } } } });
    await page.goto(base + '/subscriber/experts/synthetic-built-owner/chat');
    await page.getByText('Synthetic persisted answer', { exact: true }).waitFor();
    const ratingResponse = page.waitForResponse(response => response.url().includes('/rate') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Thumbs up', exact: true }).click();
    assert((await ratingResponse).status() === 200, 'Persisted message rating failed');
    assert((await prisma.chatMessage.findFirst({ where: { chatSessionId: 'synthetic-built-chat', role: 'assistant' } })).rating === 1, 'Rating was not persisted');
    await page.getByRole('button', { name: /1 source/ }).click();
    await page.getByText('Evidence and attribution', { exact: true }).click();
    await page.getByText(/Revision synthetic-ui-revision/).waitFor();
    await page.getByText(/author · explicit · owner endorsed/).waitFor();
    await prisma.knowledgeItem.update({ where: { id: 'synthetic-built-source' }, data: { sourceVersion: 2 } });
    await page.reload(); await page.getByText('Synthetic persisted answer', { exact: true }).waitFor();
    assert(await page.getByRole('button', { name: /1 source/ }).count() === 0, 'Revoked citations remain visible');
  });
  await check('same JWT immediately sees promotion and demotion in API and server layouts', async () => {
    await prisma.user.update({ where: { id: 'synthetic-built-viewer' }, data: { role: 'EXPERT', expertProfile: { create: { id: 'synthetic-promoted-expert', displayName: 'Promoted Synthetic', specialty: [], vectorNamespace: 'synthetic-promoted' } } } });
    assert((await api('/api/expert/pricing')).status === 200, 'Promotion blocked by stale token');
    await page.goto(base + '/expert/settings'); await page.locator('main').waitFor(); assert(page.url().includes('/expert/settings'), 'Promoted layout blocked');
    await prisma.user.update({ where: { id: 'synthetic-built-viewer' }, data: { role: 'SUBSCRIBER' } });
    assert((await api('/api/expert/pricing')).status === 403, 'Demotion left privileged access');
    await page.goto(base + '/expert/settings'); assert(!page.url().includes('/expert/settings'), 'Demoted expert layout still accessible');
  });
  await check('same JWT immediately loses access after ban, inactive state and deletion', async () => {
    await prisma.user.update({ where: { id: 'synthetic-built-viewer' }, data: { isBanned: true } });
    assert((await api('/api/users/me')).status === 401, 'Ban not enforced');
    await prisma.user.update({ where: { id: 'synthetic-built-viewer' }, data: { isBanned: false, isActive: false } });
    assert((await api('/api/users/me')).status === 401, 'Inactive state not enforced');
    await prisma.user.delete({ where: { id: 'synthetic-built-viewer' } });
    assert((await api('/api/users/me')).status === 401, 'Deleted account not enforced');
  });
  fs.writeFileSync('audit/exp25-26/built-browser.json', JSON.stringify({ browser: browser.version(), base, results, limitations: ['Synthetic JWT sessions: no real OAuth handshake', 'No payment provider traffic', 'Offline font substitution; not typography acceptance'] }, null, 2));
}
run().catch(error => { console.error(error); fs.writeFileSync('audit/exp25-26/built-browser-failure.json', JSON.stringify({ results, error: error.message }, null, 2)); process.exitCode = 1; }).finally(async () => {
  await context?.close(); await browser?.close();
  if (server && server.exitCode === null) { server.kill('SIGTERM'); await new Promise(resolve => { server.once('exit', resolve); setTimeout(() => { server.kill('SIGKILL'); resolve(); }, 5000).unref(); }); }
  await prisma.$disconnect();
});
