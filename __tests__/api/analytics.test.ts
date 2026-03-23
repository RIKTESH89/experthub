/**
 * Feature 4: Expert Analytics — Integration Tests
 */

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: require("../mocks/prisma").default,
}));

jest.mock("@/lib/auth", () => ({
  auth: require("../mocks/auth").mockAuth,
}));

import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import { mockExpertProfile } from "../mocks/data";
import { createGET } from "../helpers/request";

import { GET as getAnalytics } from "@/app/api/expert/analytics/route";
import { GET as getQuestions } from "@/app/api/expert/analytics/questions/route";
import { GET as getTopicGaps } from "@/app/api/expert/analytics/topic-gaps/route";
import { GET as getRevenue } from "@/app/api/expert/analytics/revenue/route";

beforeEach(() => {
  resetAllMocks();
});

describe("Analytics Overview", () => {
  it("returns aggregated analytics for expert", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);

    // Mock all the aggregate queries
    mockPrisma.expertSubscription.count.mockResolvedValue(10);
    mockPrisma.expertSubscription.aggregate.mockResolvedValue({
      _sum: { price: 199.80 },
    });
    mockPrisma.expertSubscription.findMany.mockResolvedValue([]);
    mockPrisma.twinInteraction.count.mockResolvedValue(50);
    mockPrisma.twinInteraction.aggregate.mockResolvedValue({
      _avg: { answerQuality: 0.75 },
    });
    mockPrisma.twinInteraction.findMany.mockResolvedValue([]);
    // Mock $queryRaw for subscriber growth, revenue, and twin usage queries
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockPrisma.post.findMany.mockResolvedValue([
      {
        id: "p1",
        title: "Test Post",
        viewCount: 100,
        createdAt: new Date(),
        _count: { likes: 10, comments: 5 },
      },
    ]);

    const req = createGET("/api/expert/analytics", { period: "30d" });
    const res = await getAnalytics(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.overview).toBeDefined();
    expect(data.overview.totalSubscribers).toBe(10);
    expect(data.contentPerformance).toHaveLength(1);
  });

  it("returns 403 for non-expert", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const req = createGET("/api/expert/analytics");
    const res = await getAnalytics(req);

    expect(res.status).toBe(403);
  });

  it("returns 401 for unauthenticated user", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createGET("/api/expert/analytics");
    const res = await getAnalytics(req);

    expect(res.status).toBe(401);
  });
});

describe("Analytics Questions", () => {
  it("returns paginated questions", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.twinInteraction.findMany.mockResolvedValue([
      {
        id: "ti-1",
        question: "What is machine learning?",
        answerQuality: 0.85,
        topicCategory: "ML",
        sourcesUsed: 3,
        isFromWidget: false,
        createdAt: new Date(),
      },
    ]);
    mockPrisma.twinInteraction.count.mockResolvedValue(1);

    const req = createGET("/api/expert/analytics/questions", {
      period: "30d",
      page: "1",
      limit: "20",
    });
    const res = await getQuestions(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.questions).toHaveLength(1);
    expect(data.questions[0].question).toBe("What is machine learning?");
    expect(data.pagination).toBeDefined();
  });
});

describe("Analytics Topic Gaps", () => {
  it("returns topics with low quality answers", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.twinInteraction.findMany.mockResolvedValue([
      { topicCategory: "Quantum Computing", question: "What is quantum entanglement?", answerQuality: 0.3 },
      { topicCategory: "Quantum Computing", question: "How do qubits work?", answerQuality: 0.2 },
    ]);

    const req = createGET("/api/expert/analytics/topic-gaps", { period: "30d" });
    const res = await getTopicGaps(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.gaps).toHaveLength(1);
    expect(data.gaps[0].topic).toBe("Quantum Computing");
    expect(data.gaps[0].questionCount).toBe(2);
    expect(data.gaps[0].sampleQuestions).toHaveLength(2);
  });
});

describe("Analytics Revenue", () => {
  it("returns revenue breakdown by tier", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.expertSubscription.groupBy.mockResolvedValue([
      { tier: "FREE", _count: { id: 5 }, _sum: { price: 0 } },
      { tier: "STANDARD", _count: { id: 10 }, _sum: { price: 99.90 } },
      { tier: "PREMIUM", _count: { id: 3 }, _sum: { price: 89.97 } },
    ]);

    const req = createGET("/api/expert/analytics/revenue", { period: "30d" });
    const res = await getRevenue(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.breakdown).toHaveLength(3);
  });
});
