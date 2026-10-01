const authMock=jest.fn();const profile=jest.fn();const rebuild=jest.fn();
jest.mock("@/lib/auth",()=>({auth:authMock}));jest.mock("@/lib/prisma",()=>({__esModule:true,default:{expertProfile:{findUnique:profile}}}));jest.mock("@/lib/graph/evidence-store",()=>({rebuildEvidenceSource:rebuild}));
import {POST} from "@/app/api/expert/graph/evidence/[itemId]/route";
const request=new Request("http://localhost/api/expert/graph/evidence/source",{method:"POST"});
beforeEach(()=>{authMock.mockReset();profile.mockReset();rebuild.mockReset();});
test("unauthenticated backfill is rejected without touching source",async()=>{authMock.mockResolvedValue(null);expect((await POST(request,{params:Promise.resolve({itemId:"source"})})).status).toBe(401);expect(rebuild).not.toHaveBeenCalled();});
test("backfill uses authenticated owner's expert profile, not client-supplied tenant",async()=>{authMock.mockResolvedValue({user:{id:"owner"}});profile.mockResolvedValue({id:"owner-expert"});rebuild.mockResolvedValue("revision");expect((await POST(request,{params:Promise.resolve({itemId:"source"})})).status).toBe(200);expect(profile).toHaveBeenCalledWith({where:{userId:"owner"}});expect(rebuild).toHaveBeenCalledWith("owner-expert","source");});
test("missing or foreign source returns404",async()=>{authMock.mockResolvedValue({user:{id:"owner"}});profile.mockResolvedValue({id:"owner-expert"});rebuild.mockResolvedValue(null);expect((await POST(request,{params:Promise.resolve({itemId:"foreign"})})).status).toBe(404);});
