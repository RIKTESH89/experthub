jest.mock("@/lib/knowledge/lifecycle", () => require("../mocks/lifecycle"));
import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import {
  mockExpertProfile,
  mockKnowledgeItem,
} from "../mocks/data";
import { createGET, createPOST, createPATCH, createDELETE } from "../helpers/request";

jest.mock("@/lib/prisma", () => ({ __esModule: true, default: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: mockAuth }));
jest.mock("@/lib/vector/indexer", () => ({
  indexDocument: jest.fn().mockResolvedValue(["vec-new-1"]),
  removeDocument: jest.fn().mockResolvedValue(undefined),
}));

import { GET as listKnowledge, POST as createKnowledge } from "@/app/api/knowledge/route";
import {
  GET as getKnowledgeItem,
  PATCH as updateKnowledgeItem,
  DELETE as deleteKnowledgeItem,
} from "@/app/api/knowledge/[itemId]/route";
import { GET as getKnowledgeStats } from "@/app/api/knowledge/stats/route";
import { GET as getTwinConfig, PATCH as updateTwinConfig } from "@/app/api/expert/twin-config/route";
import { GET as getTwinStats } from "@/app/api/expert/twin-stats/route";
import { syncKnowledgeItem as indexDocument, removeKnowledgeItem as removeDocument, syncPostSource } from "@/lib/knowledge/lifecycle";

function itemParams(itemId: string) {
  return { params: Promise.resolve({ itemId }) };
}

beforeEach(() => {
  resetAllMocks();
  jest.clearAllMocks();
  mockAuth.mockReset();
  (indexDocument as jest.Mock).mockClear();
  (removeDocument as jest.Mock).mockClear();
});

// ---------------------------------------------------------------------------
// Knowledge CRUD
// ---------------------------------------------------------------------------
describe("Knowledge API", () => {
  // 1. GET /knowledge - expert lists their knowledge items
  it("GET /knowledge - expert lists their knowledge items", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.knowledgeItem.findMany.mockResolvedValue([mockKnowledgeItem]);

    const res = await listKnowledge();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    expect(json[0].id).toBe("knowledge-id-1");
    expect(mockPrisma.knowledgeItem.findMany).toHaveBeenCalledWith({
      where: { expertProfileId: mockExpertProfile.id },
      orderBy: { createdAt: "desc" },
    });
  });

  // 2. GET /knowledge - non-expert gets 403
  it("GET /knowledge - non-expert gets 403", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const res = await listKnowledge();
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/only experts/i);
  });

  // 3. POST /knowledge - expert creates knowledge item + indexes in vector store
  it("POST /knowledge - expert creates knowledge item and indexes it", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);

    const createdItem = {
      id: "new-knowledge-id",
      expertProfileId: mockExpertProfile.id,
      title: "New Topic",
      content: "Some content",
      sourceType: "manual",
      isIndexed: false,
      vectorIds: [],
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const updatedItem = { ...createdItem, isIndexed: true, vectorIds: ["vec-new-1"] };

    mockPrisma.knowledgeItem.create.mockResolvedValue(createdItem);
    mockPrisma.knowledgeItem.update.mockResolvedValue(updatedItem);

    const req = createPOST("/api/knowledge", {
      title: "New Topic",
      content: "Some content",
      sourceType: "manual",
    });
    const res = await createKnowledge(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.isIndexed).toBe(true);
    expect(json.vectorIds).toEqual(["vec-new-1"]);
    expect(indexDocument).toHaveBeenCalledWith(mockExpertProfile.id, createdItem.id);
  });

  // 4. POST /knowledge - validates input with Zod
  it("POST /knowledge - validates input with Zod", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    const req = createPOST("/api/knowledge", { title: "", content: "" });
    const res = await createKnowledge(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Validation failed");
    expect(json.details).toBeDefined();
  });

  // 5. GET /knowledge/:id - returns knowledge item
  it("GET /knowledge/:id - returns knowledge item", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.knowledgeItem.findUnique.mockResolvedValue(mockKnowledgeItem);

    const req = createGET("/api/knowledge/knowledge-id-1");
    const res = await getKnowledgeItem(req, itemParams("knowledge-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.id).toBe("knowledge-id-1");
  });

  // 6. GET /knowledge/:id - non-owner gets 403
  it("GET /knowledge/:id - non-owner gets 403", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.knowledgeItem.findUnique.mockResolvedValue({
      ...mockKnowledgeItem,
      expertProfile: { ...mockExpertProfile, userId: "other-user-id" },
    });

    const req = createGET("/api/knowledge/knowledge-id-1");
    const res = await getKnowledgeItem(req, itemParams("knowledge-id-1"));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Forbidden");
  });

  // 7. PATCH /knowledge/:id - updates and re-indexes if content changed
  it("PATCH /knowledge/:id - updates and re-indexes if content changed", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.knowledgeItem.findUnique.mockResolvedValue(mockKnowledgeItem);

    const updatedItem = { ...mockKnowledgeItem, content: "Updated content", title: "AI Knowledge" };
    mockPrisma.knowledgeItem.update.mockResolvedValue(updatedItem);

    const req = createPATCH("/api/knowledge/knowledge-id-1", {
      content: "Updated content",
    });
    const res = await updateKnowledgeItem(req, itemParams("knowledge-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(indexDocument).toHaveBeenCalledWith(mockExpertProfile.id, "knowledge-id-1");
  });

  // 8. DELETE /knowledge/:id - removes from vector store and deletes
  it("DELETE /knowledge/:id - removes from vector store and deletes", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.knowledgeItem.findUnique.mockResolvedValue(mockKnowledgeItem);
    mockPrisma.knowledgeItem.delete.mockResolvedValue(mockKnowledgeItem);

    const req = createDELETE("/api/knowledge/knowledge-id-1");
    const res = await deleteKnowledgeItem(req, itemParams("knowledge-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toMatch(/deleted/i);
    expect(removeDocument).toHaveBeenCalledWith(mockExpertProfile.id, "knowledge-id-1");
    expect(removeDocument).toHaveBeenCalledWith(mockExpertProfile.id, "knowledge-id-1");
  });
});

