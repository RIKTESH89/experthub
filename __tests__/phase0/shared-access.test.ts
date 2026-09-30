import prisma,{resetAllMocks} from "../mocks/prisma";
jest.mock("@/lib/prisma",()=>({__esModule:true,default:prisma}));
import {canPublishConversation} from "@/lib/knowledge/shared-access";
const expertProfile={id:"ada",userId:"ada-owner",vectorNamespace:"ada-ns"};
const source=(id:string,audience="viewer")=>[{metadata:{expertProfileId:"ada",vectorId:id,generationAudience:audience}}];
beforeEach(()=>{resetAllMocks();prisma.knowledgeItem.findMany.mockResolvedValue([{id:"public",expertProfileId:"ada",sourceType:"manual",metadata:{audience:"public"},isIndexed:true,sourceVersion:1,indexedVersion:1,vectorIds:["ada:public"]}]);});
test("public share admits only currently public evidence and blocks restricted, unknown and owner-derived answers",async()=>{
 expect(await canPublishConversation({expertProfile,messages:[{role:"assistant",sources:source("ada:public")}]})).toBe(true);
 for(const sources of [source("ada:premium"),null,source("ada:public","owner")])expect(await canPublishConversation({expertProfile,messages:[{role:"assistant",sources}]})).toBe(false);
});
test("warm shared answer is revoked when source becomes private",async()=>{
 const chat={expertProfile,messages:[{role:"assistant",sources:source("ada:public")}]};expect(await canPublishConversation(chat)).toBe(true);
 prisma.knowledgeItem.findMany.mockResolvedValue([{sourceType:"manual",metadata:{audience:"owner"},sourceVersion:1,indexedVersion:1,vectorIds:["ada:public"]}]);expect(await canPublishConversation(chat)).toBe(false);
});
