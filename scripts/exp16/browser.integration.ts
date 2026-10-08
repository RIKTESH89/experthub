import {createReviewedFixturePublisher} from '../launch-integration/reviewed-persona-fixture';
const releasePersona=createReviewedFixturePublisher();
import {chromium,type Browser,type Page} from "@playwright/test";
import {createServer,type Server} from "http";
import {readFileSync} from "fs";
import {NextRequest} from "next/server";
import prisma from "@/lib/prisma";
import {submitCorrection} from "@/lib/corrections/service";
import {publishEvidence} from "@/lib/graph/evidence-store";
let viewer="exp16-ui-owner", role="EXPERT", writes=0;
jest.mock("@/lib/auth",()=>({auth:async()=>({user:{id:viewer,role}})}));
jest.mock("@/lib/vector/embeddings",()=>({EMBEDDING_MODEL:"synthetic",generateEmbedding:()=>{throw Error("Provider prohibited");}}));
import {GET as queue,PATCH as decide} from "@/app/api/expert/corrections/route";
import {GET as releases,POST as release} from "@/app/api/expert/persona-releases/route";
import {GET as sources} from "@/app/api/expert/corrections/context/route";
import {POST as preview} from "@/app/api/expert/persona-releases/preview/route";
let server:Server,browser:Browser;
const base="http://127.0.0.1:3116",owner="exp16-ui-owner",expert="exp16-ui-expert";
const errors:string[]=[];
beforeAll(async()=>{
 const db=await prisma.$queryRaw<{name:string}[]>`SELECT current_database() AS name`;if(db[0].name!=="exp16_synthetic")throw Error("Wrong synthetic database");
 server=createServer(async(req,res)=>{try{
  const url=new URL(req.url||"/",base);
  if(url.pathname==="/app.js"){res.setHeader('Content-Type','application/javascript');res.end(readFileSync('.exp16-runtime/browser/app.js'));return;}
  if(url.pathname==="/style.css"){res.setHeader('Content-Type','text/css');res.end(readFileSync('.exp16-runtime/browser/style.css'));return;}
  if(!url.pathname.startsWith('/api/')){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><main class="p-6"><div id="root"></div></main><script src="/app.js"></script></body></html>');return;}
  const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));
  const request=new NextRequest(url,{method:req.method,headers:{'Content-Type':'application/json'},...(req.method==='POST'||req.method==='PATCH'?{body:Buffer.concat(chunks).toString()}:{})});
  let response:Response;
  if(url.pathname==='/api/expert/corrections/context')response=await sources();
  else if(url.pathname==='/api/expert/corrections'){if(req.method==='PATCH'){writes++;await new Promise(resolve=>setTimeout(resolve,100));response=await decide(request);}else response=await queue();}
  else if(url.pathname==='/api/expert/persona-releases/preview')response=await preview(request);
  else if(url.pathname==='/api/expert/persona-releases'){if(req.method==='POST'){writes++;response=await release(request);}else response=await releases();}
  else{res.statusCode=404;res.end();return;}
  res.statusCode=response.status;res.setHeader('Content-Type','application/json');res.end(await response.text());
 }catch(e){res.statusCode=500;res.end(JSON.stringify({error:String(e)}));}});
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(3116,'127.0.0.1',resolve);});
 browser=await chromium.launch({channel:'chrome',headless:true});console.info('Existing Chrome:',browser.version());
});
beforeEach(async()=>{
 releasePersona.clear();
 viewer=owner;role="EXPERT";writes=0;errors.length=0;
 await prisma.user.deleteMany({where:{id:owner}});
 await prisma.user.create({data:{id:owner,email:'ui-owner@example.test',role:'EXPERT',expertProfile:{create:{id:expert,displayName:'Synthetic expert',specialty:[],vectorNamespace:'exp16-ui'}}}});
 await prisma.knowledgeItem.create({data:{id:'ui-source',expertProfileId:expert,title:'Manual advice',content:'I prefer tea.',sourceType:'manual',metadata:{authorId:owner,audience:'public'},isIndexed:true,sourceVersion:1,indexedVersion:1,vectorIds:[`${expert}:ui-source:v1:chunk_0`]}});
 await prisma.$transaction(async tx=>{const item=await tx.knowledgeItem.findUniqueOrThrow({where:{id:'ui-source'}});await publishEvidence(tx,item,owner);});
 await submitCorrection({expertProfileId:expert,actorId:owner,submissionKey:'ui-feedback',proposal:{feedback:'Synthetic correction to review',itemId:'ui-source',sourceVersion:1,title:'Manual advice',content:'I prefer coffee.'}});
});
afterAll(async()=>{await browser?.close();if(server)await new Promise<void>(resolve=>server.close(()=>resolve()));await prisma.user.deleteMany({where:{id:owner}});await prisma.$disconnect();});
async function page(width=1100){const context=await browser.newContext({viewport:{width,height:900}});await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());const p=await context.newPage();p.setDefaultTimeout(8000);p.on('pageerror',e=>errors.push(e.message));await p.goto(`${base}/expert/reviews`);return {p,context};}
async function loaded(p:Page){await p.getByRole('heading',{name:'Correction queue'}).waitFor();}
test('owner sees status/audit and mobile/desktop layout; cancel sends no write',async()=>{
 const {p,context}=await page();await loaded(p);
 await p.screenshot({path:'audit/exp16/ui-desktop.png',fullPage:true});
 await p.getByRole('button',{name:'Accept',exact:true}).click();await p.getByLabel('Reason for this decision (required)').fill('Synthetic verified');
 await p.getByRole('button',{name:'Cancel and return to reviews'}).click();expect(writes).toBe(0);
 
 await p.setViewportSize({width:375,height:812});await p.screenshot({path:'audit/exp16/ui-mobile.png',fullPage:true});
 expect(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await p.evaluate(()=>document.documentElement.classList.add('dark'));await p.screenshot({path:'audit/exp16/ui-dark.png',fullPage:true});
 expect(errors).toEqual([]);await p.getByRole('link',{name:'Back to twin settings'}).click();expect(p.url()).toContain('/expert/twin');expect(writes).toBe(0);await context.close();
});
test('rapid repeated acceptance writes once and reports queued recomputation',async()=>{
 const {p,context}=await page();await loaded(p);await p.getByRole('button',{name:'Accept',exact:true}).click();await p.getByLabel('Reason for this decision (required)').fill('Verified synthetic source');
 const confirm=p.getByRole('button',{name:'Confirm acceptance'});await confirm.evaluate(button=>{(button as HTMLButtonElement).click();(button as HTMLButtonElement).click();});
 await p.getByRole('status').filter({hasText:'Correction accepted'}).waitFor();expect(writes).toBe(1);
 expect(await prisma.knowledgeLifecycleJob.count({where:{expertProfileId:expert}})).toBe(1);
 await p.getByText('Decision history').click();await p.getByText('Source 1 → 2').waitFor();
 expect(errors).toEqual([]);await context.close();
});
test('source CAS conflict requires refresh before further decision',async()=>{
 const {p,context}=await page();await loaded(p);await p.getByRole('button',{name:'Accept',exact:true}).click();await p.getByLabel('Reason for this decision (required)').fill('Before concurrent edit');
 await prisma.knowledgeItem.update({where:{id:'ui-source'},data:{sourceVersion:2,content:'I prefer water.'}});
 await p.getByRole('button',{name:'Confirm acceptance'}).click();await p.getByRole('alert').filter({hasText:'Conflict:'}).waitFor();expect(await p.getByRole('button',{name:'Confirm acceptance'}).isDisabled()).toBe(true);
 await p.getByRole('button',{name:'Refresh reviews'}).click();await p.getByRole('status').filter({hasText:'Latest reviews'}).waitFor();expect(await p.getByRole('button',{name:'Accept',exact:true}).isDisabled()).toBe(true);
 expect(await prisma.knowledgeItem.findUnique({where:{id:'ui-source'}})).toMatchObject({content:'I prefer water.',sourceVersion:2});await context.close();
});
test('revise saves a pending proposal; reject records reason without changing beliefs',async()=>{
 const {p,context}=await page();await loaded(p);await p.getByRole('button',{name:'Revise',exact:true}).click();await p.getByLabel('Corrected content').fill('I prefer cocoa.');await p.getByLabel('Reason for this decision (required)').fill('Revise synthetic wording');await p.getByRole('button',{name:'Save revised proposal'}).click();await p.getByRole('status').filter({hasText:'Revised proposal saved'}).waitFor();
 expect(await prisma.knowledgeItem.findUnique({where:{id:'ui-source'}})).toMatchObject({content:'I prefer tea.',sourceVersion:1});
 await p.getByRole('button',{name:'Reject',exact:true}).click();await p.getByLabel('Reason for this decision (required)').fill('Still unsupported');await p.getByRole('button',{name:'Confirm rejection'}).click();await p.getByRole('status').filter({hasText:'Correction rejected'}).waitFor();expect(writes).toBe(2);await context.close();
});
test('release create and rollback preview/cancel/confirm never restore a revoked source',async()=>{
 const first=await releasePersona({expertProfileId:expert,actorId:owner,operationKey:'first',expectedHead:null});
 await prisma.expertProfile.update({where:{id:expert},data:{twinOpinions:'Synthetic change'}});
 const {p,context}=await page();await loaded(p);await p.getByRole('button',{name:'Create release',exact:true}).click();await p.getByRole('button',{name:'Cancel release'}).click();expect(writes).toBe(0);
 await p.getByRole('button',{name:'Create release',exact:true}).click();await p.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Confirm new release'&&!b.disabled));await p.getByRole('button',{name:'Confirm new release'}).evaluate(button=>{(button as HTMLButtonElement).click();(button as HTMLButtonElement).click();});await p.getByRole('status').filter({hasText:'Reviewed release activated'}).waitFor();expect(writes).toBe(1);
 const firstCard=p.locator('li').filter({has:p.getByText(first.id,{exact:true})});await firstCard.getByRole('button',{name:'Preview rollback'}).click();await p.getByRole('region',{name:'Rollback preview'}).waitFor();expect(writes).toBe(1);
 await p.getByRole('button',{name:'Cancel release'}).click();expect(writes).toBe(1);
 await firstCard.getByRole('button',{name:'Preview rollback'}).click();await p.getByRole('button',{name:'Confirm rollback'}).waitFor();
 await prisma.knowledgeItem.update({where:{id:'ui-source'},data:{metadata:{authorId:owner,audience:'private'}}});
 await p.getByRole('button',{name:'Confirm rollback'}).click();await p.getByRole('alert').filter({hasText:'Conflict:'}).waitFor();expect(writes).toBe(2);expect(await p.getByRole('button',{name:'Confirm rollback'}).isDisabled()).toBe(true);
 expect((await prisma.expertProfile.findUniqueOrThrow({where:{id:expert}})).twinOpinions).toBe('Synthetic change');
 await p.getByRole('button',{name:'Cancel release'}).click();await firstCard.getByRole('button',{name:'Preview rollback'}).click();await p.getByRole('alert').filter({hasText:'Every source must have a current supported evidence revision'}).waitFor();expect(await p.getByRole('button',{name:'Confirm rollback'}).isDisabled()).toBe(true);await context.close();
});
test('unsupported source is excluded from correction choices',async()=>{
 await prisma.knowledgeItem.create({data:{expertProfileId:expert,title:'Imported document',content:'Synthetic PDF',sourceType:'document',isIndexed:true,sourceVersion:1,indexedVersion:1,vectorIds:[]}});
 const {p,context}=await page();await loaded(p);await p.getByText('1 source(s) require an unsupported adapter.',{exact:false}).waitFor();await p.getByRole('button',{name:'Revise',exact:true}).click();expect(await p.getByRole('option',{name:/Imported document/}).count()).toBe(0);
 await p.getByRole('button',{name:'Cancel and return to reviews'}).click();await p.getByRole('button',{name:'Create release',exact:true}).click();await p.getByRole('alert').filter({hasText:'supported evidence revision'}).waitFor();expect(await p.getByRole('button',{name:'Confirm new release'}).isDisabled()).toBe(true);await context.close();
});
test('visitor cannot load owner data or use owner endpoints',async()=>{
 viewer='exp16-ui-visitor';role='SUBSCRIBER';const {p,context}=await page();await p.getByRole('alert').filter({hasText:'Expert owner access required'}).waitFor();expect(await p.getByText('Synthetic correction to review').count()).toBe(0);
 const status=await p.evaluate(async()=>{const r=await fetch('/api/expert/persona-releases/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedHead:null,rollbackTo:'anything'})});return r.status;});expect(status).toBe(403);await context.close();
});
test('rollback preview cannot re-enable currently disabled RAG access',async()=>{
 const first=await releasePersona({expertProfileId:expert,actorId:owner,operationKey:'rag-first',expectedHead:null});
 await prisma.expertProfile.update({where:{id:expert},data:{ragEnabled:false}});
 const {p,context}=await page();await loaded(p);await p.getByRole('button',{name:'Preview rollback'}).click();await p.getByRole('alert').filter({hasText:'cannot change current RAG permission'}).waitFor();expect(await p.getByRole('button',{name:'Confirm rollback'}).isDisabled()).toBe(true);expect(writes).toBe(0);expect(first.manifest.config.ragEnabled).toBe(true);await context.close();
});
test('safe rollback confirmation restores settings as a new release only',async()=>{
 const first=await releasePersona({expertProfileId:expert,actorId:owner,operationKey:'safe-first',expectedHead:null});
 await prisma.expertProfile.update({where:{id:expert},data:{twinOpinions:'Synthetic newer opinion'}});
 await releasePersona({expertProfileId:expert,actorId:owner,operationKey:'safe-second',expectedHead:first.id});
 const {p,context}=await page();await loaded(p);
 const firstCard=p.locator('li').filter({has:p.getByText(first.id,{exact:true})});await firstCard.getByRole('button',{name:'Preview rollback'}).click();await p.getByText('Draft Opinions',{exact:true}).waitFor();
 expect(writes).toBe(0);await p.getByRole('button',{name:'Confirm rollback'}).click();await p.getByRole('status').filter({hasText:'Reviewed release activated'}).waitFor();expect(writes).toBe(1);
 expect((await prisma.expertProfile.findUniqueOrThrow({where:{id:expert}})).twinOpinions).toBe(null);
 expect(await prisma.knowledgeItem.findUnique({where:{id:'ui-source'}})).toMatchObject({sourceVersion:1,content:'I prefer tea.'});
 await p.screenshot({path:'audit/exp16/ui-release-history.png',fullPage:true});expect(errors).toEqual([]);await context.close();
});
test('warm owner access loss clears already loaded review data on refresh',async()=>{
 const {p,context}=await page();await loaded(p);viewer='exp16-ui-visitor';role='SUBSCRIBER';await p.getByRole('button',{name:'Refresh reviews'}).click();await p.getByRole('alert').filter({hasText:'Expert owner access required'}).waitFor();expect(await p.getByText('Synthetic correction to review').count()).toBe(0);expect(writes).toBe(0);await context.close();
});
