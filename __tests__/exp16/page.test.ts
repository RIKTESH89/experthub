// Keep the owner-guard test focused on rendered content; Jest does not load CSS modules.
jest.mock("@/components/expert-studio/expert-studio.module.css", () => ({__esModule:true,default:{studio:"expert-studio",chapter:"expert-chapter",context:"expert-context",deskNav:"expert-desk-nav",content:"expert-content",reviews:"expert-reviews"}}));
import { renderToStaticMarkup } from "react-dom/server";
import page from "@/app/(dashboard)/expert/reviews/page";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
jest.mock("@/lib/auth",()=>({auth:jest.fn()}));
jest.mock("@/lib/prisma",()=>({__esModule:true,default:{expertProfile:{findUnique:jest.fn()}}}));
jest.mock("@/components/corrections/review-workspace",()=>({ReviewWorkspace:()=>"Synthetic owner UI"}));
beforeEach(()=>jest.mocked(prisma.expertProfile.findUnique).mockResolvedValue({id:"expert"} as never));
test.each([null,{user:{id:"visitor",role:"SUBSCRIBER"}},{user:{id:"admin",role:"ADMIN"}}])("page denies non-owner session %j",async session=>{
 jest.mocked(auth).mockResolvedValue(session as never);
 const html=renderToStaticMarkup(await page());expect(html).toContain("Expert review access required");expect(html).not.toContain("Synthetic owner UI");expect(prisma.expertProfile.findUnique).not.toHaveBeenCalled();
});
test("page requires an owning expert profile before rendering review UI",async()=>{
 jest.mocked(auth).mockResolvedValue({user:{id:"owner",role:"EXPERT"}} as never);
 jest.mocked(prisma.expertProfile.findUnique).mockResolvedValue(null);
 expect(renderToStaticMarkup(await page())).toContain("Expert review access required");
 jest.mocked(prisma.expertProfile.findUnique).mockResolvedValue({id:"expert"} as never);
 expect(renderToStaticMarkup(await page())).toContain("Synthetic owner UI");
});
