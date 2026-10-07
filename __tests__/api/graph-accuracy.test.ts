import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import { mockExpertProfile } from "../mocks/data";
import { createGET, createPOST } from "../helpers/request";

jest.mock("@/lib/prisma", () => ({ __esModule: true, default: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: mockAuth }));
jest.mock("@/lib/ai/openai", () => ({
  callOpenAI: jest.fn(),
  safeParseJSON: jest.fn((text: string, fallback: unknown) => {
    try {
      return JSON.parse(text);
    } catch {
      return fallback;
    }
  }),
}));
jest.mock("@/lib/graph/entity-extractor", () => ({
  extractEntities: jest.fn(),
}));

import { GET as getGraph, POST as buildGraph } from "@/app/api/expert/graph/route";
import { GET as getScore, POST as calcScore } from "@/app/api/expert/accuracy-score/route";
import { POST as rateMessage } from "@/app/api/chat/sessions/[sessionId]/messages/[messageId]/rate/route";
import { graphEnhancedRetrieval } from "@/lib/graph/graph-retriever";
import { calculateTwinScore } from "@/lib/ai/accuracy-scorer";
import { extractEntities } from "@/lib/graph/entity-extractor";

const mockExtractEntities = extractEntities as jest.MockedFunction<typeof extractEntities>;

function messageParams(sessionId: string, messageId: string) {
  return { params: Promise.resolve({ sessionId, messageId }) };
}

beforeEach(() => {
  resetAllMocks();
  mockAuth.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// =============================================================================
// GRAPH API (/api/expert/graph)
// =============================================================================

describe("GET /api/expert/graph", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createGET("/api/expert/graph");
    const res = await getGraph();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 when not an expert", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const req = createGET("/api/expert/graph");
    const res = await getGraph();
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain("Only experts");
  });

  it("returns graph stats (nodeCount, edgeCount, topConcepts)", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.knowledgeNode.count.mockResolvedValue(15);
    mockPrisma.knowledgeEdge.count.mockResolvedValue(25);
    mockPrisma.knowledgeNode.findMany.mockResolvedValue([
      {
        id: "node-1",
        concept: "machine learning",
        description: "ML description",
        expertProfileId: mockExpertProfile.id,
        _count: { outEdges: 5, inEdges: 3 },
      },
      {
        id: "node-2",
        concept: "neural networks",
        description: "NN description",
        expertProfileId: mockExpertProfile.id,
        _count: { outEdges: 4, inEdges: 2 },
      },
      {
        id: "node-3",
        concept: "deep learning",
        description: "DL description",
        expertProfileId: mockExpertProfile.id,
        _count: { outEdges: 1, inEdges: 1 },
      },
    ]);

    const req = createGET("/api/expert/graph");
    const res = await getGraph();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.nodeCount).toBe(15);
    expect(data.edgeCount).toBe(25);
    expect(data.topConcepts).toHaveLength(3);
    expect(data.topConcepts[0].concept).toBe("machine learning");
    expect(data.topConcepts[0].edgeCount).toBe(8);
    expect(data.topConcepts[1].concept).toBe("neural networks");
    expect(data.topConcepts[1].edgeCount).toBe(6);
  });

  it("returns zeros when no graph built", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.knowledgeNode.count.mockResolvedValue(0);
    mockPrisma.knowledgeEdge.count.mockResolvedValue(0);
    mockPrisma.knowledgeNode.findMany.mockResolvedValue([]);

    const req = createGET("/api/expert/graph");
    const res = await getGraph();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.nodeCount).toBe(0);
    expect(data.edgeCount).toBe(0);
    expect(data.topConcepts).toEqual([]);
  });
});

