// Built Preview server; no database startup, provider traffic, or auth bypass in app.
const { chromium } = require('@playwright/test');
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path');
const base = 'http://127.0.0.1:3342'; const secret = 'synthetic-preview-browser-only';
let server, browser;
(async () => {
 const log = fs.openSync('audit/preview-isolation/server.log', 'w');
 server = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3342'], { stdio:['ignore',log,log], env:{ PATH:'/opt/homebrew/bin:/usr/bin:/bin', VERCEL_ENV:'preview', AUTH_SECRET:secret, AUTH_TRUST_HOST:'true', AUTH_URL:base, NEXT_TELEMETRY_DISABLED:'1', NODE_OPTIONS:`--require=${path.resolve('scripts/exp25-26/network-guard.cjs')}`, OPENAI_API_KEY:'synthetic-inherited', RESEND_API_KEY:'synthetic-inherited', RAZORPAY_KEY_ID:'synthetic-inherited', RAZORPAY_KEY_SECRET:'synthetic-inherited', AWS_ACCESS_KEY_ID:'synthetic-inherited', AWS_SECRET_ACCESS_KEY:'synthetic-inherited', GOOGLE_CLIENT_ID:'synthetic-inherited', GOOGLE_CLIENT_SECRET:'synthetic-inherited', RAZORPAY_WEBHOOK_SECRET:'synthetic-inherited' } }); fs.closeSync(log);
 for(let i=0;i<100;i++){ try { if((await fetch(base+'/login')).ok)break; } catch{} await new Promise(r=>setTimeout(r,100)); }
 browser = await chromium.launch({channel:'chrome',headless:true}); const context=await browser.newContext(); const attemptedExternal=[];
 await context.route('**/*', route=>{const url=route.request().url();if(!url.startsWith(base+'/')){attemptedExternal.push(new URL(url).hostname);return route.abort();}return route.continue();});
 const page=await context.newPage(); await page.goto(base+'/login');
 if(!await page.getByRole('button',{name:'Google sign-in disabled in Preview'}).isDisabled())throw Error('Google client not disabled');
 const api=async(url,body)=>page.evaluate(async({url,body})=>{const r=await fetch(url,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};},{url,body});
 const providers=await api('/api/auth/providers');if(providers.status!==200||Object.keys(providers.body).length)throw Error('Google provider exposed');
 const {encode}=await import('next-auth/jwt');const token=await encode({token:{id:'synthetic-no-db',role:'SUBSCRIBER'},secret,salt:'authjs.session-token',maxAge:60});
 await context.addCookies([{name:'authjs.session-token',value:token,url:base,httpOnly:true,sameSite:'Lax'}]);
 const outcomes=[];for(const url of ['/api/payments/webhook','/api/payments/create-subscription','/api/payments/cancel','/api/upload','/api/email/digest']){const r=await api(url,{});if(r.status!==503)throw Error('Preview route '+url+' returned '+r.status);outcomes.push({url,status:r.status});}
 await page.waitForTimeout(500);if(attemptedExternal.length)throw Error('Browser attempted external requests: '+attemptedExternal.join(','));
 const routes=JSON.parse(fs.readFileSync('.next/routes-manifest.json'));if((Array.isArray(routes.rewrites) ? routes.rewrites : [...(routes.rewrites.beforeFiles || []), ...(routes.rewrites.afterFiles || []), ...(routes.rewrites.fallback || [])]).some(r=>String(r.destination).includes('sentry')))throw Error('Sentry tunnel remains');
 fs.writeFileSync('audit/preview-isolation/browser.json',JSON.stringify({browser:browser.version(),google:'disabled in client and provider declaration',outcomes,externalAttempts:attemptedExternal,sentryTunnel:'absent',database:'not started or configured',limitations:['Synthetic JWT gates only; no real OAuth or providers','Offline font substitution']},null,2));
 console.log('PASS built Preview: Google disabled, 5 provider routes blocked before DB, no browser external requests, no Sentry tunnel');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();if(server){server.kill('SIGTERM');await new Promise(r=>{server.once('exit',r);setTimeout(()=>{server.kill('SIGKILL');r();},5000).unref();});}});
