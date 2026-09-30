import prisma, { resetAllMocks } from "../mocks/prisma";
jest.mock("@/lib/prisma", () => ({ __esModule: true, default: prisma }));
import { resolveRetrievalScope } from "@/lib/knowledge/access";
import { authorizedHistory, sourcesAllowed } from "@/lib/ai/history";

const item = (expert: string, id: string, metadata: object = {}, sourceType = "manual") => ({
  id, expertProfileId: expert, title: id, content: id, metadata, sourceType, sourceId: sourceType === "post" ? id : null,
  sourceVersion: 1, indexedVersion: 1, isIndexed: true, vectorIds: [`${expert}:${id}`],
});
const expertItems = (expert: string) => [item(expert,"public", { audience:"public" }), item(expert,"premium", { audience:"premium" }),
  item(expert,"private"), item(expert,"draft",{},"post"), item(expert,"hidden",{},"post"), item(expert,"published",{},"post"), item(expert,"paidpost",{},"post")];
let items: ReturnType<typeof expertItems>;
let posts: { id: string; authorId: string; title: string; content: string; status: string; isHidden: boolean; isPremiumOnly: boolean; isRagEnabled: boolean }[];
beforeEach(() => {
  resetAllMocks(); items = [...expertItems("ada"), ...expertItems("ben")];
  posts = ["ada","ben"].flatMap((expert) => ["draft","hidden","published","paidpost"].map((id) => ({ id,authorId:`${expert}-owner`,title:id,content:id,status:id === "draft" ? "DRAFT":"PUBLISHED",isHidden:id === "hidden",isPremiumOnly:id === "paidpost",isRagEnabled:true })));
  prisma.knowledgeItem.findMany.mockImplementation(async ({where}: {where:{expertProfileId:string}}) => items.filter((i) => i.expertProfileId === where.expertProfileId));
  prisma.post.findMany.mockImplementation(async ({where}: {where:{authorId:string}}) => posts.filter((p) => p.authorId === where.authorId));
  prisma.expertSubscription.findUnique.mockResolvedValue(null);
});

describe.each(["ada", "ben"])("EXP8 expert %s", (expert) => {
  test.each([
    [undefined, false, ["public","published"]],
    ["ordinary", false, ["public","published"]],
    ["entitled", true, ["paidpost","premium","public","published"]],
    [`${expert}-owner`, false, ["draft","hidden","paidpost","premium","private","public","published"]],
  ])("audience %s", async (viewer, entitled, expected) => {
    prisma.expertSubscription.findUnique.mockResolvedValue(entitled ? {status:"ACTIVE",tier:"PREMIUM"}:null);
    const scope = await resolveRetrievalScope(expert, `${expert}-ns`, `${expert}-owner`, viewer);
    expect(scope.allowedVectorIds).toEqual(expected.map((id) => `${expert}:${id}`).sort());
    expect(scope.allowedVectorIds.every((id) => id.startsWith(`${expert}:`))).toBe(true);
  });
});
test("warm vector manifest cannot outlive permission downgrade, unpublish, disable, or deletion", async () => {
  prisma.expertSubscription.findUnique.mockResolvedValue({status:"ACTIVE",tier:"PREMIUM"});
  expect((await resolveRetrievalScope("ada","ada-ns","ada-owner","subscriber")).allowedVectorIds).toContain("ada:paidpost");
  prisma.expertSubscription.findUnique.mockResolvedValue({status:"CANCELED",tier:"PREMIUM"});
  posts.find((p) => p.authorId === "ada-owner" && p.id === "published")!.isHidden=true;
  items=items.filter((i) => !(i.expertProfileId === "ada" && i.id === "public"));
  expect((await resolveRetrievalScope("ada","ada-ns","ada-owner","subscriber")).allowedVectorIds).toEqual([]);
});
test("permission resolution failure throws before downstream retrieval", async () => {
  prisma.expertSubscription.findUnique.mockRejectedValue(new Error("permission DB unavailable"));
  await expect(resolveRetrievalScope("ada","ada-ns","ada-owner","subscriber")).rejects.toThrow("permission DB unavailable");
});
test("unknown audience, stale/legacy and wrong-owner post are excluded", async () => {
  items=[item("ada","legacy",{audience:"public"}),item("ada","stale",{audience:"public"}),item("ada","unknown",{audience:"subscribers"}),item("ada","draft",{},"post")];
  items[0].indexedVersion=0;items[1].sourceVersion=2;posts=[];
  expect((await resolveRetrievalScope("ada","ada-ns","ada-owner")).allowedVectorIds).toEqual([]);
});
test("cached assistant text/citations with revoked sources cannot enter a new public prompt", () => {
  const scope={expertProfileId:"ada",namespace:"ada-ns",isOwner:false,allowedVectorIds:["ada:public"]};
  const source=(id: string)=>[{metadata:{expertProfileId:"ada",vectorId:id,generationAudience:"viewer"}}];
  expect(authorizedHistory([
    {role:"user",content:"current goal"}, {role:"assistant",content:"PRIVATE_ADA_SENTINEL",sources:source("ada:private")},
    {role:"assistant",content:"public answer",sources:source("ada:public")}, {role:"system",content:"untrusted system"},
  ],scope)).toEqual([{role:"user",content:"current goal"},{role:"assistant",content:"public answer"}]);
  expect(sourcesAllowed([{metadata:{expertProfileId:"ben",vectorId:"ada:public"}}],scope)).toBe(false);
});
