// Public pages only: synthetic auth settings, no database writes or provider calls.
const { chromium } = require('@playwright/test');
const fs = require('fs');
const base = 'http://127.0.0.1:3370';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const external = [], errors = [], results = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== base) { external.push(url.origin); return route.abort(); }
    // Browser public-page QA must not submit real applications or load telemetry.
    if (url.pathname === '/monitoring') return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.stack || error.message));
  const assert = (value, message) => { if (!value) throw new Error(message); };
  try {
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/', '/pricing', '/about']) {
        const response = await page.goto(base + path);
        assert(response.status() === 200, path + ' status ' + response.status());
        await page.locator('h1').waitFor();
        assert(await page.locator('main').count() === 1, 'Main landmark ' + path);
        assert(!await page.locator('[data-nextjs-dialog]').count(), 'Error overlay');
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Overflow ' + path + ' width=' + width);
        assert((await page.locator('meta[name=robots]').getAttribute('content')).includes('noindex'), 'Preview indexing');
        assert(await page.locator('link[rel=canonical]').count() === 0, 'Preview canonical');
        const viewport = await page.locator('meta[name=viewport]').getAttribute('content');
        assert(!viewport.includes('user-scalable=no') && !viewport.includes('maximum-scale=1'), 'Zoom disabled');
        await page.keyboard.press('Tab');
        assert(await page.evaluate(() => document.activeElement?.textContent === 'Skip to content'), 'Skip link first');
        await page.keyboard.press('Enter');
        assert(await page.evaluate(() => document.activeElement?.id === 'main-content'), 'Skip destination');
        const text = await page.locator('body').innerText();
        assert(!/10,?000|500\+|98%|thousands of learners|Most Popular/.test(text), 'Unsupported proof');
        if (width === 375 || width === 1440) await page.screenshot({ path: 'audit/exp30/' + (path === '/' ? 'home' : path.slice(1)) + '-' + width + '.png', fullPage: true });
        results.push({ path, width, status: 'PASS' });
      }
    }
    for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme, reducedMotion: 'no-preference' });
      for (const path of ['/', '/pricing', '/about']) {
        await page.setViewportSize({ width: 375, height: 900 });
        await page.goto(base + path);
        await page.locator('h1').waitFor();
        await page.waitForTimeout(1800);
        assert(await page.locator('h1').isVisible(), 'Animated heading hidden');
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Theme overflow');
        if (colorScheme === 'dark') await page.screenshot({ path: 'audit/exp30/' + (path === '/' ? 'home' : path.slice(1)) + '-dark-375.png', fullPage: true });
        results.push({ path, colorScheme, reducedMotion: false, status: 'PASS' });
      }
    }
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 375, height: 900 }); await page.goto(base);
    const mobile = page.getByRole('navigation', { name: 'Mobile navigation' });
    await mobile.getByRole('link', { name: 'Pricing', exact: true }).click();
    assert(new URL(page.url()).hash === '#pricing', 'Mobile navigation');
    const input = page.getByLabel('Full Name');
    assert(await input.evaluate(el => el.required && el.getBoundingClientRect().height >= 44), 'Form target/required');
    // HTML validation must prevent an empty submission without contacting the API.
    let submissions = 0;
    await page.route('**/api/expert-applications', async route => { submissions++; await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
    await page.getByRole('button', { name: 'Submit Application' }).click();
    assert(submissions === 0, 'Empty form submitted');
    await input.fill('Synthetic Reviewer'); await page.getByLabel('Gmail Address').fill('synthetic@example.invalid');
    await page.getByLabel('Area of Expertise').fill('Synthetic QA'); await page.getByLabel('Why do you want').fill('Local mocked form acceptance only.');
    await page.getByRole('button', { name: 'Submit Application' }).click();
    await page.getByRole('status').filter({ hasText: 'Application Submitted!' }).waitFor();
    assert(submissions === 1, 'Mock form submission');
    assert(!(await page.locator('body').innerText()).includes('1-2 business days'), 'Unsupported review SLA');
    results.push({ name: 'Mobile nav, native form validation, mocked success status', status: 'PASS' });
    assert(errors.length === 0, 'Browser errors ' + errors.join('; '));
    fs.writeFileSync('audit/exp30/browser.json', JSON.stringify({ base, reducedMotion: true, results, pageErrors: errors, blockedExternalOrigins: [...new Set(external)] }, null, 2));
    console.log('PASS: ' + results.length + ' public-page cases');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
