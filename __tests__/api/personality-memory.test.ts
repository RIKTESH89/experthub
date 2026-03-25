import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import { mockExpertProfile, mockChatSession } from "../mocks/data";
import { createGET, createPOST, createRequest } from "../helpers/request";

// Mock modules BEFORE imports
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

// Import route handlers AFTER mocks
import { GET as getPersonality, POST as analyzePersonality } from "@/app/api/expert/personality/route";
import { GET as getMemories, DELETE as deleteMemory } from "@/app/api/expert/memories/route";
import { GET as getMemoryCount } from "@/app/api/chat/sessions/[sessionId]/memories/route";

// Import library functions AFTER mocks
import { extractMemories } from "@/lib/ai/memory-extractor";
import { saveMemories, getMemories as getMemoriesLib, getMemoryCount as getMemoryCountLib } from "@/lib/ai/memory-manager";

// Import mocked openai functions
import { callOpenAI, safeParseJSON } from "@/lib/ai/openai";

const mockedCallOpenAI = callOpenAI as jest.MockedFunction<typeof callOpenAI>;
const mockedSafeParseJSON = safeParseJSON as jest.MockedFunction<typeof safeParseJSON>;

function sessionParams(sessionId: string) {
  return { params: Promise.resolve({ sessionId }) };
}

