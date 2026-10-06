const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');let browser;
// Regression for queued static homepage fragments: real mouse navigation,
// native poster decode, failure/retry, latest fragment and owned cleanup.
const base=process.env.EXPERTHUB_LOCAL_UI_ORIGIN || 'http://127.0.0.1:4047';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Local preview origin required');
const outDir=path.resolve(process.env.EXPERTHUB_NAVIGATION_EVIDENCE_DIR || 'audit/static-home-navigation');fs.mkdirSync(outDir,{recursive:true});
const records=[],errors=[];const assert=(c,m,d)=>{if(!c)throw Error(m+' '+JSON.stringify(d));};
const targets={Pricing:'plans',Apply:'apply-expert'};
async function setup(mode,fail=false){
 const context=await browser.newContext({viewport:mode==='compact'?{width:844,height:390}:{width:390,height:844},deviceScaleFactor:1,reducedMotion:mode==='reduced'?'reduce':'no-preference'});
 let releaseFailure,requested,broken=fail,models=0;
 const requestedFailure=new Promise(r=>requested=r),heldFailure=new Promise(r=>releaseFailure=r);
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.pathname==='/manifest.json'||!['127.0.0.1','localhost'].includes(u.hostname))return route.abort();if(u.pathname.endsWith('.glb'))models++;if(broken&&u.pathname.endsWith('brain-poster-dark.png')){requested();await heldFailure;await route.fulfill({status:404,body:'Deliberate missing-poster regression'}).catch(()=>{});return;}return route.continue();});
 await context.addInitScript(()=>{
  localStorage.setItem('theme','light');localStorage.setItem('pwa-install-dismissed',String(Date.now()));
  const decode=HTMLImageElement.prototype.decode;window.__posterDecodes=0;window.__nativeDecoded=0;window.__decodeErrors=[];window.__posterDecodeWaiting=false;window.__posterDecodeResolvers=[];window.__releasePosterDecode=()=>{const pending=window.__posterDecodeResolvers.splice(0);window.__posterDecodeWaiting=false;pending.forEach(resolve=>resolve());};
  HTMLImageElement.prototype.decode=function(){
   const native=decode.call(this);if(!this.classList.contains('reading-poster'))return native;
   window.__posterDecodes++;
   return native.then(()=>{window.__nativeDecoded++;return new Promise(resolve=>{window.__posterDecodeWaiting=true;window.__posterDecodeResolvers.push(resolve);});},error=>{window.__decodeErrors.push(String(error));throw error;});
  };
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack||e.message));await page.goto(base,{waitUntil:'domcontentloaded',timeout:90000});
 if(fail){await requestedFailure;await page.waitForFunction(()=>document.querySelector('[data-smooth-wrapper]')?.inert);}else await page.waitForFunction(()=>window.__posterDecodeWaiting,null,{timeout:15000}).catch(async error=>{console.error('SETUP DIAGNOSTIC',await page.evaluate(()=>({dataset:{...document.querySelector('[data-digital-brain-home]')?.dataset},decodes:window.__posterDecodes,nativeDecoded:window.__nativeDecoded,decodeErrors:window.__decodeErrors,images:[...document.images].map(i=>({src:i.src,classes:i.className,width:i.naturalWidth,complete:i.complete})),body:document.body.innerText.slice(0,500)})));throw error;});
 return {page,context,releaseFailure,allowPoster:()=>{broken=false;},modelCount:()=>models};
}
async function state(page,target){return page.evaluate(id=>{
 const root=document.querySelector('[data-digital-brain-home]'),section=id?document.getElementById(id):null,heading=section?.querySelector('h1,h2,h3'),rect=heading?.getBoundingClientRect();
 return {path:location.pathname,hash:location.hash,ready:root?.dataset.illustrationReady,renderer:root?.dataset.renderer,decoded:root?.dataset.posterDecoded,posterWidth:root?.querySelector('.reading-poster')?.naturalWidth,mainVisibility:root?getComputedStyle(root.querySelector('[data-smooth-wrapper]')).visibility:null,inert:root?.querySelector('[data-smooth-wrapper]')?.inert,activeTag:document.activeElement.tagName,activeText:document.activeElement.textContent.trim().slice(0,180),headingFocused:!!heading&&document.activeElement===heading,headingTabIndex:heading?.getAttribute('tabindex'),headingRect:rect?{x:rect.x,y:rect.y,right:rect.right,bottom:rect.bottom}:null,headerBottom:root?.querySelector('header')?.getBoundingClientRect().bottom,scrollY,htmlOverflow:getComputedStyle(document.documentElement).overflow,bodyOverflow:getComputedStyle(document.body).overflow,decodeWaiting:!!window.__posterDecodeWaiting,decodes:window.__posterDecodes};
},target);}
async function click(page,name){await page.locator('header a[href="#'+targets[name]+'"]').click();}
async function revealed(page,target){await page.evaluate(()=>window.__releasePosterDecode());await page.waitForFunction(id=>document.querySelector('[data-digital-brain-home]')?.dataset.illustrationReady==='true'&&document.activeElement===document.getElementById(id)?.querySelector('h1,h2,h3'),target,{timeout:10000}).catch(async error=>{console.error('REVEAL DIAGNOSTIC',await state(page,target));throw error;});await page.waitForTimeout(120);const s=await state(page,target);assert(s.renderer==='static'&&s.decoded==='true'&&s.posterWidth>0&&!s.inert&&s.headingFocused&&s.hash==='#'+target,'Decoded static navigation failed',s);assert(s.headingRect.y>=s.headerBottom+15&&s.headingRect.bottom<=await page.evaluate(()=>innerHeight),'Destination heading hidden/clipped',s);return s;}
function pending(s){assert(s.ready==='false'&&s.mainVisibility==='hidden'&&s.inert&&!s.headingFocused,'Pending navigation bypassed poster gate',s);}
async function record(data){records.push(data);fs.writeFileSync(path.join(outDir,'NAVIGATION-CHECKS.json'),JSON.stringify({records,errors},null,2));console.log('PASS',data.name);}
(async()=>{
 browser=await chromium.launch({executablePath:process.env.EXPERTHUB_BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-background-networking','--disable-component-update','--no-first-run']});
 for(const mode of ['reduced','compact'])for(const name of ['Pricing','Apply'])for(const fail of [false,true]){
  const {page,context,releaseFailure,allowPoster,modelCount}=await setup(mode,fail),target=targets[name];
  await click(page,name);const before=await state(page,target);pending(before);assert(before.hash==='#'+target,'Fragment was not queued',before);
  let failed,retrying;
  if(fail){
   releaseFailure();await page.waitForSelector('.brain-retry',{timeout:10000});failed=await state(page,target);pending(failed);assert(failed.renderer==='error','Missing poster did not show error',failed);
   allowPoster();await page.getByRole('button',{name:'Try again'}).click();await page.waitForFunction(()=>window.__posterDecodeWaiting,null,{timeout:10000});retrying=await state(page,target);pending(retrying);assert(retrying.hash==='#'+target,'Retry discarded requested destination',retrying);
  }
  const after=await revealed(page,target);assert(modelCount()===0,'Static navigation initialized WebGL scene');
  if(!fail)await page.screenshot({path:path.join(outDir,'ExpertHub-'+mode+'-'+name.toLowerCase()+'.png')});
  assert(name!=='Apply'||after.headingTabIndex==='-1','Apply heading lost owned focusability',after);
  await record({name:mode+' '+name+' '+(fail?'poster failure/retry':'delayed poster decode'),before,failed,retrying,after,modelRequests:modelCount()});await context.close();
 }
 for(const mode of ['reduced','compact']){
  const {page,context}=await setup(mode);await click(page,'Pricing');await click(page,'Apply');const before=await state(page,'apply-expert');pending(before);const after=await revealed(page,'apply-expert');await record({name:mode+' latest queued fragment wins',before,after});await context.close();
 }
 for(const mode of ['reduced','compact']){
  const {page,context}=await setup(mode);await click(page,'Pricing');const before=await state(page,'plans');pending(before);
  await page.locator('header a[href="/login"]').click();await page.waitForURL('**/login',{timeout:45000});const exited=await state(page,'plans');await page.evaluate(()=>window.__releasePosterDecode?.());await page.waitForTimeout(200);const late=await state(page,'plans');
  assert(late.path==='/login'&&!late.ready&&!late.headingFocused&&late.htmlOverflow!=='hidden'&&late.bodyOverflow!=='hidden','Late static navigation survived route disposal',late);await record({name:mode+' pending decode route exit cancels navigation',before,exited,late});await context.close();
 }
 for(const mode of ['reduced','compact']){
  const {page,context}=await setup(mode);await click(page,'Apply');const after=await revealed(page,'apply-expert');await page.evaluate(()=>window.__previousHeading=document.querySelector('#apply-expert h2'));await page.locator('header a[href="/login"]').click();await page.waitForURL('**/login',{timeout:45000});const disposed=await page.evaluate(()=>({path:location.pathname,connected:window.__previousHeading.isConnected,tabindex:window.__previousHeading.getAttribute('tabindex'),stillFocused:document.activeElement===window.__previousHeading}));assert(disposed.path==='/login'&&!disposed.connected&&disposed.tabindex===null&&!disposed.stillFocused,'Owned heading tabindex/focus leaked after disposal',disposed);await record({name:mode+' focused heading cleanup after route exit',after,disposed});await context.close();
 }
 assert(errors.length===0,'Unexpected page errors',errors);await browser.close();console.log('ALL 14 STATIC NAVIGATION CASES PASSED');
})().catch(async e=>{console.error(e);fs.writeFileSync(path.join(outDir,'FAILURE.json'),JSON.stringify({error:e.stack,records,errors},null,2));await browser?.close();process.exitCode=1});
