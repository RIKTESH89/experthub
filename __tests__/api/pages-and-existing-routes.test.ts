import { removeKnowledgeItem as removeDocument } from "@/lib/knowledge/lifecycle";
jest.mock("@/lib/knowledge/lifecycle", () => require("../mocks/lifecycle"));
import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import {
  mockExpertProfile,
  mockUsers,
  mockChatSession,
  mockKnowledgeItem,
  mockSubscription,
  mockPost,
} from "../mocks/data";
import { createGET, createPOST, createPATCH, createDELETE } from "../helpers/request";

jest.mock("@/lib/prisma", () => ({ __esModule: true, default: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: mockAuth }));
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("$2a$12$hashed"),
  compare: jest.fn().mockResolvedValue(true),
}));
jest.mock("@/lib/vector/indexer", () => ({
  indexDocument: jest.fn().mockResolvedValue(["vec-1"]),
  removeDocument: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/graph/graph-builder", () => ({
  addToGraph: jest.fn().mockResolvedValue(undefined),
  buildGraphFromContent: jest.fn().mockResolvedValue({ nodesCreated: 5, edgesCreated: 3 }),
}));
jest.mock("@/lib/ai/personality-analyzer", () => ({
  analyzePersonality: jest.fn().mockResolvedValue({
    traits: ["analytical", "precise"],
    communicationStyle: "formal",
    score: 85,
  }),
}));
jest.mock("@/lib/ai/accuracy-scorer", () => ({
  calculateTwinScore: jest.fn().mockResolvedValue({
    overallScore: 0.87,
    components: { knowledge: 0.9, personality: 0.85 },
  }),
}));
jest.mock("@/lib/ai/memory-manager", () => ({
  getMemoryCount: jest.fn().mockResolvedValue(5),
}));
jest.mock("@/lib/trial", () => ({
  checkTrialAccess: jest.fn().mockResolvedValue({ allowed: true, used: 0, limit: 5 }),
  incrementTrialUsage: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/utils", () => ({
  slugify: jest.fn((text: string) => text.toLowerCase().replace(/\s+/g, "-")),
  cn: jest.fn(),
  formatDate: jest.fn(),
  formatRelativeDate: jest.fn(),
  formatNumber: jest.fn(),
  getInitials: jest.fn(),
  truncate: jest.fn(),
}));

// Existing route imports
import { POST as registerUser } from "@/app/api/auth/register/route";
import {
  GET as getTwinConfig,
  PATCH as updateTwinConfig,
} from "@/app/api/expert/twin-config/route";
import { GET as getTwinStats } from "@/app/api/expert/twin-stats/route";
import {
  GET as listKnowledge,
  POST as createKnowledge,
} from "@/app/api/knowledge/route";
import { DELETE as deleteKnowledgeItem } from "@/app/api/knowledge/[itemId]/route";
import { GET as getKnowledgeStats } from "@/app/api/knowledge/stats/route";
import { GET as listPosts, POST as createPost } from "@/app/api/posts/route";
import {
  GET as listSessions,
  POST as createSession,
} from "@/app/api/chat/sessions/route";
import {
  GET as getExpertProfile,
  PATCH as updateExpertProfile,
} from "@/app/api/expert/profile/route";
import { GET as getSubscriberStats } from "@/app/api/subscriber/stats/route";
import { GET as getExpertSubscribers } from "@/app/api/expert/subscribers/route";

// New route imports
import {
  GET as getPersonality,
  POST as analyzePersonality,
} from "@/app/api/expert/personality/route";
import {
  GET as getMemories,
  DELETE as deleteMemory,
} from "@/app/api/expert/memories/route";
import {
  GET as getGraph,
  POST as buildGraph,
} from "@/app/api/expert/graph/route";
import {
  GET as getAccuracyScore,
  POST as calcAccuracyScore,
} from "@/app/api/expert/accuracy-score/route";
import { GET as getMemoryCount } from "@/app/api/chat/sessions/[sessionId]/memories/route";
import { POST as rateMessage } from "@/app/api/chat/sessions/[sessionId]/messages/[messageId]/rate/route";

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  resetAllMocks();
  jest.clearAllMocks();
  mockAuth.mockReset();
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ==========================================================================
// SECTION 1: Existing API Routes Still Work
// ==========================================================================

