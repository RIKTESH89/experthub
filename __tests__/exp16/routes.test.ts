import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { POST as submit, PATCH as decide, GET as queue } from "@/app/api/expert/corrections/route";
import { POST as release } from "@/app/api/expert/persona-releases/route";
import { POST as feedback } from "@/app/api/chat/corrections/route";
import { submitCorrection, decideCorrection } from "@/lib/corrections/service";
import { releasePersona } from "@/lib/persona/store";
jest.mock("@/lib/auth",()=>({auth:jest.fn()}));
jest.mock("@/lib/prisma",()=>({__esModule:true,default:{expertProfile:{findUnique:jest.fn()},$queryRaw:jest.fn()}}));
jest.mock("@/lib/corrections/service",()=>{const actual=jest.requireActual("@/lib/corrections/service");return {...actual,submitCorrection:jest.fn(),decideCorrection:jest.fn()};});
jest.mock("@/lib/persona/store",()=>{const actual=jest.requireActual("@/lib/persona/store");return {...actual,releasePersona:jest.fn()};});
const request=(body:unknown)=>new NextRequest("http://localhost/api/test",{method:"POST",body:JSON.stringify(body)});
beforeEach(()=>{jest.mocked(auth).mockResolvedValue({user:{id:"owner",role:"EXPERT"}} as never);jest.mocked(prisma.expertProfile.findUnique).mockResolvedValue({id:"expert"} as never);jest.mocked(prisma.$queryRaw).mockResolvedValue([]);});
test("expert queue rejects unauthenticated and non-expert callers",async()=>{
 jest.mocked(auth).mockResolvedValue(null as never);expect((await queue()).status).toBe(401);
 jest.mocked(auth).mockResolvedValue({user:{id:"visitor",role:"SUBSCRIBER"}} as never);expect((await queue()).status).toBe(403);
 expect(prisma.$queryRaw).not.toHaveBeenCalled();
});
test("owner cannot inject another tenant or overwrite audit fields",async()=>{
 expect((await submit(request({submissionKey:"a",proposal:{feedback:"Synthetic"},expertProfileId:"foreign"}))).status).toBe(400);
 expect(submitCorrection).not.toHaveBeenCalled();
});
test("decision requires explicit reason, expected version and safe key",async()=>{
 const body={reviewId:"review",expectedVersion:1,operationKey:"decision",action:"REJECT",reason:"Expert reviewed"};
 expect((await decide(request({...body,reason:""}))).status).toBe(400);
 expect((await decide(request({...body,operationKey:"submit:collision"}))).status).toBe(400);
 jest.mocked(decideCorrection).mockResolvedValue({state:"REJECTED"} as never);
 expect((await decide(request(body))).status).toBe(200);
 expect(decideCorrection).toHaveBeenCalledWith({...body,expertProfileId:"expert",actorId:"owner"});
});
test("release requires an explicit expected head and derives tenant from auth",async()=>{
 expect((await release(request({operationKey:"release"}))).status).toBe(400);
 jest.mocked(releasePersona).mockResolvedValue({id:"release"} as never);
 expect((await release(request({operationKey:"release",expectedHead:null,approvalHash:"a".repeat(64)}))).status).toBe(201);
 expect(releasePersona).toHaveBeenCalledWith({expertProfileId:"expert",actorId:"owner",operationKey:"release",expectedHead:null,approvalHash:"a".repeat(64)});
});
test("visitor endpoint accepts feedback only and authenticated actor identity",async()=>{
 const body={expertProfileId:"expert",messageId:"message",submissionKey:"feedback",feedback:"Synthetic disagreement"};
 expect((await feedback(request({...body,content:"Inject belief"}))).status).toBe(400);
 jest.mocked(submitCorrection).mockResolvedValue({state:"PENDING"} as never);
 expect((await feedback(request(body))).status).toBe(201);
 expect(submitCorrection).toHaveBeenCalledWith({expertProfileId:"expert",messageId:"message",submissionKey:"feedback",actorId:"owner",proposal:{feedback:"Synthetic disagreement"}});
});
test('activation without a reviewed receipt is denied before store invocation',async()=>{
 await expect(release(request({operationKey:'new',expectedHead:null}))).resolves.toHaveProperty('status',400);expect(releasePersona).not.toHaveBeenCalled();
});