// ---------------------------------------------------------------------------
// Knowledge Stats
// ---------------------------------------------------------------------------
describe("Knowledge Stats API", () => {
  // 9. GET /knowledge/stats - returns correct counts
  it("GET /knowledge/stats - returns correct counts", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.knowledgeItem.count
      .mockResolvedValueOnce(10) // total
      .mockResolvedValueOnce(7);  // indexed

    const res = await getKnowledgeStats();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ total: 10, indexed: 7, pending: 3 });
  });
});

// ---------------------------------------------------------------------------
// Twin Config
// ---------------------------------------------------------------------------
describe("Twin Config API", () => {
  // 10. GET /expert/twin-config - returns twin config
  it("GET /expert/twin-config - returns twin config", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      twinPersonality: "I am an AI expert",
      twinGreeting: "Hello! Ask me about AI.",
      ragEnabled: true,
    });

    const res = await getTwinConfig();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.twinPersonality).toBe("I am an AI expert");
    expect(json.twinGreeting).toBe("Hello! Ask me about AI.");
    expect(json.ragEnabled).toBe(true);
  });

  // 11. PATCH /expert/twin-config - updates twin personality/greeting/ragEnabled
  it("PATCH /expert/twin-config - updates twin personality/greeting/ragEnabled", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.expertProfile.update.mockResolvedValue({
      twinPersonality: "Updated personality",
      twinGreeting: "New greeting",
      ragEnabled: false,
    });

    const req = createPATCH("/api/expert/twin-config", {
      twinPersonality: "Updated personality",
      twinGreeting: "New greeting",
      ragEnabled: false,
    });
    const res = await updateTwinConfig(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.twinPersonality).toBe("Updated personality");
    expect(json.twinGreeting).toBe("New greeting");
    expect(json.ragEnabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Twin Stats
// ---------------------------------------------------------------------------
describe("Twin Stats API", () => {
  // 12. GET /expert/twin-stats - returns correct stats
  it("GET /expert/twin-stats - returns correct stats", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.knowledgeItem.count
      .mockResolvedValueOnce(15)  // totalKnowledgeItems
      .mockResolvedValueOnce(12); // indexedDocuments
    mockPrisma.chatSession.count.mockResolvedValue(8);

    const res = await getTwinStats();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      totalKnowledgeItems: 15,
      indexedDocuments: 12,
      totalChats: 8,
    });
  });
});