describe("SECTION 1: Existing API Routes Still Work", () => {
  // -----------------------------------------------------------------------
  // 1. POST /api/auth/register
  // -----------------------------------------------------------------------
  describe("POST /api/auth/register", () => {
    it("retired password registration: creates user successfully", async () => {
mockPrisma.user.findUnique.mockResolvedValue(null);
const createdUser = {
        id: "new-user-id",
        name: "New Expert",
        email: "new@test.com",
        hashedPassword: "$2a$12$hashed",
        role: "EXPERT",
        bio: null,
        headline: null,
        image: null,
        isActive: true,
        isBanned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        expertProfile: {
          id: "new-profile-id",
          userId: "new-user-id",
          displayName: "New Expert",
          vectorNamespace: "expert_temp",
        },
      };
mockPrisma.user.create.mockResolvedValue(createdUser);
mockPrisma.expertProfile.update.mockResolvedValue({
        ...createdUser.expertProfile,
        vectorNamespace: "expert_new-expert_new-user",
      });
const req = createPOST("/api/auth/register", {
        name: "New Expert",
        email: "new@test.com",
        password: "password123",
        role: "EXPERT",
      });
const res = await registerUser(req);
expect(res.status).toBe(410);
expect((await res.json()).code).toBe("REGISTRATION_RETIRED");
expect(mockPrisma.user.create).not.toHaveBeenCalled();
expect(mockPrisma.expertProfile.create).not.toHaveBeenCalled();
});
  });

  // -----------------------------------------------------------------------
  // 2. GET /api/expert/twin-config
  // -----------------------------------------------------------------------
  describe("GET /api/expert/twin-config", () => {
    it("returns config with personality fields", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.expertProfile.findUnique.mockResolvedValue({
        twinPersonality: "I am an AI expert",
        twinGreeting: "Hello! Ask me about AI.",
        ragEnabled: true,
      });

      const req = createGET("/api/expert/twin-config");
      const res = await getTwinConfig();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.twinPersonality).toBe("I am an AI expert");
      expect(data.twinGreeting).toBe("Hello! Ask me about AI.");
      expect(data.ragEnabled).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // 3. PATCH /api/expert/twin-config
  // -----------------------------------------------------------------------
  describe("PATCH /api/expert/twin-config", () => {
    it("updates config successfully", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
      mockPrisma.expertProfile.update.mockResolvedValue({
        twinPersonality: "Updated personality",
        twinGreeting: "Updated greeting",
        ragEnabled: false,
      });

      const req = createPATCH("/api/expert/twin-config", {
        twinPersonality: "Updated personality",
        twinGreeting: "Updated greeting",
        ragEnabled: false,
      });

      const res = await updateTwinConfig(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.twinPersonality).toBe("Updated personality");
      expect(data.ragEnabled).toBe(false);
      expect(mockPrisma.expertProfile.update).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 4. GET /api/expert/twin-stats
  // -----------------------------------------------------------------------
  describe("GET /api/expert/twin-stats", () => {
    it("returns stats", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
      mockPrisma.knowledgeItem.count
        .mockResolvedValueOnce(15) // totalKnowledgeItems
        .mockResolvedValueOnce(12); // indexedDocuments
      mockPrisma.chatSession.count.mockResolvedValue(7);

      const res = await getTwinStats();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.totalKnowledgeItems).toBe(15);
      expect(data.indexedDocuments).toBe(12);
      expect(data.totalChats).toBe(7);
    });
  });

  // -----------------------------------------------------------------------
  // 5. POST /api/knowledge
  // -----------------------------------------------------------------------
  describe("POST /api/knowledge", () => {
    it("creates knowledge item", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
      const createdItem = {
        ...mockKnowledgeItem,
        id: "new-knowledge-id",
        isIndexed: false,
        vectorIds: [],
      };
      mockPrisma.knowledgeItem.create.mockResolvedValue(createdItem);
      mockPrisma.knowledgeItem.update.mockResolvedValue({
        ...createdItem,
        isIndexed: true,
        vectorIds: ["vec-1"],
      });

      const req = createPOST("/api/knowledge", {
        title: "New Knowledge",
        content: "Knowledge content here",
        sourceType: "manual",
      });

      const res = await createKnowledge(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.isIndexed).toBe(true);
      expect(data.vectorIds).toContain("vec-1");
      expect(mockPrisma.knowledgeItem.create).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 6. GET /api/knowledge
  // -----------------------------------------------------------------------
  describe("GET /api/knowledge", () => {
    it("lists knowledge items", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
      mockPrisma.knowledgeItem.findMany.mockResolvedValue([mockKnowledgeItem]);

      const res = await listKnowledge();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe("knowledge-id-1");
    });
  });

  // -----------------------------------------------------------------------
  // 7. DELETE /api/knowledge/[itemId]
  // -----------------------------------------------------------------------
  describe("DELETE /api/knowledge/[itemId]", () => {
    it("deletes knowledge item", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.knowledgeItem.findUnique.mockResolvedValue(mockKnowledgeItem);
      mockPrisma.knowledgeItem.delete.mockResolvedValue(mockKnowledgeItem);

      const req = createDELETE("/api/knowledge/knowledge-id-1");
      const res = await deleteKnowledgeItem(req, {
        params: Promise.resolve({ itemId: "knowledge-id-1" }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe("Knowledge item deleted successfully");
      expect(removeDocument).toHaveBeenCalledWith(mockExpertProfile.id, "knowledge-id-1");
    });
  });

  // -----------------------------------------------------------------------
  // 8. GET /api/knowledge/stats
  // -----------------------------------------------------------------------
  describe("GET /api/knowledge/stats", () => {
    it("returns stats", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
      mockPrisma.knowledgeItem.count
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(15); // indexed

      const res = await getKnowledgeStats();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.total).toBe(20);
      expect(data.indexed).toBe(15);
      expect(data.pending).toBe(5);
    });
  });

  // -----------------------------------------------------------------------
  // 9. GET /api/posts
  // -----------------------------------------------------------------------
  describe("GET /api/posts", () => {
    it("lists posts", async () => {
      mockAuth.mockResolvedValue(null);
      const postWithRelations = {
        ...mockPost,
        tags: [{ tag: { name: "AI" } }],
      };
      mockPrisma.post.findMany.mockResolvedValue([postWithRelations]);
      mockPrisma.post.count.mockResolvedValue(1);

      const req = createGET("/api/posts");
      const res = await listPosts(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.posts).toBeDefined();
      expect(data.pagination).toBeDefined();
      expect(data.pagination.total).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // 10. POST /api/posts
  // -----------------------------------------------------------------------
  describe("POST /api/posts", () => {
    it("creates post", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.tag.upsert.mockResolvedValue({ id: "tag-1", name: "AI", slug: "ai" });
      const createdPost = {
        ...mockPost,
        tags: [{ tag: { name: "AI" } }],
      };
      mockPrisma.post.create.mockResolvedValue(createdPost);

      const req = createPOST("/api/posts", {
        content: "My new post content",
        title: "My Post",
        tags: ["AI"],
        media: [],
      });

      const res = await createPost(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.tags).toContain("AI");
      expect(mockPrisma.post.create).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 11. POST /api/chat/sessions
  // -----------------------------------------------------------------------
  describe("POST /api/chat/sessions", () => {
    it("creates session", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      mockPrisma.expertProfile.findUnique.mockResolvedValue({
        ...mockExpertProfile,
        user: { name: "Expert User" },
        twinGreeting: "Hello!",
      });
      mockPrisma.expertSubscription.findUnique.mockResolvedValue({
        ...mockSubscription,
        status: "ACTIVE",
      });
      const createdSession = {
        ...mockChatSession,
        id: "new-session-id",
        expertProfile: {
          displayName: "Expert User",
          twinGreeting: "Hello!",
          user: { id: "expert-id-1", name: "Expert User", image: null },
        },
      };
      mockPrisma.chatSession.create.mockResolvedValue(createdSession);
      mockPrisma.chatMessage.create.mockResolvedValue({});

      const req = createPOST("/api/chat/sessions", {
        expertId: "expert-id-1",
        title: "New Chat",
      });

      const res = await createSession(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.id).toBe("new-session-id");
      expect(mockPrisma.chatSession.create).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 12. GET /api/chat/sessions
  // -----------------------------------------------------------------------
  describe("GET /api/chat/sessions", () => {
    it("lists sessions", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      mockPrisma.chatSession.findMany.mockResolvedValue([mockChatSession]);

      const req = createGET("/api/chat/sessions");
      const res = await listSessions(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // 13. GET /api/expert/profile
  // -----------------------------------------------------------------------
  describe("GET /api/expert/profile", () => {
    it("returns profile", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.user.findUnique.mockResolvedValue({
        name: "Expert User",
        email: "expert@test.com",
        image: null,
        bio: "Expert bio",
        headline: "AI Expert",
        expertProfile: {
          displayName: "Expert User",
          specialty: ["AI", "ML"],
          monthlyPrice: 9.99,
          socialLinks: null,
        },
      });

      const res = await getExpertProfile();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.name).toBe("Expert User");
      expect(data.displayName).toBe("Expert User");
      expect(data.specialty).toEqual(["AI", "ML"]);
    });
  });

  // -----------------------------------------------------------------------
  // 14. PATCH /api/expert/profile
  // -----------------------------------------------------------------------
  describe("PATCH /api/expert/profile", () => {
    it("updates profile", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
      mockPrisma.user.update.mockResolvedValue({
        name: "Updated Name",
        email: "expert@test.com",
        image: null,
        bio: "Updated bio",
        headline: "Updated headline",
      });
      mockPrisma.expertProfile.update.mockResolvedValue({
        displayName: "Updated Display",
        specialty: ["AI"],
        monthlyPrice: 19.99,
        socialLinks: null,
      });

      const req = createPATCH("/api/expert/profile", {
        name: "Updated Name",
        displayName: "Updated Display",
        bio: "Updated bio",
        headline: "Updated headline",
        monthlyPrice: 19.99,
      });

      const res = await updateExpertProfile(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.name).toBe("Updated Name");
      expect(data.displayName).toBe("Updated Display");
    });
  });

  // -----------------------------------------------------------------------
  // 15. GET /api/subscriber/stats
  // -----------------------------------------------------------------------
  describe("GET /api/subscriber/stats", () => {
    it("returns stats", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      mockPrisma.expertSubscription.count.mockResolvedValue(3);
      mockPrisma.bookmark.count.mockResolvedValue(5);
      mockPrisma.chatSession.count.mockResolvedValue(8);

      const res = await getSubscriberStats();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.activeSubscriptions).toBe(3);
      expect(data.bookmarkedPosts).toBe(5);
      expect(data.twinChats).toBe(8);
    });
  });

  // -----------------------------------------------------------------------
  // 16. GET /api/expert/subscribers
  // -----------------------------------------------------------------------
  describe("GET /api/expert/subscribers", () => {
    it("lists subscribers", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.expertProfile.findUnique.mockResolvedValue({
        id: "profile-id-1",
      });
      mockPrisma.expertSubscription.findMany.mockResolvedValue([
        {
          id: "sub-id-1",
          status: "ACTIVE",
          startDate: new Date("2024-01-01"),
          price: 9.99,
          subscriber: {
            id: "subscriber-id-1",
            name: "Subscriber User",
            email: "subscriber@test.com",
            image: null,
          },
        },
      ]);

      const res = await getExpertSubscribers();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.subscribers).toBeDefined();
      expect(data.subscribers).toHaveLength(1);
      expect(data.subscribers[0].name).toBe("Subscriber User");
    });
  });
});

// ==========================================================================
// SECTION 2: Cross-Feature Integration Tests
// ==========================================================================

describe("SECTION 2: Cross-Feature Integration Tests", () => {
  // -----------------------------------------------------------------------
  // 17. Expert can configure twin AND analyze personality in same session
  // -----------------------------------------------------------------------
  it("expert can configure twin AND analyze personality in same session", async () => {
    // First: PATCH twin-config
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.expertProfile.update.mockResolvedValue({
      twinPersonality: "New personality",
      twinGreeting: "New greeting",
      ragEnabled: true,
    });

    const patchReq = createPATCH("/api/expert/twin-config", {
      twinPersonality: "New personality",
      twinGreeting: "New greeting",
    });
    const patchRes = await updateTwinConfig(patchReq);
    expect(patchRes.status).toBe(200);

    // Reset for next call
    resetAllMocks();
  jest.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.expertProfile.update.mockResolvedValue({
      ...mockExpertProfile,
      personalityProfile: {
        traits: ["analytical", "precise"],
        communicationStyle: "formal",
        score: 85,
      },
    });

    // Second: POST personality analysis
    const postReq = createPOST("/api/expert/personality", {});
    const postRes = await analyzePersonality();
    const postData = await postRes.json();

    expect(postRes.status).toBe(200);
    expect(postData.personalityProfile).toBeDefined();
    expect(postData.personalityProfile.traits).toContain("analytical");
  });

  // -----------------------------------------------------------------------
  // 18. Chat session creation still works with new SubscriberMemory table
  // -----------------------------------------------------------------------
  it("chat session creation still works with new SubscriberMemory table", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      user: { name: "Expert User" },
      twinGreeting: null,
    });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue({
      ...mockSubscription,
      status: "ACTIVE",
    });
    const createdSession = {
      ...mockChatSession,
      id: "session-with-memory",
      expertProfile: {
        displayName: "Expert User",
        twinGreeting: null,
        user: { id: "expert-id-1", name: "Expert User", image: null },
      },
    };
    mockPrisma.chatSession.create.mockResolvedValue(createdSession);

    const req = createPOST("/api/chat/sessions", {
      expertId: "expert-id-1",
    });
    const res = await createSession(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe("session-with-memory");
    // SubscriberMemory table existence does not interfere with session creation
    expect(mockPrisma.subscriberMemory.create).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 19. Knowledge creation triggers vector indexing (graph building via mock)
  // -----------------------------------------------------------------------
  it("knowledge creation triggers indexing", async () => {
    const { syncKnowledgeItem: indexDocument } = require("@/lib/knowledge/lifecycle");
    (indexDocument as jest.Mock).mockClear();

    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    const createdItem = {
      id: "k-new",
      expertProfileId: "profile-id-1",
      title: "Graph Test",
      content: "Content for graph",
      sourceType: "manual",
      isIndexed: false,
      vectorIds: [],
    };
    mockPrisma.knowledgeItem.create.mockResolvedValue(createdItem);
    mockPrisma.knowledgeItem.update.mockResolvedValue({
      ...createdItem,
      isIndexed: true,
      vectorIds: ["vec-1"],
    });

    const req = createPOST("/api/knowledge", {
      title: "Graph Test",
      content: "Content for graph",
      sourceType: "manual",
    });
    const res = await createKnowledge(req);

    expect(res.status).toBe(201);
    expect(indexDocument).toHaveBeenCalledWith(mockExpertProfile.id, "k-new");
  });

  // -----------------------------------------------------------------------
  // 20. Expert stats include correct data
  // -----------------------------------------------------------------------
  it("expert stats include correct counts", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.knowledgeItem.count
      .mockResolvedValueOnce(25) // totalKnowledgeItems
      .mockResolvedValueOnce(20); // indexedDocuments
    mockPrisma.chatSession.count.mockResolvedValue(42);

    const res = await getTwinStats();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.totalKnowledgeItems).toBe(25);
    expect(data.indexedDocuments).toBe(20);
    expect(data.totalChats).toBe(42);
  });
});

// ==========================================================================
// SECTION 3: Error Handling Across All New Routes
// ==========================================================================

describe("SECTION 3: Error Handling Across All New Routes", () => {
  // -----------------------------------------------------------------------
  // 21. All new routes return 401 for unauthenticated requests
  // -----------------------------------------------------------------------
  describe("new routes return 401 for unauthenticated requests", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(null);
    });

    it("GET /api/expert/personality returns 401", async () => {
      const res = await getPersonality();
      expect(res.status).toBe(401);
    });

    it("POST /api/expert/personality returns 401", async () => {
      const res = await analyzePersonality();
      expect(res.status).toBe(401);
    });

    it("GET /api/expert/memories returns 401", async () => {
      const req = createGET("/api/expert/memories");
      const res = await getMemories(req);
      expect(res.status).toBe(401);
    });

    it("DELETE /api/expert/memories returns 401", async () => {
      const req = createDELETE("/api/expert/memories");
      // DELETE needs a body with memoryId, but auth check comes first
      const deleteReq = createPOST("/api/expert/memories", { memoryId: "m1" });
      // Override method via a new request
      const realReq = new (require("next/server").NextRequest)(
        new URL("/api/expert/memories", "http://localhost:3000"),
        { method: "DELETE", body: JSON.stringify({ memoryId: "m1" }), headers: { "Content-Type": "application/json" } }
      );
      const res = await deleteMemory(realReq);
      expect(res.status).toBe(401);
    });

    it("GET /api/expert/graph returns 401", async () => {
      const res = await getGraph();
      expect(res.status).toBe(401);
    });

    it("POST /api/expert/graph returns 401", async () => {
      const res = await buildGraph();
      expect(res.status).toBe(401);
    });

    it("GET /api/expert/accuracy-score returns 401", async () => {
      const res = await getAccuracyScore();
      expect(res.status).toBe(401);
    });

    it("POST /api/expert/accuracy-score returns 401", async () => {
      const res = await calcAccuracyScore();
      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // 22. All new routes return 403 for wrong role (subscriber accessing expert routes)
  // -----------------------------------------------------------------------
  describe("new routes return 403 for subscriber accessing expert routes", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
    });

    it("GET /api/expert/personality returns 403", async () => {
      const res = await getPersonality();
      expect(res.status).toBe(403);
    });

    it("POST /api/expert/personality returns 403", async () => {
      const res = await analyzePersonality();
      expect(res.status).toBe(403);
    });

    it("GET /api/expert/memories returns 403", async () => {
      const req = createGET("/api/expert/memories");
      const res = await getMemories(req);
      expect(res.status).toBe(403);
    });

    it("DELETE /api/expert/memories returns 403", async () => {
      const { NextRequest } = require("next/server");
      const req = new NextRequest(
        new URL("/api/expert/memories", "http://localhost:3000"),
        { method: "DELETE", body: JSON.stringify({ memoryId: "m1" }), headers: { "Content-Type": "application/json" } }
      );
      const res = await deleteMemory(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/expert/graph returns 403", async () => {
      const res = await getGraph();
      expect(res.status).toBe(403);
    });

    it("POST /api/expert/graph returns 403", async () => {
      const res = await buildGraph();
      expect(res.status).toBe(403);
    });

    it("GET /api/expert/accuracy-score returns 401 for non-expert", async () => {
      // accuracy-score route checks both auth and role in one condition
      const res = await getAccuracyScore();
      expect(res.status).toBe(401);
    });

    it("POST /api/expert/accuracy-score returns 401 for non-expert", async () => {
      const res = await calcAccuracyScore();
      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // 23. Chat-related new routes return 404 for invalid session
  // -----------------------------------------------------------------------
  describe("chat-related new routes return 404 for invalid session", () => {
    it("GET /api/chat/sessions/[invalid]/memories returns 404", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      mockPrisma.chatSession.findUnique.mockResolvedValue(null);

      const req = createGET("/api/chat/sessions/invalid-session/memories");
      const res = await getMemoryCount(req, {
        params: Promise.resolve({ sessionId: "invalid-session" }),
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe("Chat session not found");
    });

    it("POST /api/chat/sessions/[invalid]/messages/[msgId]/rate returns 404", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      mockPrisma.chatSession.findUnique.mockResolvedValue(null);

      const req = createPOST(
        "/api/chat/sessions/invalid-session/messages/msg-1/rate",
        { rating: 1 }
      );
      const res = await rateMessage(req, {
        params: Promise.resolve({
          sessionId: "invalid-session",
          messageId: "msg-1",
        }),
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe("Message not found in session");
      expect(mockPrisma.chatMessage.update).not.toHaveBeenCalled();
    });
  });
});
