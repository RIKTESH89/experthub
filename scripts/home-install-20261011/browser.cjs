const fs = require('fs'), path = require('path'), net = require('net'), {spawn} = require('child_process');
const app = path.resolve(__dirname, '../..'), out = path.join(app, 'audit/home-install-20261011');
const {chromium} = require(path.join(app, 'node_modules/playwright'));
const port = 3537, origin = `http://127.0.0.1:${port}`;
const env = {PATH:'/opt/homebrew/bin:/usr/bin:/bin', NODE_ENV:'production', VERCEL:'1', VERCEL_ENV:'preview', VERCEL_GIT_COMMIT_REF:'exp25-26-launch-auth-payments', VERCEL_BRANCH_URL:'experthub-git-exp25-26-launch-au-e842c4-riktesh-singhs-projects.vercel.app', EXPERTHUB_STAGING_MIGRATE:'0', NEXT_TELEMETRY_DISABLED:'1', AUTH_SECRET:'synthetic-build-only-secret', DATABASE_URL:'postgresql://synthetic:synthetic@127.0.0.1:59997/no_database', DIRECT_URL:'postgresql://synthetic:synthetic@127.0.0.1:59997/no_database', EXPERTHUB_STAGING_GOOGLE_CLIENT_ID:'123456-synthetic.apps.googleusercontent.com', EXPERTHUB_STAGING_GOOGLE_APPROVED_CLIENT_ID:'123456-synthetic.apps.googleusercontent.com', EXPERTHUB_STAGING_GOOGLE_CLIENT_SECRET:'synthetic-build-only', EXPERTHUB_STAGING_GOOGLE_ENABLED:'1', NODE_OPTIONS:'--require='+path.join(app,'scripts/exp25-26/network-guard.cjs')};
let server, browser, log; const checks=[], errors=[], external=[];
const assert = (condition, message) => {if(!condition) throw new Error(message)};
async function absent(page, name) {
  assert(await page.getByRole('complementary', {name:'Install ExpertHub'}).count()===0, name+' install card');
  assert(await page.getByRole('button', {name:'Install App', exact:true}).count()===0, name+' install option');
  assert(await page.getByRole('dialog', {name:/Install/}).count()===0, name+' install guide');
  checks.push({name, status:'PASS'});
}
async function nativeEvent(page) {
  return page.evaluate(() => {
    const event = new Event('beforeinstallprompt', {cancelable:true});
    window.__installPromptCalls = 0;
    Object.assign(event, {prompt:async () => {window.__installPromptCalls++}, userChoice:Promise.resolve({outcome:'accepted'})});
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
}
(async () => {
  await new Promise((resolve,reject) => {const probe=net.createServer();probe.once('error',reject);probe.listen(port,'127.0.0.1',()=>probe.close(resolve));});
  log=fs.openSync(path.join(out,'browser-server.log'),'w');
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{cwd:app,env,stdio:['ignore',log,log]});
  let ready=false;
  for(let i=0;i<100;i++) {
    assert(server.exitCode===null,'Owned server exited');
    if(fs.readFileSync(path.join(out,'browser-server.log'),'utf8').includes('Ready in')) {try {if((await fetch(origin+'/about')).ok){ready=true;break}}catch{}}
    await new Promise(r=>setTimeout(r,200));
  }
  assert(ready,'Owned server readiness');
  browser=await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  for(const [name, options] of [['desktop',{viewport:{width:1440,height:900}}], ['mobile',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}], ['ios-emulated',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'}]]) {
    const context=await browser.newContext({...options,serviceWorkers:'block'});
    await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==origin){external.push(url.origin+url.pathname);return route.abort()}assert(server.exitCode===null,'Owned server unavailable');return route.continue()});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+'/?install-eligible=delayed');
    await page.locator('footer').waitFor({state:'attached'});
    await absent(page,name+' homepage initial with query');
    // A real wall-clock wait exceeds the original fallback; this is not fake timer evidence.
    await page.waitForTimeout(5500);
    await absent(page,name+' homepage after5s fallback');
    assert(await nativeEvent(page)===false,name+' home does not intercept native install');
    await page.waitForTimeout(100);
    await absent(page,name+' homepage after synthetic delayed eligible event');
    assert(await page.evaluate(()=>window.__installPromptCalls)===0,name+' no installer launch');
    assert(await page.evaluate(()=>localStorage.getItem('pwa-install-dismissed'))===null,name+' no global dismissal mutation');
    assert(await page.locator('link[rel="manifest"]').getAttribute('href')==='/manifest.json',name+' manifest retained');
    await page.screenshot({path:path.join(out,name+'-homepage.png')});
    checks.push({name:name+' homepage native event not intercepted / manifest retained / no dismissal',status:'PASS'});
    await page.goto(origin+'/about');
    await page.waitForTimeout(5500);
    await page.getByRole('button',{name:'Install App',exact:true}).waitFor();
    await page.getByRole('button',{name:'Install App',exact:true}).click();
    await page.getByRole('dialog',{name:name==='ios-emulated'?'Install on iOS':'Install ExpertHub',exact:true}).waitFor();
    await page.getByRole('button',{name:'Got it',exact:true}).click();
    // Interception and prompt execution still work on a non-home route.
    assert(await nativeEvent(page)===true,name+' other route intercepts native install');
    await page.getByRole('button',{name:'Install App',exact:true}).click();
    await page.getByRole('button',{name:'Install App',exact:true}).waitFor({state:'hidden'});
    assert(await page.evaluate(()=>window.__installPromptCalls)===1,name+' other route native prompt');
    checks.push({name:name+' other-route fallback / manual guide / native action',status:'PASS'});
    // Re-eligibility, then actual Next client navigation while its manual dialog is open.
    await page.reload();await page.waitForTimeout(5500);
    await page.getByRole('button',{name:'Install App',exact:true}).click();
    await page.getByRole('dialog').waitFor();
    await page.evaluate(()=>{window.__spaMarker='preserved';document.querySelector('header a[href="/"]').click()});
    await page.waitForURL(origin+'/');
    assert(await page.evaluate(()=>window.__spaMarker)==='preserved',name+' genuine client navigation');
    await absent(page,name+' client navigation hides prior guide and card');
    assert(await nativeEvent(page)===false,name+' navigation removes native interception');
    await context.close();
  }
  assert(errors.length===0,'Page errors: '+errors.join(';'));
  assert(external.length===0,'External attempts: '+external.join(';'));
  console.log('PASS '+checks.length+' actual built-browser checks');
})().catch(error=>{console.error(error);errors.push(error.message);process.exitCode=1}).finally(async()=>{
  await browser?.close();
  if(server&&server.exitCode===null){server.kill('SIGTERM');await Promise.race([new Promise(r=>server.once('exit',r)),new Promise(r=>setTimeout(r,5000))]);if(server.exitCode===null)server.kill('SIGKILL')}
  if(log!==undefined)fs.closeSync(log);
  fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({status:process.exitCode?'FAIL':'PASS',browser:browser?.version(),buildId:fs.readFileSync(path.join(app,'.next/BUILD_ID'),'utf8'),checks,errors,external,limits:['Local compiled Preview app with synthetic auth configuration, unreachable loopback database and all external network blocked','Headless installed Chrome; mobile and iOS user-agent emulation, not physical Safari/iPhone','Synthetic beforeinstallprompt proves app response, not genuine browser installability','Service workers blocked in isolated browser only; app manifest and service-worker implementation unchanged','No hosted, provider, real OAuth, database or billing action']},null,2));
});
