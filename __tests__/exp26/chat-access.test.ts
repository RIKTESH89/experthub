jest.mock("@/lib/persona/persistence", () => ({ authorizeChatPersistence: jest.fn(async () => {}) }));
import prisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import { syntheticPaidPeriod } from "../helpers/paid-period";
import { createPOST } from "../helpers/request";
const mockEngine = jest.fn();
jest.mock("@/lib/prisma", () => ({ __esModule: true, default: prisma }));
jest.mock("@/lib/auth", () => ({ auth: mockAuth }));
jest.mock("@/lib/ai/chat-engine", () => ({ runChatEngine: mockEngine }));
jest.mock("@/lib/ai/memory-extractor", () => ({ extractMemories: jest.fn().mockResolvedValue([]) }));
import { POST } from "@/app/api/chat/sessions/[sessionId]/messages/route";
beforeEach(() => {
 resetAllMocks(); mockAuth.mockResolvedValue(mockSession.subscriber); mockEngine.mockReset();
 prisma.chatSession.findUnique.mockResolvedValue({ id: "synthetic-session", subscriberId: mockSession.subscriber.user.id, expertProfileId: "synthetic-expert", expertProfile: { userId: "synthetic-owner" }, isTrial: false, messages: [] });
 prisma.expertPricingTier.findUnique.mockResolvedValue({ monthlyQuestions: null });
 prisma.chatMessage.create.mockResolvedValue({ id: "synthetic-persisted-message" }); prisma.chatSession.update.mockResolvedValue({}); prisma.monthlyTwinUsage.upsert.mockResolvedValue({});
 mockEngine.mockImplementation(async () => ({ stream: new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Synthetic"}}]}\n\ndata: [DONE]\n\n')); controller.close(); } }), sources: [], thinkingSteps: [] }));
});
const send = () => POST(createPOST("/api/chat/sessions/synthetic-session/messages", { content: "architecture" }), { params: Promise.resolve({ sessionId: "synthetic-session" }) });
test.each([null, { status: "ACTIVE", tier: "PREMIUM" }, { status: "PAST_DUE", tier: "PREMIUM", ...syntheticPaidPeriod, currentPeriodEnd: new Date("2020-02-01") }])("existing nontrial session cannot bypass paid expiry/confirmation %p", async subscription => {
 prisma.expertSubscription.findUnique.mockResolvedValue(subscription);
 const response = await send(); expect(response.status).toBe(403); expect((await response.json()).code).toBe("NO_CURRENT_SUBSCRIPTION");
 expect(mockEngine).not.toHaveBeenCalled(); expect(prisma.chatMessage.create).not.toHaveBeenCalled();
});
test("cancelled renewal retains chat until verified paid end", async () => {
 prisma.expertSubscription.findUnique.mockResolvedValue({ status: "CANCELLED", tier: "PREMIUM", ...syntheticPaidPeriod });
 const response = await send(); expect(response.status).toBe(200); const wire = await response.text();
 expect(wire).toContain('"messageId":"synthetic-persisted-message"'); expect(mockEngine).toHaveBeenCalledTimes(1);
});