describe("Personality Replication & Long-term Memory Integration Tests", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    resetAllMocks();
    mockAuth.mockReset();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // =====================================================================
  // GET /api/expert/personality
  // =====================================================================
  describe("GET /api/expert/personality", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const response = await getPersonality();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 403 when not an expert", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);

      const response = await getPersonality();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only experts can access personality profile");
    });

    it("returns current personality profile when it exists", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);

      const personalityProfile = {
        tone: "Conversational",
        catchphrases: ["Let me explain", "Here's the thing"],
        writingStyle: "Short, punchy sentences with lots of examples",
        communicationGuidelines: ["Be direct", "Use analogies"],
        topicExpertise: ["AI", "Machine Learning"],
        sentencePatterns: "Favors rhetorical questions",
      };

      mockPrisma.expertProfile.findUnique.mockResolvedValue({
        personalityProfile,
      });

      const response = await getPersonality();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.personalityProfile).toEqual(personalityProfile);
      expect(mockPrisma.expertProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: "expert-id-1" },
        select: { personalityProfile: true },
      });
    });

    it("returns null profile when not analyzed yet", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);

      mockPrisma.expertProfile.findUnique.mockResolvedValue({
        personalityProfile: null,
      });

      const response = await getPersonality();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.personalityProfile).toBeNull();
    });

    it("returns 404 when expert profile not found", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);

      mockPrisma.expertProfile.findUnique.mockResolvedValue(null);

      const response = await getPersonality();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Expert profile not found");
    });
  });

  // =====================================================================
  // POST /api/expert/personality
  // =====================================================================
  describe("POST /api/expert/personality", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const response = await analyzePersonality();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 403 when not an expert", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);

      const response = await analyzePersonality();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only experts can analyze personality");
    });

    it("successfully analyzes and returns personality profile", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);

      const personalityResult = {
        tone: "Witty and casual",
        catchphrases: ["Here's the deal", "Think of it this way", "Bottom line"],
        writingStyle: "Concise paragraphs with real-world analogies",
        communicationGuidelines: [
          "Use humor sparingly",
          "Lead with the conclusion",
          "Always provide examples",
        ],
        topicExpertise: ["AI", "ML", "Neural Networks"],
        sentencePatterns: "Short declarative sentences followed by elaboration",
      };

      // Mock expertProfile.findUnique (for the POST route, no select is used)
      mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);

      // Mock knowledgeItem.findMany (called by analyzePersonality -> personality-analyzer)
      mockPrisma.knowledgeItem.findMany.mockResolvedValue([
        { content: "AI is transforming the world. Here's the deal..." },
        { content: "Machine learning models learn from data patterns." },
      ]);

      // Mock post.findMany (called by analyzePersonality -> personality-analyzer)
      mockPrisma.post.findMany.mockResolvedValue([
        { title: "Understanding AI", content: "Think of it this way: AI is like teaching a child." },
        { title: "ML Basics", content: "Bottom line, ML is about patterns." },
      ]);

      // Mock callOpenAI to return the personality JSON string
      mockedCallOpenAI.mockResolvedValue(JSON.stringify(personalityResult));

      // Mock safeParseJSON to actually parse
      mockedSafeParseJSON.mockReturnValue(personalityResult);

      // Mock expertProfile.update
      mockPrisma.expertProfile.update.mockResolvedValue({
        ...mockExpertProfile,
        personalityProfile: personalityResult,
      });

      const response = await analyzePersonality();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.personalityProfile).toEqual(personalityResult);
      expect(mockedCallOpenAI).toHaveBeenCalled();
      expect(mockPrisma.expertProfile.update).toHaveBeenCalledWith({
        where: { id: mockExpertProfile.id },
        data: {
          personalityProfile: personalityResult,
        },
      });
    });

    it("returns 404 when expert profile not found", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);

      mockPrisma.expertProfile.findUnique.mockResolvedValue(null);

      const response = await analyzePersonality();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Expert profile not found");
    });

    it("returns 400 when expert has no content to analyze", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);

      mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);

      // No knowledge items and no posts
      mockPrisma.knowledgeItem.findMany.mockResolvedValue([]);
      mockPrisma.post.findMany.mockResolvedValue([]);

      const response = await analyzePersonality();
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("No content available");
      // callOpenAI should NOT be called when there's no content
      expect(mockedCallOpenAI).not.toHaveBeenCalled();
      // Profile should NOT be saved to DB
      expect(mockPrisma.expertProfile.update).not.toHaveBeenCalled();
    });
  });

  // =====================================================================
  // GET /api/expert/memories
  // =====================================================================
  describe("GET /api/expert/memories", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const req = createGET("/api/expert/memories");
      const response = await getMemories(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 403 when not an expert", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);

      const req = createGET("/api/expert/memories");
      const response = await getMemories(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only experts can access memories");
    });

    it("returns all memories for expert", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);

      const memories = [
        {
          id: "mem-1",
          subscriberId: "subscriber-id-1",
          expertProfileId: "profile-id-1",
          fact: "User prefers Python over JavaScript",
          category: "preference",
          createdAt: new Date("2024-02-01"),
          updatedAt: new Date("2024-02-01"),
        },
        {
          id: "mem-2",
          subscriberId: "subscriber-id-1",
          expertProfileId: "profile-id-1",
          fact: "User is a senior developer",
          category: "background",
          createdAt: new Date("2024-02-02"),
          updatedAt: new Date("2024-02-02"),
        },
      ];

      mockPrisma.subscriberMemory.findMany.mockResolvedValue(memories);

      const req = createGET("/api/expert/memories");
      const response = await getMemories(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].fact).toBe("User prefers Python over JavaScript");
      expect(mockPrisma.subscriberMemory.findMany).toHaveBeenCalledWith({
        where: { expertProfileId: mockExpertProfile.id },
        orderBy: { updatedAt: "desc" },
      });
    });

    it("filters by subscriberId query parameter", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);

      const memories = [
        {
          id: "mem-1",
          subscriberId: "subscriber-id-2",
          expertProfileId: "profile-id-1",
          fact: "User likes dark mode",
          category: "preference",
          createdAt: new Date("2024-02-01"),
          updatedAt: new Date("2024-02-01"),
        },
      ];

      mockPrisma.subscriberMemory.findMany.mockResolvedValue(memories);

      const req = createGET("/api/expert/memories", { subscriberId: "subscriber-id-2" });
      const response = await getMemories(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(mockPrisma.subscriberMemory.findMany).toHaveBeenCalledWith({
        where: {
          expertProfileId: mockExpertProfile.id,
          subscriberId: "subscriber-id-2",
        },
        orderBy: { updatedAt: "desc" },
      });
    });

    it("returns empty array when no memories exist", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
      mockPrisma.subscriberMemory.findMany.mockResolvedValue([]);

      const req = createGET("/api/expert/memories");
      const response = await getMemories(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });
  });

  // =====================================================================
  // DELETE /api/expert/memories
  // =====================================================================
  describe("DELETE /api/expert/memories", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const req = createRequest("/api/expert/memories", {
        method: "DELETE",
        body: { memoryId: "mem-1" },
      });
      const response = await deleteMemory(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 403 when not an expert", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);

      const req = createRequest("/api/expert/memories", {
        method: "DELETE",
        body: { memoryId: "mem-1" },
      });
      const response = await deleteMemory(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only experts can delete memories");
    });

    it("successfully deletes a memory", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);

      const memory = {
        id: "mem-1",
        subscriberId: "subscriber-id-1",
        expertProfileId: "profile-id-1",
        fact: "User prefers Python",
        category: "preference",
        createdAt: new Date("2024-02-01"),
        updatedAt: new Date("2024-02-01"),
      };

      mockPrisma.subscriberMemory.findUnique.mockResolvedValue(memory);
      mockPrisma.subscriberMemory.delete.mockResolvedValue(memory);

      const req = createRequest("/api/expert/memories", {
        method: "DELETE",
        body: { memoryId: "mem-1" },
      });
      const response = await deleteMemory(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Memory deleted successfully");
      expect(mockPrisma.subscriberMemory.delete).toHaveBeenCalledWith({
        where: { id: "mem-1" },
      });
    });

    it("returns 404 when memory not found", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
      mockPrisma.subscriberMemory.findUnique.mockResolvedValue(null);

      const req = createRequest("/api/expert/memories", {
        method: "DELETE",
        body: { memoryId: "nonexistent-mem" },
      });
      const response = await deleteMemory(req);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Memory not found");
    });

    it("returns 403 when memory belongs to different expert", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);

      const memory = {
        id: "mem-1",
        subscriberId: "subscriber-id-1",
        expertProfileId: "other-profile-id",
        fact: "Some fact",
        category: "preference",
        createdAt: new Date("2024-02-01"),
        updatedAt: new Date("2024-02-01"),
      };

      mockPrisma.subscriberMemory.findUnique.mockResolvedValue(memory);

      const req = createRequest("/api/expert/memories", {
        method: "DELETE",
        body: { memoryId: "mem-1" },
      });
      const response = await deleteMemory(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      expect(mockPrisma.subscriberMemory.delete).not.toHaveBeenCalled();
    });
  });

  // =====================================================================
  // GET /api/chat/sessions/[sessionId]/memories
  // =====================================================================
  describe("GET /api/chat/sessions/[sessionId]/memories", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const req = createGET("/api/chat/sessions/session-id-1/memories");
      const response = await getMemoryCount(req, sessionParams("session-id-1"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns memory count for valid session", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);

      mockPrisma.chatSession.findUnique.mockResolvedValue({
        ...mockChatSession,
        subscriberId: "subscriber-id-1",
        expertProfileId: "profile-id-1",
      });

      mockPrisma.subscriberMemory.count.mockResolvedValue(5);

      const req = createGET("/api/chat/sessions/session-id-1/memories");
      const response = await getMemoryCount(req, sessionParams("session-id-1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ count: 5 });
      expect(mockPrisma.subscriberMemory.count).toHaveBeenCalledWith({
        where: {
          subscriberId: "subscriber-id-1",
          expertProfileId: "profile-id-1",
        },
      });
    });

    it("returns 404 when session not found", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      mockPrisma.chatSession.findUnique.mockResolvedValue(null);

      const req = createGET("/api/chat/sessions/nonexistent/memories");
      const response = await getMemoryCount(req, sessionParams("nonexistent"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Chat session not found");
    });

    it("returns 403 when session belongs to different subscriber", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);

      mockPrisma.chatSession.findUnique.mockResolvedValue({
        ...mockChatSession,
        subscriberId: "other-subscriber-id",
        expertProfileId: "profile-id-1",
      });

      const req = createGET("/api/chat/sessions/session-id-1/memories");
      const response = await getMemoryCount(req, sessionParams("session-id-1"));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  // =====================================================================
  // Memory Extraction Unit Tests (memory-extractor)
  // =====================================================================
  describe("extractMemories (memory-extractor)", () => {
    it("extracts memories from conversation", async () => {
      const extractedMemories = {
        memories: [
          { fact: "User works as a data scientist", category: "background" },
          { fact: "User prefers PyTorch over TensorFlow", category: "preference" },
        ],
      };

      mockedCallOpenAI.mockResolvedValue(JSON.stringify(extractedMemories));
      mockedSafeParseJSON.mockReturnValue(extractedMemories);

      const result = await extractMemories(
        "I'm a data scientist and I prefer PyTorch over TensorFlow",
        "That's great! PyTorch is an excellent framework for research."
      );

      expect(result).toHaveLength(2);
      expect(result[0].fact).toBe("User works as a data scientist");
      expect(result[0].category).toBe("background");
      expect(result[1].fact).toBe("User prefers PyTorch over TensorFlow");
      expect(result[1].category).toBe("preference");
      expect(mockedCallOpenAI).toHaveBeenCalledWith({
        messages: [
          { role: "system", content: expect.stringContaining("memory extraction") },
          {
            role: "user",
            content: expect.stringContaining("I'm a data scientist"),
          },
        ],
      });
    });

    it("returns empty array when no facts revealed", async () => {
      const noMemories = { memories: [] };
      mockedCallOpenAI.mockResolvedValue(JSON.stringify(noMemories));
      mockedSafeParseJSON.mockReturnValue(noMemories);

      const result = await extractMemories(
        "What is machine learning?",
        "Machine learning is a subset of AI that enables systems to learn from data."
      );

      expect(result).toEqual([]);
    });

    it("handles malformed LLM response", async () => {
      mockedCallOpenAI.mockResolvedValue("this is not JSON at all");
      mockedSafeParseJSON.mockReturnValue({ memories: [] });

      const result = await extractMemories(
        "Tell me about AI",
        "AI is artificial intelligence."
      );

      expect(result).toEqual([]);
    });
  });

  // =====================================================================
  // Memory Manager Unit Tests (memory-manager)
  // =====================================================================
  describe("saveMemories (memory-manager)", () => {
    it("creates new memories", async () => {
      mockPrisma.subscriberMemory.findFirst.mockResolvedValue(null);
      mockPrisma.subscriberMemory.create.mockResolvedValue({});

      const memories = [
        { fact: "User likes hiking on weekends", category: "preference" },
        { fact: "User is based in San Francisco", category: "background" },
      ];

      await saveMemories("subscriber-id-1", "profile-id-1", memories);

      expect(mockPrisma.subscriberMemory.findFirst).toHaveBeenCalledTimes(2);
      expect(mockPrisma.subscriberMemory.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.subscriberMemory.create).toHaveBeenCalledWith({
        data: {
          subscriberId: "subscriber-id-1",
          expertProfileId: "profile-id-1",
          fact: "User likes hiking on weekends",
          category: "preference",
        },
      });
      expect(mockPrisma.subscriberMemory.create).toHaveBeenCalledWith({
        data: {
          subscriberId: "subscriber-id-1",
          expertProfileId: "profile-id-1",
          fact: "User is based in San Francisco",
          category: "background",
        },
      });
    });

    it("updates existing similar memories instead of creating duplicates", async () => {
      const existingMemory = {
        id: "existing-mem-1",
        subscriberId: "subscriber-id-1",
        expertProfileId: "profile-id-1",
        fact: "User likes hiking on weekends and trails",
        category: "preference",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      mockPrisma.subscriberMemory.findFirst.mockResolvedValue(existingMemory);
      mockPrisma.subscriberMemory.update.mockResolvedValue({});

      const memories = [
        { fact: "User likes hiking on weekends with friends", category: "preference" },
      ];

      await saveMemories("subscriber-id-1", "profile-id-1", memories);

      expect(mockPrisma.subscriberMemory.findFirst).toHaveBeenCalledWith({
        where: {
          subscriberId: "subscriber-id-1",
          expertProfileId: "profile-id-1",
          category: "preference",
          fact: { startsWith: "User likes hiking on" },
        },
      });
      expect(mockPrisma.subscriberMemory.update).toHaveBeenCalledWith({
        where: { id: "existing-mem-1" },
        data: { updatedAt: expect.any(Date) },
      });
      expect(mockPrisma.subscriberMemory.create).not.toHaveBeenCalled();
    });

    it("handles empty array", async () => {
      await saveMemories("subscriber-id-1", "profile-id-1", []);

      expect(mockPrisma.subscriberMemory.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.subscriberMemory.create).not.toHaveBeenCalled();
      expect(mockPrisma.subscriberMemory.update).not.toHaveBeenCalled();
    });
  });

  describe("getMemories (memory-manager)", () => {
    it("returns memories ordered by updatedAt", async () => {
      const memories = [
        { fact: "User prefers dark mode", category: "preference" },
        { fact: "User is a backend developer", category: "background" },
      ];

      mockPrisma.subscriberMemory.findMany.mockResolvedValue(memories);

      const result = await getMemoriesLib("subscriber-id-1", "profile-id-1");

      expect(result).toEqual(memories);
      expect(mockPrisma.subscriberMemory.findMany).toHaveBeenCalledWith({
        where: { subscriberId: "subscriber-id-1", expertProfileId: "profile-id-1" },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: { fact: true, category: true },
      });
    });

    it("respects limit parameter", async () => {
      mockPrisma.subscriberMemory.findMany.mockResolvedValue([
        { fact: "Fact 1", category: "preference" },
      ]);

      await getMemoriesLib("subscriber-id-1", "profile-id-1", 5);

      expect(mockPrisma.subscriberMemory.findMany).toHaveBeenCalledWith({
        where: { subscriberId: "subscriber-id-1", expertProfileId: "profile-id-1" },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { fact: true, category: true },
      });
    });
  });

  describe("getMemoryCount (memory-manager)", () => {
    it("returns correct count", async () => {
      mockPrisma.subscriberMemory.count.mockResolvedValue(12);

      const count = await getMemoryCountLib("subscriber-id-1", "profile-id-1");

      expect(count).toBe(12);
      expect(mockPrisma.subscriberMemory.count).toHaveBeenCalledWith({
        where: { subscriberId: "subscriber-id-1", expertProfileId: "profile-id-1" },
      });
    });
  });
});
