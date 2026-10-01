import prisma,{resetAllMocks} from "../mocks/prisma";
const auth=jest.fn();const engine=jest.fn();const memoryExtractor=jest.fn();const save=jest.fn();
jest.mock("@/lib/prisma",()=>({__esModule:true,default:prisma}));
jest.mock("@/lib/auth",()=>({auth}));
jest.mock("@/lib/ai/chat-engine",()=>({runChatEngine:engine}));
jest.mock("@/lib/ai/memory-extractor",()=>({extractMemories:memoryExtractor}));
jest.mock("@/lib/ai/memory-manager",()=>({saveMemories:save}));
jest.mock("@/lib/rate-limit",()=>({rateLimit:()=>({allowed:true})}));
import {POST as oldSubscriberChat} from "../../audit/phase0/frozen/messages";
import { POST as subscriberChat } from "@/app/api/chat/sessions/[sessionId]/messages/route";
import { POST as widgetChat } from "@/app/api/widget/chat/route";
import { widgetIdentity } from "@/lib/ai/widget-identity";
import { createPOST } from "../helpers/request";
const messages=Array.from({length:64},(_,i)=>({id:`message-${String(i).padStart(3,"0")}`,role:"user",content:i===63?"Correction: my team now has 20 engineers":`message ${i}`,createdAt:new Date("2026-09-30"),sources:null}));
function ordered(query:{orderBy:unknown;take:number}) {const desc=JSON.stringify(query.orderBy).includes("desc");return [...messages].sort((a,b)=>desc?b.id.localeCompare(a.id):a.id.localeCompare(b.id)).slice(0,query.take);}
beforeEach(()=>{
 resetAllMocks();auth.mockReset();engine.mockReset();memoryExtractor.mockResolvedValue([]);process.env.AUTH_SECRET="synthetic-phase0-signing-secret";
 auth.mockResolvedValue({user:{id:"visitor-a",role:"SUBSCRIBER"}});
 prisma.chatSession.findUnique.mockImplementation(async({include}: {include:{messages:{orderBy:unknown;take:number}}})=>({id:"session-a",subscriberId:"visitor-a",expertProfileId:"ada",expertProfile:{userId:"ada-owner"},isTrial:false,messages:ordered(include.messages)}));
 prisma.expertSubscription.findUnique.mockResolvedValue({status:"ACTIVE",tier:"PREMIUM",...syntheticPaidPeriod});prisma.expertPricingTier.findUnique.mockResolvedValue({monthlyQuestions:null});
 prisma.chatMessage.create.mockResolvedValue({});prisma.monthlyTwinUsage.upsert.mockResolvedValue({});
 prisma.widgetConfig.findUnique.mockResolvedValue({id:"widget-ada",isEnabled:true,freeQuestions:100,expertProfile:{id:"ada",userId:"ada-owner"}});
 prisma.widgetSession.upsert.mockResolvedValue({id:"widget-session-a",questionCount:0});prisma.widgetMessage.findMany.mockImplementation(async(query:{orderBy:unknown;take:number})=>ordered(query));
 engine.mockImplementation(async()=>({stream:new ReadableStream({start(controller){controller.close();}}),sources:[],thinkingSteps:[]}));
});
afterEach(()=>{delete process.env.AUTH_SECRET;});
test("EXP10 subscriber >50 messages gets latest correction and stable tie ordering",async()=>{
 const response=await subscriberChat(createPOST("/api/chat/sessions/session-a/messages",{content:"What next?"}),{params:Promise.resolve({sessionId:"session-a"})});await response.text();
 const history=engine.mock.calls[0][0].chatHistory;expect(history).toHaveLength(20);expect(history[0].content).toBe("message 44");expect(history[19].content).toBe("Correction: my team now has 20 engineers");
 expect(prisma.chatSession.findUnique.mock.calls[0][0].include.messages.orderBy).toEqual([{createdAt:"desc"},{id:"desc"}]);
});
test("widget uses identical latest/history ordering and no subscriber memory identity",async()=>{
 const identity=widgetIdentity("widget-ada",null,null);
 const response=await widgetChat(createPOST("/api/widget/chat",{apiKey:"public-widget",visitorId:identity.visitorId,visitorToken:identity.token,message:"What next?"}));await response.text();
 const options=engine.mock.calls[0][0];expect(options.chatHistory.at(-1).content).toBe("Correction: my team now has 20 engineers");expect(options.chatHistory[0].content).toBe("message 44");expect(options.subscriberId).toBeUndefined();expect(options.expertId).toBe("ada-owner");
});
test("wrong subscriber cannot read another session or use its history",async()=>{auth.mockResolvedValue({user:{id:"visitor-b"}});const response=await subscriberChat(createPOST("/api/chat/sessions/session-a/messages",{content:"secret?"}),{params:Promise.resolve({sessionId:"session-a"})});expect(response.status).toBe(403);expect(engine).not.toHaveBeenCalled();});
test("unproven widget ID receives a fresh server identity; token binds visitor and expert",()=>{
 const first=widgetIdentity("widget-ada","victim-id",null);expect(first.visitorId).not.toBe("victim-id");expect(widgetIdentity("widget-ada",first.visitorId,first.token)).toEqual(first);
 expect(()=>widgetIdentity("widget-ben",first.visitorId,first.token)).toThrow("Invalid widget identity");expect(()=>widgetIdentity("widget-ada","victim-id",first.token)).toThrow("Invalid widget identity");
});
test("invalid visitor proof fails before history/model calls",async()=>{const response=await widgetChat(createPOST("/api/widget/chat",{apiKey:"key",visitorId:"victim",visitorToken:"0".repeat(64),message:"secret?"}));expect(response.status).toBe(403);expect(prisma.widgetMessage.findMany).not.toHaveBeenCalled();expect(engine).not.toHaveBeenCalled();});

test("EXP7 frozen original route reproduces the >50-message stale-window failure",async()=>{
 const response=await oldSubscriberChat(createPOST("/api/chat/sessions/session-a/messages",{content:"What next?"}),{params:Promise.resolve({sessionId:"session-a"})});await response.text();
 const history=engine.mock.calls[0][0].chatHistory;expect(history).toHaveLength(50);expect(history.some((m:{content:string})=>m.content==="Correction: my team now has 20 engineers")).toBe(false);
});

import { syntheticPaidPeriod } from "../helpers/paid-period";