describe("POST /api/expert/graph", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createPOST("/api/expert/graph", {});
    const res = await buildGraph();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 when not an expert", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const req = createPOST("/api/expert/graph", {});
    const res = await buildGraph();
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain("Only experts");
  });

  it("successfully builds graph", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);

    mockPrisma.knowledgeItem.findMany.mockResolvedValue([
      {
        id: "ki-1",
        expertProfileId: mockExpertProfile.id,
        content: "Machine learning is a subset of AI that enables systems to learn.",
      },
      {
        id: "ki-2",
        expertProfileId: mockExpertProfile.id,
        content: "Neural networks are inspired by biological neurons.",
      },
    ]);

    mockExtractEntities
      .mockResolvedValueOnce({
        nodes: [
          { concept: "machine learning", description: "A subset of AI" },
          { concept: "artificial intelligence", description: "Broad field of CS" },
        ],
        edges: [
          { source: "machine learning", target: "artificial intelligence", relationship: "is subset of" },
        ],
      })
      .mockResolvedValueOnce({
        nodes: [
          { concept: "neural networks", description: "Computing systems inspired by biology" },
        ],
        edges: [],
      });

    mockPrisma.knowledgeNode.upsert.mockResolvedValue({ id: "node-1" });
    mockPrisma.knowledgeNode.findUnique
      .mockResolvedValueOnce({ id: "node-src", concept: "machine learning" })
      .mockResolvedValueOnce({ id: "node-tgt", concept: "artificial intelligence" });
    mockPrisma.knowledgeEdge.upsert.mockResolvedValue({ id: "edge-1" });

    const req = createPOST("/api/expert/graph", {});
    const res = await buildGraph();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.nodesCreated).toBe(3);
    expect(data.edgesCreated).toBe(1);
    expect(mockPrisma.knowledgeNode.upsert).toHaveBeenCalledTimes(3);
    expect(mockPrisma.knowledgeEdge.upsert).toHaveBeenCalledTimes(1);
  });

  it("handles empty knowledge base", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.knowledgeItem.findMany.mockResolvedValue([]);

    const req = createPOST("/api/expert/graph", {});
    const res = await buildGraph();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.nodesCreated).toBe(0);
    expect(data.edgesCreated).toBe(0);
  });
});

// =============================================================================
// GRAPH RETRIEVER (unit test)
// =============================================================================

describe("graphEnhancedRetrieval", () => {
  it("returns related concepts from recursive CTE graph traversal", async () => {
    const vectorResults = [
      { content: "Machine learning algorithms provide powerful tools for prediction", score: 0.9, metadata: {} },
    ];

    // Mock seed node lookup (Prisma findMany for initial keyword match)
    mockPrisma.knowledgeNode.findMany.mockResolvedValue([
      {
        id: "node-1",
        concept: "machine learning",
        description: "ML techniques",
        expertProfileId: "profile-id-1",
      },
    ]);

    // Mock the recursive CTE query result ($queryRawUnsafe)
    mockPrisma.$queryRawUnsafe.mockResolvedValue([
      {
        id: "node-2",
        concept: "gradient descent",
        description: "Optimization algorithm for finding minimum of a function",
        depth: 1,
        path: "node-1,node-2",
      },
      {
        id: "node-3",
        concept: "training data",
        description: "Data used to train models",
        depth: 1,
        path: "node-1,node-3",
      },
      {
        id: "node-4",
        concept: "loss function",
        description: "Measures prediction error",
        depth: 2,
        path: "node-1,node-2,node-4",
      },
    ]);

    const result = await graphEnhancedRetrieval("profile-id-1", vectorResults);

    expect(result.length).toBeGreaterThan(0);
    // Verify format includes depth info
    expect(result[0]).toContain(":");
    const hasGradientDescent = result.some((r) => r.includes("gradient descent"));
    const hasTrainingData = result.some((r) => r.includes("training data"));
    expect(hasGradientDescent || hasTrainingData).toBe(true);
    // Verify multi-hop results are included
    const hasLossFunction = result.some((r) => r.includes("loss function"));
    expect(hasLossFunction).toBe(true);
  });

  it("returns empty array when no matching nodes", async () => {
    const vectorResults = [
      { content: "Machine learning algorithms provide powerful tools", score: 0.9, metadata: {} },
    ];

    mockPrisma.knowledgeNode.findMany.mockResolvedValue([]);

    const result = await graphEnhancedRetrieval("profile-id-1", vectorResults);

    expect(result).toEqual([]);
  });

  it("returns empty array when vector results are empty", async () => {
    const result = await graphEnhancedRetrieval("profile-id-1", []);

    expect(result).toEqual([]);
  });

  it("supports multi-hop traversal up to specified depth", async () => {
    const vectorResults = [
      { content: "Neural network architecture design patterns", score: 0.85, metadata: {} },
    ];

    mockPrisma.knowledgeNode.findMany.mockResolvedValue([
      { id: "seed-1", concept: "neural network", description: "Computing model", expertProfileId: "profile-id-1" },
    ]);

    // Simulate 3 hops of connected concepts
    mockPrisma.$queryRawUnsafe.mockResolvedValue([
      { id: "hop1", concept: "backpropagation", description: "Training algorithm", depth: 1, path: "seed-1,hop1" },
      { id: "hop2", concept: "gradient descent", description: "Optimization method", depth: 2, path: "seed-1,hop1,hop2" },
    ]);

    const result = await graphEnhancedRetrieval("profile-id-1", vectorResults, 3);

    expect(result.length).toBe(2);
    expect(result[0]).toContain("directly related");
    expect(result[1]).toContain("2 hops away");
  });
});

