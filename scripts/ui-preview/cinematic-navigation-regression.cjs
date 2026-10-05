// Synthetic local UI regression only. No identity, forms, profile, external URLs or provider calls.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const origin = 'http://127.0.0.1:3467';
const output = process.argv[2] || '/tmp/experthub-cinematic-navigation';
const report = { protocol: 'Source fragment → explicit motion off/on → public route → Back/Forward; fresh desktop/phone contexts; capture failure state; no retries', checks: [], errors: [] };
let browser, page;
async function capture() {
  return page.evaluate(() => ({ url: location.href, rootCount: document.querySelectorAll('[data-cinematic-home]').length, sequence: document.querySelector('#sequence') ? {...document.querySelector('#sequence').dataset} : null, status: document.querySelector('#runtime-status')?.textContent, motionPressed: document.querySelector('#motion')?.getAttribute('aria-pressed'), text: document.body.innerText.slice(0, 250) }));
}
async function resumed() {
  await page.waitForFunction(() => { const d = document.querySelector('#sequence')?.dataset; return d?.mode === 'sequence' && d.frame && d.drawn === d.frame; }, undefined, {timeout: 15000});
}
(async () => {
  fs.mkdirSync(output, {recursive: true});
  try {
    browser = await chromium.launch({headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run']});
    for (const variant of [{name:'desktop', width:1470, height:801}, {name:'portrait', width:390, height:844}]) {
      const context = await browser.newContext({viewport: {width: variant.width, height: variant.height}});
      await context.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
      page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      await page.goto(origin, {waitUntil:'networkidle'});
      await resumed();
      await page.locator('.chapter-nav a[href="#conversation"]').focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => location.hash === '#conversation' && document.activeElement?.id === 'title-5');
      await page.locator('.answer a[href="#sample-conversation"]').click();
      await page.waitForFunction(() => location.hash === '#sample-conversation' && document.querySelector('#sample-conversation').closest('details').open);
      await page.locator('#sample-conversation a[href="#source-01"]').click();
      await page.waitForFunction(() => location.hash === '#source-01' && document.querySelector('details').open);
      await page.locator('#motion').click();
      await page.waitForFunction(() => document.querySelector('#sequence').dataset.mode === 'static');
      await page.locator('#motion').click();
      await resumed();
      for (const route of ['/pricing', '/about', '/login']) {
        const scope = route === '/about' ? '.credit' : route === '/pricing' ? '.section-heading' : '.site-links';
        await page.locator(scope+' a[href="'+route+'"]').first().click();
        await page.waitForURL('**'+route);
        assert.equal(await page.locator('[data-cinematic-home]').count(), 0);
        await page.goBack({waitUntil:'networkidle'});
        await resumed();
        assert.equal(new URL(page.url()).pathname, '/');
        assert.equal(new URL(page.url()).hash, '#source-01');
        assert.equal(await page.locator('.chapter').count(), 7);
        report.checks.push({variant: variant.name, route, returned: await capture()});
        await page.goForward({waitUntil:'networkidle'});
        await page.waitForURL('**'+route);
        await page.goBack({waitUntil:'networkidle'});
        await resumed();
      }
      await page.screenshot({path: path.join(output, variant.name+'-after-history.png')});
      await context.close();
    }
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } catch (error) {
    report.passed = false;
    report.failure = error.stack;
    try { report.failureState = await capture(); await page.screenshot({path:path.join(output,'failure.png')}); } catch {}
    console.error(error.stack);
  } finally {
    await browser?.close();
    fs.writeFileSync(path.join(output,'report.json'), JSON.stringify(report,null,2)+'\n');
  }
  console.log(JSON.stringify({passed:report.passed, completedJourneys:report.checks.length, failureState:report.failureState}));
  if (!report.passed) process.exitCode = 1;
})();
