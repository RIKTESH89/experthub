import {chromium, type Browser} from "@playwright/test";
import {createServer,type Server} from "http";
import {readFileSync} from "fs";
import {NextRequest} from "next/server";
import prisma from "@/lib/prisma";
let viewer="synthetic-visitor";
jest.mock("@/lib/auth",()=>({auth:async()=>({user:{id:viewer}})}));
import {POST as widgetChat} from "@/app/api/widget/chat/route";
import {GET as widgetConfig} from "@/app/api/widget/config/route";
import {POST as subscriberChat} from "@/app/api/chat/sessions/[sessionId]/messages/route";
let server:Server;let browser:Browser;let base:string;let prompts:{role:string;content:string}[][]=[];
const owner="synthetic-owner",expert="synthetic-ada";
beforeAll(async()=>{
 global.fetch=jest.fn(async(url,options)=>{
  if(url!=="https://api.openai.com/v1/chat/completions")throw new Error("External network forbidden");
  const body=JSON.parse(String(options?.body));if(body.stream!==true)throw new Error("Unexpected provider request");prompts.push(body.messages);
  return new Response('data: '+JSON.stringify({choices:[{delta:{content:"Synthetic grounded response"}}]})+'\n\ndata: [DONE]\n\n',{headers:{"Content-Type":"text/event-stream"}});
 });
 server=createServer(async(req,res)=>{
  try {
   const url=new URL(req.url||"/",base);let response:Response;
   if(url.pathname==="/") {res.setHeader("Content-Type","text/html");res.end('<html><body><script src="/embed/widget.js" data-api-key="synthetic-widget"></script></body></html>');return;}
   if(url.pathname==="/embed/widget.js"){res.setHeader("Content-Type","application/javascript");res.end(readFileSync("public/embed/widget.js"));return;}
   const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));
   const request=new NextRequest(url,{method:req.method,headers:{"Content-Type":"application/json"},...(req.method==="POST"?{body:Buffer.concat(chunks).toString()}: {})});
   if(url.pathname==="/api/widget/config")response=await widgetConfig(request);
   else if(url.pathname==="/api/widget/chat")response=await widgetChat(request);
   else if(url.pathname==="/api/chat/sessions/synthetic-session/messages")response=await subscriberChat(request,{params:Promise.resolve({sessionId:"synthetic-session"})});
   else {res.statusCode=404;res.end();return;}
   res.statusCode=response.status;response.headers.forEach((value,key)=>res.setHeader(key,value));
   if(response.body){const reader=response.body.getReader();while(true){const {done,value}=await reader.read();if(done)break;res.write(Buffer.from(value));}}res.end();
  }catch{res.statusCode=500;res.end("synthetic harness error");}
 });
 await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));const addr=server.address();if(!addr||typeof addr==="string")throw new Error("missing server");base=`http://127.0.0.1:${addr.port}`;
 browser=await chromium.launch({channel:"chrome",headless:true});
 console.info("Existing Chrome fresh-context version:",browser.version());
});
beforeEach(async()=>{
 const db=await prisma.$queryRaw<{name:string}[]>`SELECT current_database() AS name`;if(db[0].name!=="experthub_phase0_test")throw new Error("Unsafe test DB");
 await prisma.$executeRawUnsafe('TRUNCATE "KnowledgeLifecycleJob", "VectorChunk", "User" CASCADE');
 await prisma.user.create({data:{id:owner,email:"owner@example.invalid",role:"EXPERT",expertProfile:{create:{id:expert,displayName:"Synthetic Ada",specialty:[],vectorNamespace:"synthetic-ns"}}}});
 await prisma.user.create({data:{id:viewer,email:"visitor@example.invalid"}});
 await prisma.widgetConfig.create({data:{id:"synthetic-config",expertProfileId:expert,apiKey:"synthetic-widget",allowedDomains:[],freeQuestions:100}});
 prompts=[];
});
afterAll(async()=>{await browser?.close();if(server)await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await prisma.$disconnect();});
test("existing Chrome: actual embed persists signed identity and real route selects latest >50 messages",async()=>{
 const context=await browser.newContext();await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());const page=await context.newPage();
 await page.goto(base);await page.locator('#tw-widget-btn').click();await page.locator('#tw-input').fill("architecture");await page.locator('#tw-send').click();await page.getByText("Synthetic grounded response").waitFor();
 const identity=await page.evaluate(()=>({id:localStorage.getItem('_tw_vid_synthetic-widget'),token:localStorage.getItem('_tw_token_synthetic-widget')}));expect(identity.token).toMatch(/^[a-f0-9]{64}$/);
 const session=await prisma.widgetSession.findUniqueOrThrow({where:{widgetConfigId_visitorId:{widgetConfigId:"synthetic-config",visitorId:identity.id!}}});
 await prisma.widgetMessage.deleteMany({where:{widgetSessionId:session.id}});
 await prisma.widgetMessage.createMany({data:Array.from({length:64},(_,i)=>({id:`synthetic-msg-${String(i).padStart(3,"0")}`,widgetSessionId:session.id,role:"user",content:i===63?"LATEST SYNTHETIC CORRECTION":"old message",createdAt:new Date("2026-01-01T00:00:00Z")}))});
 await page.reload();await page.locator('#tw-widget-btn').click();await page.locator('#tw-input').fill("architecture");await page.locator('#tw-send').click();await page.getByText("Synthetic grounded response").waitFor();
 expect(prompts.at(-1)?.some(m=>m.content==="LATEST SYNTHETIC CORRECTION")).toBe(true);expect(await prisma.widgetSession.count()).toBe(1);
 const after=await page.evaluate(()=>localStorage.getItem('_tw_token_synthetic-widget'));expect(after).toBe(identity.token);
 const forged=await page.evaluate(async()=>{const response=await fetch('/api/widget/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({apiKey:'synthetic-widget',visitorId:'victim',visitorToken:'0'.repeat(64),message:'architecture'})});return response.status;});expect(forged).toBe(403);await context.close();
});
test("fresh Chrome subscriber fetch: newest history and warm premium permission downgrade removes evidence/history",async()=>{
 await prisma.chatSession.create({data:{id:"synthetic-session",subscriberId:viewer,expertProfileId:expert}});
 await prisma.chatMessage.createMany({data:Array.from({length:64},(_,i)=>({id:`synthetic-chat-${String(i).padStart(3,"0")}`,chatSessionId:"synthetic-session",senderId:viewer,role:"user",content:i===63?"LATEST SUBSCRIBER CORRECTION":"old chat",createdAt:new Date("2026-01-01T00:00:00Z")}))});
 await prisma.expertSubscription.create({data:{subscriberId:viewer,expertProfileId:expert,tier:"PREMIUM",...syntheticPaidPeriod,status:"ACTIVE",price:0}});
 const vectorId="synthetic-premium-vector";
 await prisma.knowledgeItem.create({data:{id:"premium-source",expertProfileId:expert,title:"Premium",content:"architecture PREMIUM_SYNTHETIC_ONLY",sourceType:"manual",metadata:{audience:"premium"},vectorIds:[vectorId],isIndexed:true,sourceVersion:1,indexedVersion:1}});
 await prisma.$executeRawUnsafe('INSERT INTO "VectorChunk" ("id","vectorId","namespace","content","metadata") VALUES ($1,$2,$3,$4,$5::jsonb)',"premiumchunk",vectorId,"synthetic-ns","architecture PREMIUM_SYNTHETIC_ONLY",JSON.stringify({expertProfileId:expert,embeddingModel:"text-embedding-3-small"}));
 const context=await browser.newContext();await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());const page=await context.newPage();await page.goto(base);
 const send=()=>page.evaluate(async()=>{const response=await fetch('/api/chat/sessions/synthetic-session/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:'architecture'})});return {status:response.status,body:await response.text()};});
 expect((await send()).status).toBe(200);expect(prompts.at(-1)?.some(m=>m.content==="LATEST SUBSCRIBER CORRECTION")).toBe(true);expect(JSON.stringify(prompts.at(-1))).toContain("PREMIUM_SYNTHETIC_ONLY");
 await prisma.expertSubscription.update({where:{subscriberId_expertProfileId:{subscriberId:viewer,expertProfileId:expert}},data:{tier:"STANDARD"}});
 const result=await send();expect(result.status).toBe(200);expect(result.body).not.toContain(vectorId);expect(JSON.stringify(prompts.at(-1))).not.toContain("PREMIUM_SYNTHETIC_ONLY");await context.close();
});

import { syntheticPaidPeriod } from "../../__tests__/helpers/paid-period";