// =============================================================================
// ACCURACY SCORE API (/api/expert/accuracy-score)
// =============================================================================

describe("GET /api/expert/accuracy-score", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createGET("/api/expert/accuracy-score");
    const res = await getScore();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 when not an expert", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const req = createGET("/api/expert/accuracy-score");
    const res = await getScore();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns existing score if cached", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({ id: mockExpertProfile.id });

    const cachedScore = {
      id: "score-1",
      expertProfileId: mockExpertProfile.id,
      overallScore: 75,
      components: {
        knowledgeCoverage: 80,
        personalityCompleteness: 70,
        graphDensity: 60,
        subscriberRatings: 85,
        responseQuality: 72,
      },
      calculatedAt: new Date("2024-06-01"),
    };
    mockPrisma.twinAccuracyScore.findUnique.mockResolvedValue(cachedScore);

    const req = createGET("/api/expert/accuracy-score");
    const res = await getScore();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.overallScore).toBe(75);
    expect(data.components.knowledgeCoverage).toBe(80);
    expect(data.components.personalityCompleteness).toBe(70);
  });

  it("calculates and returns score if none cached", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique
      .mockResolvedValueOnce({ id: mockExpertProfile.id }) // route lookup
      .mockResolvedValueOnce({ // calculateTwinScore lookup
        id: mockExpertProfile.id,
        personalityProfile: {
          tone: "professional",
          writingStyle: "concise",
          catchphrases: ["indeed"],
          communicationGuidelines: ["be clear"],
          topicExpertise: ["AI"],
        },
        twinPersonality: "I am an AI expert",
      });

    // First findUnique returns null (no cached score), second returns the newly created score
    mockPrisma.twinAccuracyScore.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "score-new",
        expertProfileId: mockExpertProfile.id,
        overallScore: 65,
        components: {
          knowledgeCoverage: 48,
          personalityCompleteness: 100,
          graphDensity: 45,
          subscriberRatings: 50,
          responseQuality: 50,
        },
        calculatedAt: new Date(),
      });

    // Mocks for calculateTwinScore
    mockPrisma.knowledgeItem.count
      .mockResolvedValueOnce(10)  // totalItems
      .mockResolvedValueOnce(8);  // indexedItems
    mockPrisma.knowledgeNode.count.mockResolvedValue(12);
    mockPrisma.knowledgeEdge.count.mockResolvedValue(18);
    mockPrisma.chatMessage.findMany.mockResolvedValue([]);
    mockPrisma.twinInteraction.findMany.mockResolvedValue([]);
    mockPrisma.twinAccuracyScore.upsert.mockResolvedValue({});

    const req = createGET("/api/expert/accuracy-score");
    const res = await getScore();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.overallScore).toBeDefined();
    expect(data.components).toBeDefined();
    expect(mockPrisma.twinAccuracyScore.upsert).toHaveBeenCalled();
  });
});

describe("POST /api/expert/accuracy-score", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createPOST("/api/expert/accuracy-score", {});
    const res = await calcScore();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 when not an expert", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const req = createPOST("/api/expert/accuracy-score", {});
    const res = await calcScore();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("successfully calculates composite score", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique
      .mockResolvedValueOnce({ id: mockExpertProfile.id }) // route lookup
      .mockResolvedValueOnce({ // calculateTwinScore lookup
        id: mockExpertProfile.id,
        personalityProfile: {
          tone: "friendly",
          writingStyle: "detailed",
          catchphrases: ["great question"],
          communicationGuidelines: ["use examples"],
          topicExpertise: ["ML", "AI"],
        },
        twinPersonality: "I am an AI expert",
      });

    mockPrisma.knowledgeItem.count
      .mockResolvedValueOnce(10)  // totalItems
      .mockResolvedValueOnce(8);  // indexedItems

    mockPrisma.knowledgeNode.count.mockResolvedValue(12);
    mockPrisma.knowledgeEdge.count.mockResolvedValue(18);

    mockPrisma.chatMessage.findMany.mockResolvedValue([
      { rating: 1 },
      { rating: 1 },
      { rating: 1 },
      { rating: -1 },
    ]);

    mockPrisma.twinInteraction.findMany.mockResolvedValue([
      { answerQuality: 0.85 },
      { answerQuality: 0.9 },
    ]);

    mockPrisma.twinAccuracyScore.upsert.mockResolvedValue({});

    const req = createPOST("/api/expert/accuracy-score", {});
    const res = await calcScore();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.overallScore).toBeGreaterThanOrEqual(0);
    expect(data.overallScore).toBeLessThanOrEqual(100);
    expect(data.components).toBeDefined();
    expect(data.components.knowledgeCoverage).toBeGreaterThanOrEqual(0);
    expect(data.components.knowledgeCoverage).toBeLessThanOrEqual(100);
    expect(data.components.personalityCompleteness).toBeGreaterThanOrEqual(0);
    expect(data.components.personalityCompleteness).toBeLessThanOrEqual(100);
    expect(data.components.graphDensity).toBeGreaterThanOrEqual(0);
    expect(data.components.graphDensity).toBeLessThanOrEqual(100);
    expect(data.components.subscriberRatings).toBeGreaterThanOrEqual(0);
    expect(data.components.subscriberRatings).toBeLessThanOrEqual(100);
    expect(data.components.responseQuality).toBeGreaterThanOrEqual(0);
    expect(data.components.responseQuality).toBeLessThanOrEqual(100);
    expect(data.calculatedAt).toBeDefined();
  });
});

