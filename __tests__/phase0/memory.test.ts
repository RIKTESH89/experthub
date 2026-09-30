import prisma,{resetAllMocks} from "../mocks/prisma";
const call=jest.fn();
jest.mock("@/lib/prisma",()=>({__esModule:true,default:prisma}));
jest.mock("@/lib/ai/openai",()=>({callOpenAI:call,safeParseJSON:(text:string)=>JSON.parse(text)}));
import {saveMemories,getMemories} from "@/lib/ai/memory-manager";
import {extractMemories} from "@/lib/ai/memory-extractor";
beforeEach(()=>{resetAllMocks();call.mockReset();});
test("EXP10 shared prefixes do not collide, replay does not duplicate or change recency",async()=>{
 const rows=new Map<string,unknown>();prisma.subscriberMemory.upsert.mockImplementation(async({where,create}:{where:{memoryKey:string};create:unknown})=>{if(!rows.has(where.memoryKey))rows.set(where.memoryKey,create);return rows.get(where.memoryKey);});
 const values=[{fact:"My favorite project is Alpha",category:"preference"},{fact:"My favorite project is Beta",category:"preference"}];
 await saveMemories("visitor-a","ada",values);await saveMemories("visitor-a","ada",values);expect(rows.size).toBe(2);expect(prisma.subscriberMemory.upsert.mock.calls.every(([args]:[{update:object}])=>Object.keys(args.update).length===0)).toBe(true);
});
test("same facts are isolated by both visitor and expert",async()=>{
 const value=[{fact:"I prefer concise answers",category:"preference"}];await saveMemories("a","ada",value);await saveMemories("b","ada",value);await saveMemories("a","ben",value);
 expect(new Set(prisma.subscriberMemory.upsert.mock.calls.map(([args]:[{where:{memoryKey:string}}])=>args.where.memoryKey)).size).toBe(3);
 prisma.subscriberMemory.findMany.mockResolvedValue([]);await getMemories("b","ben");expect(prisma.subscriberMemory.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{subscriberId:"b",expertProfileId:"ben",memoryKey:{not:null}}}));
});
test("extractor cannot ingest generated assistant claims as visitor memories",async()=>{call.mockResolvedValue('{"memories":[]}');await extractMemories("I like concise answers","ASSISTANT_INVENTED_MEMORY");expect(JSON.stringify(call.mock.calls[0])).not.toContain("ASSISTANT_INVENTED_MEMORY");});

test("concurrent unique-key loser acknowledges only exact existing memory identity",async()=>{
 const {Prisma}=jest.requireActual("@prisma/client");const error=new Prisma.PrismaClientKnownRequestError("synthetic race",{code:"P2002",clientVersion:"6.19.2"});
 prisma.subscriberMemory.upsert.mockRejectedValue(error);prisma.subscriberMemory.findUnique.mockResolvedValue({subscriberId:"a",expertProfileId:"ada"});
 await expect(saveMemories("a","ada",[{fact:"Synthetic preference",category:"preference"}])).resolves.toBeUndefined();
 prisma.subscriberMemory.findUnique.mockResolvedValue({subscriberId:"b",expertProfileId:"ada"});await expect(saveMemories("a","ada",[{fact:"Synthetic preference",category:"preference"}])).rejects.toThrow("synthetic race");
});
