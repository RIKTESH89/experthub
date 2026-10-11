/** Real client in isolated native Chromium; all HTTP routes synthetic and external requests aborted. */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'audit/exp25-acceptance-20261011');
const results = [];
const preview = { allowed: true, reason: null, currentHead: 'head', targetId: null, sourceCount: 0, approvalHash: 'a'.repeat(64), changes: [] };
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const scenario of ['gated', 'stale', 'retry', 'revoked', 'malformed']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage(); const errors = []; const writes = [];
      page.on('pageerror', error => errors.push(error.message));
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== 'http://127.0.0.1:3225') return route.abort();
        if (url.pathname === '/app.js') return route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(root, '.exp16-runtime/browser/app.js')) });
        if (url.pathname === '/style.css') return route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(root, '.exp16-runtime/browser/style.css')) });
        if (!url.pathname.startsWith('/api/')) return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><main class="p-6"><div id="root"></div></main><script src="/app.js"></script></body></html>' });
        const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
        if (url.pathname.endsWith('/preview')) {
          if (scenario === 'gated') return json({ ...preview, allowed: false, reason: 'V2 writes are gated pending a compatible downgrade target', approvalHash: null });
          if (scenario === 'malformed') return json({ ...preview, changes: null });
          return json(preview);
        }
        if (route.request().method() === 'POST') {
          writes.push(route.request().postDataJSON());
          if (scenario === 'stale') return json({ error: 'Reviewed payload changed' }, 409);
          if (scenario === 'revoked') return route.fulfill({ status: 401, contentType: 'text/html', body: '<h1>Unauthorized</h1>' });
          if (scenario === 'retry' && writes.length === 1) return json({ error: 'private database detail' }, 503);
          return json({ id: 'new' }, 201);
        }
        if (url.pathname.endsWith('persona-releases')) return json({ releases: [{ id: 'private-release', createdAt: '2026-10-11', manifest: { sources: [] } }], heads: [{ releaseId: 'head' }] });
        return json({ reviews: [], events: [], sources: [], truncated: false });
      });
      await page.goto('http://127.0.0.1:3225/expert/reviews');
      await page.getByRole('button', { name: 'Create release' }).click();
      if (scenario === 'malformed') {
        await page.getByRole('alert').filter({ hasText: 'Release verification is unavailable' }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Confirm new release' }).count(), 0);
      } else {
        const confirm = page.getByRole('button', { name: 'Confirm new release' }); await confirm.waitFor();
        assert.equal(await page.getByRole('region', { name: 'New release preview' }).evaluate(element => element === document.activeElement), true);
        if (scenario === 'gated') {
          assert.equal(await confirm.isDisabled(), true);
          await page.getByRole('alert').filter({ hasText: 'Contact your administrator about release readiness' }).waitFor(); assert.equal(writes.length, 0);
        } else {
          await confirm.click(); await page.getByRole('alert').waitFor();
          if (scenario === 'stale') { assert.equal(await confirm.isDisabled(), true); await page.getByRole('button', { name: 'Refresh reviews' }).click(); await page.getByRole('status').filter({ hasText: 'Latest reviews' }).waitFor(); assert.equal(await confirm.count(), 0); }
          if (scenario === 'revoked') { assert.equal(await page.getByText('private-release', { exact: true }).count(), 0); assert.equal(await confirm.count(), 0); }
          if (scenario === 'retry') { assert.equal(await page.getByText('private database detail', { exact: true }).count(), 0); await confirm.click(); await page.getByRole('status').filter({ hasText: 'Reviewed release activated' }).waitFor(); assert.equal(writes.length, 2); assert.deepEqual(writes[0], writes[1]); }
        }
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: path.join(out, `${scenario}-mobile.png`), fullPage: true });
      results.push({ caseId: scenario, outcome: 'PASS', width: 390, consoleErrors: errors, activationWrites: writes.length });
      await context.close();
    }
    fs.writeFileSync(path.join(out, 'browser.json'), JSON.stringify({ browser: browser.version(), mode: 'native Chrome real component with intercepted synthetic HTTP', realOAuth: 'NOT RUN', databasePersistence: 'NOT RUN', externalRequestsAllowed: 0, results }, null, 2) + '\n');
    console.log(`${results.length} isolated native Chrome release-failure scenarios passed`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