// =============================================================================
// MESSAGE RATING (/api/chat/sessions/[sessionId]/messages/[messageId]/rate)
// =============================================================================

describe("POST /api/chat/sessions/.../messages/.../rate", () => {
  beforeEach(() => {
    // The reviewed route persists ratings and pending audit candidates atomically.
    mockPrisma.$queryRaw.mockImplementation(async (parts: TemplateStringsArray) =>
      parts.join("?").includes('FROM "ExpertProfile"') ? [{ id: "expert-1", userId: "expert-owner" }] : []
    );
    mockPrisma.$executeRaw.mockResolvedValue(1);
  });
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createPOST("/api/chat/sessions/session-1/messages/msg-1/rate", { rating: 1 });
    const res = await rateMessage(req, messageParams("session-1", "msg-1"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid rating value 0", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const req = createPOST("/api/chat/sessions/session-1/messages/msg-1/rate", { rating: 0 });
    const res = await rateMessage(req, messageParams("session-1", "msg-1"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid request");
  });

  it("returns 400 for invalid rating value 2", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const req = createPOST("/api/chat/sessions/session-1/messages/msg-1/rate", { rating: 2 });
    const res = await rateMessage(req, messageParams("session-1", "msg-1"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid request");
  });

  it("returns 400 for invalid rating value string", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const req = createPOST("/api/chat/sessions/session-1/messages/msg-1/rate", { rating: "abc" });
    const res = await rateMessage(req, messageParams("session-1", "msg-1"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid request");
  });

  it("successfully rates an assistant message with thumbs up (1)", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.chatSession.findUnique.mockResolvedValue({
      id: "session-1",
      subscriberId: "subscriber-id-1",
    });

    mockPrisma.chatMessage.findUnique.mockResolvedValue({
      id: "msg-1",
      chatSessionId: "session-1",
      role: "assistant",
      sources: [],
      chatSession: { subscriberId: "subscriber-id-1", expertProfileId: "expert-1" },
    });

    mockPrisma.chatMessage.update.mockResolvedValue({
      id: "msg-1",
      rating: 1,
    });

    const req = createPOST("/api/chat/sessions/session-1/messages/msg-1/rate", { rating: 1 });
    const res = await rateMessage(req, messageParams("session-1", "msg-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.reviewState).toBe("PENDING");
    expect(data.auditOperationKey).toBe(`submit:${data.reviewId}`);
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);
    expect(data.rating).toBe(1);
    expect(mockPrisma.chatMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "msg-1" },
        data: { rating: 1 },
      })
    );
  });

  it("successfully rates with thumbs down (-1)", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.chatSession.findUnique.mockResolvedValue({
      id: "session-1",
      subscriberId: "subscriber-id-1",
    });

    mockPrisma.chatMessage.findUnique.mockResolvedValue({
      id: "msg-1",
      chatSessionId: "session-1",
      role: "assistant",
      sources: [],
      chatSession: { subscriberId: "subscriber-id-1", expertProfileId: "expert-1" },
    });

    mockPrisma.chatMessage.update.mockResolvedValue({
      id: "msg-1",
      rating: -1,
    });

    const req = createPOST("/api/chat/sessions/session-1/messages/msg-1/rate", { rating: -1 });
    const res = await rateMessage(req, messageParams("session-1", "msg-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.reviewState).toBe("PENDING");
    expect(data.auditOperationKey).toBe(`submit:${data.reviewId}`);
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);
    expect(data.rating).toBe(-1);
    expect(mockPrisma.chatMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "msg-1" },
        data: { rating: -1 },
      })
    );
  });

  it("returns 404 when session not found", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.chatSession.findUnique.mockResolvedValue(null);

    const req = createPOST("/api/chat/sessions/nonexistent/messages/msg-1/rate", { rating: 1 });
    const res = await rateMessage(req, messageParams("nonexistent", "msg-1"));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain("not found");
  });

  it("returns 403 when session belongs to different user", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.chatSession.findUnique.mockResolvedValue({
      id: "session-1",
      subscriberId: "different-user-id",
    });
    mockPrisma.chatMessage.findUnique.mockResolvedValue({
      id: "msg-1", chatSessionId: "session-1", role: "assistant",
      chatSession: { subscriberId: "different-user-id", expertProfileId: "expert-1" },
    });

    const req = createPOST("/api/chat/sessions/session-1/messages/msg-1/rate", { rating: 1 });
    const res = await rateMessage(req, messageParams("session-1", "msg-1"));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Message access denied");
    expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    expect(mockPrisma.chatMessage.update).not.toHaveBeenCalled();
  });

  it("returns 404 when message not found", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.chatSession.findUnique.mockResolvedValue({
      id: "session-1",
      subscriberId: "subscriber-id-1",
    });

    mockPrisma.chatMessage.findUnique.mockResolvedValue(null);

    const req = createPOST("/api/chat/sessions/session-1/messages/nonexistent/rate", { rating: 1 });
    const res = await rateMessage(req, messageParams("session-1", "nonexistent"));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain("not found");
  });

  it("returns 400 when trying to rate a user message", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.chatSession.findUnique.mockResolvedValue({
      id: "session-1",
      subscriberId: "subscriber-id-1",
    });

    mockPrisma.chatMessage.findUnique.mockResolvedValue({
      id: "msg-1",
      chatSessionId: "session-1",
      role: "user",
      chatSession: { subscriberId: "subscriber-id-1", expertProfileId: "expert-1" },
    });

    const req = createPOST("/api/chat/sessions/session-1/messages/msg-1/rate", { rating: 1 });
    const res = await rateMessage(req, messageParams("session-1", "msg-1"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("assistant");
  });
});

