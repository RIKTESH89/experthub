/**
 * Edge case & integration tests for all 4 new features
 * Tests cover: boundary conditions, error handling, cross-feature interactions
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
import { createGET, createPOST, createRequest } from "../helpers/request";

import { GET as getTrialStatus } from "@/app/api/experts/[expertId]/trial-status/route";
import { POST as createChatSession } from "@/app/api/chat/sessions/route";
import { GET as getExpertPricing, PUT as updateExpertPricing } from "@/app/api/expert/pricing/route";
import { GET as getPublicPricing } from "@/app/api/experts/[expertId]/pricing/route";
import { POST as subscribe } from "@/app/api/experts/[expertId]/subscribe/route";
import { GET as getWidgetConfig } from "@/app/api/widget/config/route";
import { GET as getAnalytics } from "@/app/api/expert/analytics/route";
import { GET as getQuestions } from "@/app/api/expert/analytics/questions/route";
import { GET as getTopicGaps } from "@/app/api/expert/analytics/topic-gaps/route";
import { GET as getRevenue } from "@/app/api/expert/analytics/revenue/route";
import { GET as getExpertWidget, PUT as updateExpertWidget } from "@/app/api/expert/widget/route";

beforeEach(() => {
  resetAllMocks();
});

// ===========================================================================
// TRIAL EDGE CASES
// ===========================================================================
describe("Trial Edge Cases", () => {
  const params = Promise.resolve({ expertId: "expert-id-1" });

  it("trial status returns 404 when expert not found", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(null);

    const req = createGET("/api/experts/expert-id-1/trial-status");
    const res = await getTrialStatus(req, { params });

    expect(res.status).toBe(404);
  });

  it("trial with exactly 0 freeTrialQuestions blocks immediately", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      freeTrialQuestions: 0,
      user: { name: "Expert" },
    });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue(null);
    mockPrisma.freeTrialUsage.findUnique.mockResolvedValue(null);

    const req = createPOST("/api/chat/sessions", { expertId: "expert-id-1" });
    const res = await createChatSession(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.code).toBe("TRIAL_EXHAUSTED");
    expect(data.questionsAllowed).toBe(0);
  });

  it("trial with 1 question allows exactly 1 then blocks", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    // First call: 0 used, 1 allowed → should succeed
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      freeTrialQuestions: 1,
      user: { name: "Expert" },
    });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue(null);
    mockPrisma.freeTrialUsage.findUnique.mockResolvedValue(null);
    mockPrisma.chatSession.create.mockResolvedValue({
      id: "s1",
      isTrial: true,
      expertProfile: {
        displayName: "Expert",
        twinGreeting: null,
        user: { id: "expert-id-1", name: "Expert", image: null },
      },
    });

    const req1 = createPOST("/api/chat/sessions", { expertId: "expert-id-1" });
    const res1 = await createChatSession(req1);
    expect(res1.status).toBe(201);

    // Second call: 1 used, 1 allowed → should block
    mockPrisma.freeTrialUsage.findUnique.mockResolvedValue({ questionCount: 1 });

    const req2 = createPOST("/api/chat/sessions", { expertId: "expert-id-1" });
    const res2 = await createChatSession(req2);
    expect(res2.status).toBe(403);
  });

  it("active subscriber bypasses trial entirely", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      freeTrialQuestions: 0, // even with 0 free questions
      user: { name: "Expert" },
    });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue({
      status: "ACTIVE",
      tier: "PREMIUM",
    });
    mockPrisma.chatSession.create.mockResolvedValue({
      id: "s1",
      isTrial: false,
      expertProfile: {
        displayName: "Expert",
        twinGreeting: null,
        user: { id: "expert-id-1", name: "Expert", image: null },
      },
    });

    const req = createPOST("/api/chat/sessions", { expertId: "expert-id-1" });
    const res = await createChatSession(req);
    expect(res.status).toBe(201);
  });

  it("trial status shows subscription overrides trial", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      freeTrialQuestions: 3,
    });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue({
      status: "ACTIVE",
    });
    // Trial usage maxed out but doesn't matter since subscribed
    mockPrisma.freeTrialUsage.findUnique.mockResolvedValue({ questionCount: 3 });

    const req = createGET("/api/experts/expert-id-1/trial-status");
    const res = await getTrialStatus(req, { params });
    const data = await res.json();

    expect(data.hasSubscription).toBe(true);
    expect(data.hasTrialAccess).toBe(true); // subscription grants access
  });
});

// ===========================================================================
// PRICING EDGE CASES
// ===========================================================================
describe("Pricing Edge Cases", () => {
  const params = Promise.resolve({ expertId: "expert-id-1" });

  it("PUT rejects negative prices", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);

    const req = createRequest("/api/expert/pricing", {
      method: "PUT",
      body: {
        tiers: [{ tier: "STANDARD", price: -5.00 }],
      },
    });
    const res = await updateExpertPricing(req);
    expect(res.status).toBe(400);
  });

  it("PUT rejects invalid tier name", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);

    const req = createRequest("/api/expert/pricing", {
      method: "PUT",
      body: {
        tiers: [{ tier: "GOLD", price: 50 }],
      },
    });
    const res = await updateExpertPricing(req);
    expect(res.status).toBe(400);
  });

  it("public pricing 404 for non-existent expert", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(null);

    const req = createGET("/api/experts/nonexistent/pricing");
    const res = await getPublicPricing(req, { params: Promise.resolve({ expertId: "nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("subscribe with FREE tier sets price to 0", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique
      .mockResolvedValueOnce({ ...mockExpertProfile, user: { name: "Expert" } })
      .mockResolvedValueOnce({ totalSubscribers: 11 });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue(null);
    mockPrisma.expertPricingTier.findUnique.mockResolvedValue({
      price: 0,
      tier: "FREE",
    });
    mockPrisma.expertSubscription.create.mockResolvedValue({ id: "sub-1" });
    mockPrisma.expertProfile.update.mockResolvedValue({});
    mockPrisma.notification.create.mockResolvedValue({});

    const req = createRequest("/api/experts/expert-id-1/subscribe", {
      method: "POST",
      body: { tier: "FREE" },
    });
    const res = await subscribe(req, { params });
    const data = await res.json();

    expect(data.isSubscribed).toBe(true);
    expect(mockPrisma.expertSubscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tier: "FREE", price: 0 }),
      })
    );
  });

  it("cannot subscribe to yourself", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      user: { name: "Expert" },
    });

    const req = createRequest("/api/experts/expert-id-1/subscribe", {
      method: "POST",
      body: { tier: "STANDARD" },
    });
    const res = await subscribe(req, { params });
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// WIDGET EDGE CASES
// ===========================================================================
describe("Widget Edge Cases", () => {
  it("disabled widget returns 404", async () => {
    mockPrisma.widgetConfig.findUnique.mockResolvedValue({
      isEnabled: false,
      expertProfile: {
        displayName: "Expert",
        twinGreeting: null,
        user: { id: "expert-id-1", name: "Expert", image: null },
      },
    });

    const req = createGET("/api/widget/config", { apiKey: "disabled-key" });
    const res = await getWidgetConfig(req);
    expect(res.status).toBe(404);
  });

  it("widget config handles missing greeting gracefully", async () => {
    mockPrisma.widgetConfig.findUnique.mockResolvedValue({
      id: "wc-1",
      isEnabled: true,
      apiKey: "key-1",
      primaryColor: "#000000",
      position: "bottom-left",
      greeting: null,
      freeQuestions: 5,
      allowedDomains: [],
      expertProfile: {
        displayName: "Expert",
        twinGreeting: "Default greeting",
        user: { id: "expert-id-1", name: "Expert", image: null },
      },
    });

    const req = createGET("/api/widget/config", { apiKey: "key-1" });
    const res = await getWidgetConfig(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.greeting).toBeDefined(); // falls back to twinGreeting or empty
  });

  it("expert widget GET with no profile returns 404", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.user.findUnique.mockResolvedValue({ role: "EXPERT" });
    mockPrisma.expertProfile.findUnique.mockResolvedValue(null);

    const res = await getExpertWidget();
    expect(res.status).toBe(404);
  });

  it("widget PUT with empty body still succeeds (no fields to update)", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.user.findUnique.mockResolvedValue({ role: "EXPERT" });
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.widgetConfig.upsert.mockResolvedValue({
      id: "wc-1",
      apiKey: "key-1",
      primaryColor: "#6366f1",
      isEnabled: true,
    });

    const req = createRequest("/api/expert/widget", {
      method: "PUT",
      body: {},
    });
    const res = await updateExpertWidget(req);
    expect(res.status).toBe(200);
  });
});

// ===========================================================================
// ANALYTICS EDGE CASES
// ===========================================================================
describe("Analytics Edge Cases", () => {
  it("analytics with 7d period", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.expertSubscription.count.mockResolvedValue(0);
    mockPrisma.expertSubscription.aggregate.mockResolvedValue({ _sum: { price: 0 } });
    mockPrisma.expertSubscription.findMany.mockResolvedValue([]);
    mockPrisma.twinInteraction.count.mockResolvedValue(0);
    mockPrisma.twinInteraction.aggregate.mockResolvedValue({ _avg: { answerQuality: null } });
    mockPrisma.twinInteraction.findMany.mockResolvedValue([]);
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockPrisma.post.findMany.mockResolvedValue([]);

    const req = createGET("/api/expert/analytics", { period: "7d" });
    const res = await getAnalytics(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.overview.avgAnswerQuality).toBe(0); // null handled as 0
  });

  it("analytics with 90d period", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.expertSubscription.count.mockResolvedValue(5);
    mockPrisma.expertSubscription.aggregate.mockResolvedValue({ _sum: { price: 50 } });
    mockPrisma.expertSubscription.findMany.mockResolvedValue([]);
    mockPrisma.twinInteraction.count.mockResolvedValue(10);
    mockPrisma.twinInteraction.aggregate.mockResolvedValue({ _avg: { answerQuality: 0.9 } });
    mockPrisma.twinInteraction.findMany.mockResolvedValue([]);
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockPrisma.post.findMany.mockResolvedValue([]);

    const req = createGET("/api/expert/analytics", { period: "90d" });
    const res = await getAnalytics(req);
    expect(res.status).toBe(200);
  });

  it("analytics with no expert profile returns 404", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(null);

    const req = createGET("/api/expert/analytics");
    const res = await getAnalytics(req);
    expect(res.status).toBe(404);
  });

  it("questions endpoint with default pagination", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.twinInteraction.findMany.mockResolvedValue([]);
    mockPrisma.twinInteraction.count.mockResolvedValue(0);

    const req = createGET("/api/expert/analytics/questions");
    const res = await getQuestions(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.questions).toHaveLength(0);
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.total).toBe(0);
  });

  it("topic gaps with no low-quality interactions", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.twinInteraction.findMany.mockResolvedValue([]);

    const req = createGET("/api/expert/analytics/topic-gaps");
    const res = await getTopicGaps(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.gaps).toHaveLength(0);
  });

  it("revenue with no subscriptions", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.expertSubscription.groupBy.mockResolvedValue([]);

    const req = createGET("/api/expert/analytics/revenue");
    const res = await getRevenue(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.breakdown).toHaveLength(0);
  });

  it("revenue returns 401 for unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createGET("/api/expert/analytics/revenue");
    const res = await getRevenue(req);
    expect(res.status).toBe(401);
  });

  it("topic-gaps returns 403 for subscriber", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const req = createGET("/api/expert/analytics/topic-gaps");
    const res = await getTopicGaps(req);
    expect(res.status).toBe(403);
  });
});

// ===========================================================================
// CROSS-FEATURE INTERACTIONS
// ===========================================================================
describe("Cross-Feature Interactions", () => {
  const params = Promise.resolve({ expertId: "expert-id-1" });

  it("FREE tier subscriber can use trial questions", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      freeTrialQuestions: 3,
    });
    // Has FREE subscription (no twin access)
    mockPrisma.expertSubscription.findUnique.mockResolvedValue({
      status: "ACTIVE",
      tier: "FREE",
    });
    mockPrisma.freeTrialUsage.findUnique.mockResolvedValue(null);

    const req = createGET("/api/experts/expert-id-1/trial-status");
    const res = await getTrialStatus(req, { params });
    const data = await res.json();

    // FREE tier counts as subscribed
    expect(data.hasSubscription).toBe(true);
  });

  it("pricing endpoint accessible by subscriber viewing expert", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.expertPricingTier.findMany.mockResolvedValue([
      { tier: "FREE", price: 0, features: ["Posts"] },
      { tier: "STANDARD", price: 9.99, features: ["Posts", "Twin"] },
      { tier: "PREMIUM", price: 29.99, features: ["All"] },
    ]);

    const req = createGET("/api/experts/expert-id-1/pricing");
    const res = await getPublicPricing(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.tiers).toHaveLength(3);
  });

  it("admin cannot access expert pricing management", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);

    const res = await getExpertPricing();
    expect(res.status).toBe(403);
  });

  it("admin cannot access expert analytics", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);

    const req = createGET("/api/expert/analytics");
    const res = await getAnalytics(req);
    expect(res.status).toBe(403);
  });

  it("admin cannot access expert widget config", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.user.findUnique.mockResolvedValue({ role: "ADMIN" });

    const res = await getExpertWidget();
    expect(res.status).toBe(403);
  });
});
