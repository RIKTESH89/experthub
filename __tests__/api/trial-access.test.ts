jest.mock("@/lib/persona/persistence", () => ({ authorizeChatPersistence: jest.fn(async () => {}) }));
import { syntheticPaidPeriod } from "../helpers/paid-period";
/**
 * Feature 1: Free Trial Twin Access — Integration Tests
 */

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: require("../mocks/prisma").default,
}));

jest.mock("@/lib/auth", () => ({
  auth: require("../mocks/auth").mockAuth,
}));

jest.mock("@/lib/ai/chat-engine", () => ({
  runChatEngine: jest.fn(),
}));

import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import { mockExpertProfile } from "../mocks/data";
import { createGET, createPOST } from "../helpers/request";

// Import route handlers
import { GET as getTrialStatus } from "@/app/api/experts/[expertId]/trial-status/route";
import { POST as createChatSession } from "@/app/api/chat/sessions/route";

beforeEach(() => {
  resetAllMocks();
});

describe("Trial Status Endpoint", () => {
  const params = Promise.resolve({ expertId: "expert-id-1" });

  it("returns trial access for non-subscribed user", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      freeTrialQuestions: 3,
    });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue(null);
    mockPrisma.freeTrialUsage.findUnique.mockResolvedValue(null);

    const req = createGET("/api/experts/expert-id-1/trial-status");
    const res = await getTrialStatus(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.questionsUsed).toBe(0);
    expect(data.questionsAllowed).toBe(3);
    expect(data.hasSubscription).toBe(false);
    expect(data.hasTrialAccess).toBe(true);
  });

  it("returns exhausted trial when all questions used", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      freeTrialQuestions: 3,
    });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue(null);
    mockPrisma.freeTrialUsage.findUnique.mockResolvedValue({
      userId: "subscriber-id-1",
      expertProfileId: "profile-id-1",
      questionCount: 3,
    });

    const req = createGET("/api/experts/expert-id-1/trial-status");
    const res = await getTrialStatus(req, { params });
    const data = await res.json();

    expect(data.questionsUsed).toBe(3);
    expect(data.hasTrialAccess).toBe(false);
  });

  it("returns subscription access when subscribed", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.expertSubscription.findUnique.mockResolvedValue({
 ...syntheticPaidPeriod, tier: "PREMIUM",
      status: "ACTIVE",
    });
    mockPrisma.freeTrialUsage.findUnique.mockResolvedValue(null);

    const req = createGET("/api/experts/expert-id-1/trial-status");
    const res = await getTrialStatus(req, { params });
    const data = await res.json();

    expect(data.hasSubscription).toBe(true);
    expect(data.hasTrialAccess).toBe(true);
  });

  it("returns 401 for unauthenticated user", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createGET("/api/experts/expert-id-1/trial-status");
    const res = await getTrialStatus(req, { params });

    expect(res.status).toBe(401);
  });
});

describe("Chat Session Creation with Trial", () => {
  it("creates trial session for non-subscriber with trial access", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      freeTrialQuestions: 3,
      user: { name: "Expert User" },
    });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue(null);
    mockPrisma.freeTrialUsage.findUnique.mockResolvedValue(null);
    mockPrisma.chatSession.create.mockResolvedValue({
      id: "session-1",
      subscriberId: "subscriber-id-1",
      expertProfileId: "profile-id-1",
      isTrial: true,
      expertProfile: {
        displayName: "Expert User",
        twinGreeting: null,
        user: { id: "expert-id-1", name: "Expert User", image: null },
      },
    });

    const req = createPOST("/api/chat/sessions", { expertId: "expert-id-1" });
    const res = await createChatSession(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.isTrial).toBe(true);
  });

  it("blocks session creation when trial exhausted", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      freeTrialQuestions: 3,
      user: { name: "Expert User" },
    });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue(null);
    mockPrisma.freeTrialUsage.findUnique.mockResolvedValue({
      questionCount: 3,
    });

    const req = createPOST("/api/chat/sessions", { expertId: "expert-id-1" });
    const res = await createChatSession(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe("TRIAL_EXHAUSTED");
  });

  it("creates normal session for active subscriber", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      user: { name: "Expert User" },
    });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue({
 ...syntheticPaidPeriod, tier: "PREMIUM",
      status: "ACTIVE",
    });
    mockPrisma.chatSession.create.mockResolvedValue({
      id: "session-1",
      isTrial: false,
      expertProfile: {
        displayName: "Expert User",
        twinGreeting: "Hello!",
        user: { id: "expert-id-1", name: "Expert User", image: null },
      },
    });
    mockPrisma.chatMessage.create.mockResolvedValue({});

    const req = createPOST("/api/chat/sessions", { expertId: "expert-id-1" });
    const res = await createChatSession(req);

    expect(res.status).toBe(201);
  });
});