// =============================================================================
// ACCURACY SCORER UNIT TESTS
// =============================================================================

describe("calculateTwinScore", () => {
  it("returns score with all components as weighted average", async () => {
    // 10 items, 8 indexed => baseKnowledge=60, indexedRatio=0.8, knowledgeCoverage=48
    mockPrisma.knowledgeItem.count
      .mockResolvedValueOnce(10) // totalItems
      .mockResolvedValueOnce(8); // indexedItems

    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      id: "profile-id-1",
      personalityProfile: {
        tone: "professional",
        writingStyle: "concise",
        catchphrases: ["indeed"],
        communicationGuidelines: ["be clear"],
        topicExpertise: ["AI"],
      },
      twinPersonality: "I am an expert",
    });

    // nodeCount=12, edgeCount=18 => graphDensity = min(100, 12*5 + 18*3) = min(100, 114) = 100
    mockPrisma.knowledgeNode.count.mockResolvedValue(12);
    mockPrisma.knowledgeEdge.count.mockResolvedValue(18);

    // 3 positive, 1 negative => subscriberRatings = round(3/4 * 100) = 75
    mockPrisma.chatMessage.findMany.mockResolvedValue([
      { rating: 1 },
      { rating: 1 },
      { rating: 1 },
      { rating: -1 },
    ]);

    // avg quality = 0.85 => responseQuality = round(0.85 * 100) = 85
    mockPrisma.twinInteraction.findMany.mockResolvedValue([
      { answerQuality: 0.8 },
      { answerQuality: 0.9 },
    ]);

    mockPrisma.twinAccuracyScore.upsert.mockResolvedValue({});

    const result = await calculateTwinScore("profile-id-1");

    // knowledgeCoverage = 48
    // personalityCompleteness = 20 + 16 + 16 + 16 + 16 + 16 = 100
    // graphDensity = 100
    // subscriberRatings = 75
    // responseQuality = 85
    // overall = 48*0.3 + 100*0.2 + 100*0.15 + 75*0.2 + 85*0.15
    //         = 14.4 + 20 + 15 + 15 + 12.75 = 77.15 => 77
    expect(result.overallScore).toBe(77);
    expect(result.components.knowledgeCoverage).toBe(48);
    expect(result.components.personalityCompleteness).toBe(100);
    expect(result.components.graphDensity).toBe(100);
    expect(result.components.subscriberRatings).toBe(75);
    expect(result.components.responseQuality).toBe(85);

    // Verify all components are 0-100
    Object.values(result.components).forEach((val) => {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(100);
    });

    expect(mockPrisma.twinAccuracyScore.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { expertProfileId: "profile-id-1" },
      })
    );
  });

  it("returns low score for empty expert (no knowledge, no personality, no graph)", async () => {
    mockPrisma.knowledgeItem.count
      .mockResolvedValueOnce(0)  // totalItems
      .mockResolvedValueOnce(0); // indexedItems

    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      id: "profile-id-1",
      personalityProfile: null,
      twinPersonality: null,
    });

    mockPrisma.knowledgeNode.count.mockResolvedValue(0);
    mockPrisma.knowledgeEdge.count.mockResolvedValue(0);
    mockPrisma.chatMessage.findMany.mockResolvedValue([]);
    mockPrisma.twinInteraction.findMany.mockResolvedValue([]);
    mockPrisma.twinAccuracyScore.upsert.mockResolvedValue({});

    const result = await calculateTwinScore("profile-id-1");

    // knowledgeCoverage = 0 (no items)
    // personalityCompleteness = 0 (neither set)
    // graphDensity = 0 (no nodes)
    // subscriberRatings = 0 (no ratings)
    // responseQuality = 0 (no interactions)
    // overall = 0*0.3 + 0*0.2 + 0*0.15 + 0*0.2 + 0*0.15 = 0
    expect(result.overallScore).toBe(0);
    expect(result.components.knowledgeCoverage).toBe(0);
    expect(result.components.personalityCompleteness).toBe(0);
    expect(result.components.graphDensity).toBe(0);
    expect(result.components.subscriberRatings).toBe(0);
    expect(result.components.responseQuality).toBe(0);
  });

  it("returns high score for well-configured expert", async () => {
    // 50+ items => baseKnowledge=100, all indexed => knowledgeCoverage=100
    mockPrisma.knowledgeItem.count
      .mockResolvedValueOnce(50)  // totalItems
      .mockResolvedValueOnce(50); // indexedItems

    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      id: "profile-id-1",
      personalityProfile: {
        tone: "professional",
        writingStyle: "detailed",
        catchphrases: ["absolutely"],
        communicationGuidelines: ["provide examples"],
        topicExpertise: ["AI", "ML", "DL"],
      },
      twinPersonality: "I am an AI expert with deep knowledge",
    });

    // Large graph => graphDensity capped at 100
    mockPrisma.knowledgeNode.count.mockResolvedValue(20);
    mockPrisma.knowledgeEdge.count.mockResolvedValue(30);

    // All positive ratings
    mockPrisma.chatMessage.findMany.mockResolvedValue([
      { rating: 1 },
      { rating: 1 },
      { rating: 1 },
      { rating: 1 },
      { rating: 1 },
    ]);

    // High quality interactions
    mockPrisma.twinInteraction.findMany.mockResolvedValue([
      { answerQuality: 0.95 },
      { answerQuality: 0.92 },
      { answerQuality: 0.98 },
    ]);

    mockPrisma.twinAccuracyScore.upsert.mockResolvedValue({});

    const result = await calculateTwinScore("profile-id-1");

    // knowledgeCoverage = 100
    // personalityCompleteness = 100
    // graphDensity = min(100, 20*5 + 30*3) = min(100, 190) = 100
    // subscriberRatings = 100
    // responseQuality = round(0.95 * 100) = 95
    // overall = 100*0.3 + 100*0.2 + 100*0.15 + 100*0.2 + 95*0.15
    //         = 30 + 20 + 15 + 20 + 14.25 = 99.25 => 99
    expect(result.overallScore).toBe(99);
    expect(result.components.knowledgeCoverage).toBe(100);
    expect(result.components.personalityCompleteness).toBe(100);
    expect(result.components.graphDensity).toBe(100);
    expect(result.components.subscriberRatings).toBe(100);
    expect(result.components.responseQuality).toBe(95);

    // All components should be high
    Object.values(result.components).forEach((val) => {
      expect(val).toBeGreaterThanOrEqual(90);
    });
  });
});
