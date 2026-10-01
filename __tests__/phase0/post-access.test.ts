import prisma, { resetAllMocks } from "../mocks/prisma";
jest.mock("@/lib/prisma", () => ({ __esModule: true, default: prisma }));
import { canReadPost, readablePostsWhere } from "@/lib/knowledge/post-access";
beforeEach(resetAllMocks);
describe.each(["ada", "ben"])("source access %s", (expert) => {
  test.each([undefined,"ordinary","entitled",`${expert}-owner`])("viewer %s", async (viewer) => {
    prisma.expertProfile.findUnique.mockResolvedValue({id:expert});
    prisma.expertSubscription.findUnique.mockImplementation(async ({where}:{where:{subscriberId_expertProfileId:{subscriberId:string}}}) =>
      where.subscriberId_expertProfileId.subscriberId === "entitled" ? {status:"ACTIVE",tier:"PREMIUM",...syntheticPaidPeriod} : {status:"ACTIVE",tier:"STANDARD"});
    const post={authorId:`${expert}-owner`,status:"PUBLISHED",isHidden:false,isPremiumOnly:false};
    expect(await canReadPost(post,viewer)).toBe(true);
    expect(await canReadPost({...post,isPremiumOnly:true},viewer)).toBe(viewer==="entitled" || viewer===post.authorId);
    expect(await canReadPost({...post,status:"DRAFT"},viewer)).toBe(viewer===post.authorId);
    expect(await canReadPost({...post,isHidden:true},viewer)).toBe(viewer===post.authorId);
  });
});
test("live downgrade and failed permission lookup never grant source access",async()=>{
  const post={authorId:"ada-owner",status:"PUBLISHED",isHidden:false,isPremiumOnly:true};
  prisma.expertProfile.findUnique.mockResolvedValue({id:"ada"});
  prisma.expertSubscription.findUnique.mockResolvedValue({status:"ACTIVE",tier:"PREMIUM",...syntheticPaidPeriod});
  expect(await canReadPost(post,"visitor")).toBe(true);
  prisma.expertSubscription.findUnique.mockResolvedValue({status:"CANCELLED",tier:"PREMIUM",...syntheticPaidPeriod,currentPeriodEnd:new Date("2020-02-01")});
  expect(await canReadPost(post,"visitor")).toBe(false);
  prisma.expertSubscription.findUnique.mockRejectedValue(new Error("permission service down"));
  await expect(canReadPost(post,"visitor")).rejects.toThrow("permission service down");
});
test("database filtering is tenant-specific and checks both expiry fields before pagination",()=>{
  expect(readablePostsWhere()).toEqual({status:"PUBLISHED",isHidden:false,isPremiumOnly:false});
  const now=new Date("2026-09-30T00:00:00Z");
  const scope=readablePostsWhere("visitor",now);
  expect(JSON.stringify(scope)).toContain('"subscriberId":"visitor"');
  expect(JSON.stringify(scope)).toContain('"tier":"PREMIUM"');
  expect(JSON.stringify(scope)).toContain('"paidPeriodStart"');
  expect(JSON.stringify(scope)).toContain('"razorpayPaymentId"');
  expect(JSON.stringify(scope)).toContain('"currentPeriodEnd"');
  expect(scope.OR).toContainEqual({authorId:"visitor"});
});

import { syntheticPaidPeriod } from "../helpers/paid-period";
