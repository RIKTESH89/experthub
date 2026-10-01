import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import { mockUsers, mockExpertProfile, mockPost, mockKnowledgeItem } from "../mocks/data";
import { createRequest, createGET, createPOST, createPATCH } from "../helpers/request";

// ── Module mocks ─────────────────────────────────────────────────────────────
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
jest.mock("@/lib/import/blog-scraper", () => ({
  scrapeBlogContent: jest.fn().mockResolvedValue({ title: "Blog", content: "Content" }),
}));
jest.mock("@/lib/trial", () => ({
  checkTrialAccess: jest.fn().mockResolvedValue({ allowed: true, used: 0, limit: 3 }),
  incrementTrialUsage: jest.fn(),
}));
jest.mock("@/lib/utils", () => ({
  slugify: jest.fn((s: string) => s.toLowerCase().replace(/\s+/g, "_")),
}));

// ── Route imports ────────────────────────────────────────────────────────────
import { POST as registerPOST } from "@/app/api/auth/register/route";
import { GET as postsGET, POST as postsPOST } from "@/app/api/posts/route";
import { GET as postGET, PATCH as postPATCH, DELETE as postDELETE } from "@/app/api/posts/[postId]/route";
import { GET as knowledgeGET, POST as knowledgePOST } from "@/app/api/knowledge/route";
import { POST as blogImportPOST } from "@/app/api/knowledge/import/blog/route";
import { GET as importHistoryGET } from "@/app/api/knowledge/import/history/route";
import { GET as knowledgeItemGET } from "@/app/api/knowledge/[itemId]/route";
import { GET as chatSessionsGET, POST as chatSessionsPOST } from "@/app/api/chat/sessions/route";
import { POST as subscribePOST } from "@/app/api/experts/[expertId]/subscribe/route";
import { GET as pricingGET, PUT as pricingPUT } from "@/app/api/expert/pricing/route";
import { GET as widgetGET, PUT as widgetPUT } from "@/app/api/expert/widget/route";
import { GET as expertAnalyticsGET } from "@/app/api/expert/analytics/route";
import { GET as analyticsQuestionsGET } from "@/app/api/expert/analytics/questions/route";
import { GET as analyticsTopicGapsGET } from "@/app/api/expert/analytics/topic-gaps/route";
import { GET as analyticsRevenueGET } from "@/app/api/expert/analytics/revenue/route";
import { GET as adminUsersGET } from "@/app/api/admin/users/route";
import { GET as adminContentGET } from "@/app/api/admin/content/route";
import { GET as adminReportsGET } from "@/app/api/admin/reports/route";
import { GET as adminAnalyticsGET } from "@/app/api/admin/analytics/route";
import { GET as adminSettingsGET } from "@/app/api/admin/settings/route";
import { GET as adminExpertsGET } from "@/app/api/admin/experts/route";
import { GET as expertProfileGET } from "@/app/api/experts/[expertId]/route";
import { GET as sharedConversationGET } from "@/app/api/shared/[shareId]/route";
import { GET as widgetConfigGET } from "@/app/api/widget/config/route";
import { checkTrialAccess } from "@/lib/trial";

// ── Helpers ──────────────────────────────────────────────────────────────────
function createPUT(path: string, body: Record<string, unknown>) {
  return createRequest(path, { method: "PUT", body });
}

function paramsPromise<T extends Record<string, string>>(obj: T) {
  return Promise.resolve(obj);
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
// 1. INPUT VALIDATION TESTS
// =============================================================================
describe("Input Validation", () => {
  // ── Auth Registration ────────────────────────────────────────────────────
  describe("POST /api/auth/register", () => {
    it("retired password registration: returns 400 when email is missing", async () => {
const req = createPOST("/api/auth/register", {
        name: "Test",
        password: "password123",
        role: "SUBSCRIBER",
      });
const res = await registerPOST(req);
expect(res.status).toBe(410);
expect((await res.json()).code).toBe("REGISTRATION_RETIRED");
expect(mockPrisma.user.create).not.toHaveBeenCalled();
expect(mockPrisma.expertProfile.create).not.toHaveBeenCalled();
});

    it("retired password registration: returns 400 for invalid email format", async () => {
const req = createPOST("/api/auth/register", {
        name: "Test",
        email: "not-an-email",
        password: "password123",
        role: "SUBSCRIBER",
      });
const res = await registerPOST(req);
expect(res.status).toBe(410);
expect((await res.json()).code).toBe("REGISTRATION_RETIRED");
expect(mockPrisma.user.create).not.toHaveBeenCalled();
expect(mockPrisma.expertProfile.create).not.toHaveBeenCalled();
});

    it("retired password registration: returns 400 for short password (less than 8 chars)", async () => {
const req = createPOST("/api/auth/register", {
        name: "Test",
        email: "test@test.com",
        password: "short",
        role: "SUBSCRIBER",
      });
const res = await registerPOST(req);
expect(res.status).toBe(410);
expect((await res.json()).code).toBe("REGISTRATION_RETIRED");
expect(mockPrisma.user.create).not.toHaveBeenCalled();
expect(mockPrisma.expertProfile.create).not.toHaveBeenCalled();
});

    it("retired password registration: returns 400 when name is missing", async () => {
const req = createPOST("/api/auth/register", {
        email: "test@test.com",
        password: "password123",
        role: "SUBSCRIBER",
      });
const res = await registerPOST(req);
expect(res.status).toBe(410);
expect((await res.json()).code).toBe("REGISTRATION_RETIRED");
expect(mockPrisma.user.create).not.toHaveBeenCalled();
expect(mockPrisma.expertProfile.create).not.toHaveBeenCalled();
});

    it("retired password registration: returns 400 when name is too short (less than 2 chars)", async () => {
const req = createPOST("/api/auth/register", {
        name: "A",
        email: "test@test.com",
        password: "password123",
        role: "SUBSCRIBER",
      });
const res = await registerPOST(req);
expect(res.status).toBe(410);
expect((await res.json()).code).toBe("REGISTRATION_RETIRED");
expect(mockPrisma.user.create).not.toHaveBeenCalled();
expect(mockPrisma.expertProfile.create).not.toHaveBeenCalled();
});

    it("retired password registration: returns 409 for duplicate email", async () => {
mockPrisma.user.findUnique.mockResolvedValue(mockUsers.subscriber);
const req = createPOST("/api/auth/register", {
        name: "Test User",
        email: "subscriber@test.com",
        password: "password123",
        role: "SUBSCRIBER",
      });
const res = await registerPOST(req);
expect(res.status).toBe(410);
expect((await res.json()).code).toBe("REGISTRATION_RETIRED");
expect(mockPrisma.user.create).not.toHaveBeenCalled();
expect(mockPrisma.expertProfile.create).not.toHaveBeenCalled();
});

    it("retired password registration: returns 400 for invalid role", async () => {
const req = createPOST("/api/auth/register", {
        name: "Test User",
        email: "test@test.com",
        password: "password123",
        role: "SUPERUSER",
      });
const res = await registerPOST(req);
expect(res.status).toBe(410);
expect((await res.json()).code).toBe("REGISTRATION_RETIRED");
expect(mockPrisma.user.create).not.toHaveBeenCalled();
expect(mockPrisma.expertProfile.create).not.toHaveBeenCalled();
});
  });

  // ── Posts ─────────────────────────────────────────────────────────────────
  describe("POST /api/posts", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession.expert);
    });

    it("returns 400 for empty content", async () => {
      const req = createPOST("/api/posts", { content: "", tags: [] });
      const res = await postsPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Validation failed");
    });

    it("returns 400 when content field is missing entirely", async () => {
      const req = createPOST("/api/posts", { title: "Test" });
      const res = await postsPOST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid status value", async () => {
      const req = createPOST("/api/posts", {
        content: "Some content",
        status: "INVALID_STATUS",
        tags: [],
      });
      const res = await postsPOST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid media type in array", async () => {
      const req = createPOST("/api/posts", {
        content: "Some content",
        tags: [],
        media: [{ type: "HOLOGRAM", url: "http://example.com/file" }],
      });
      const res = await postsPOST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/posts/[postId]", () => {
    it("returns 404 for non-existent post", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.post.findUnique.mockResolvedValue(null);

      const req = createPATCH("/api/posts/nonexistent-id", { content: "Updated" });
      const res = await postPATCH(req, { params: paramsPromise({ postId: "nonexistent-id" }) });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toContain("Post not found");
    });

    it("returns 403 when user is not the author", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      mockPrisma.post.findUnique.mockResolvedValue({
        ...mockPost,
        authorId: "expert-id-1",
      });

      const req = createPATCH("/api/posts/post-id-1", { content: "Updated" });
      const res = await postPATCH(req, { params: paramsPromise({ postId: "post-id-1" }) });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("Only the author");
    });

    it("returns 401 when unauthenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const req = createPATCH("/api/posts/post-id-1", { content: "Updated" });
      const res = await postPATCH(req, { params: paramsPromise({ postId: "post-id-1" }) });
      expect(res.status).toBe(401);
    });
  });

  // ── Knowledge ────────────────────────────────────────────────────────────
  describe("POST /api/knowledge", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    });

    it("returns 400 for empty title", async () => {
      const req = createPOST("/api/knowledge", {
        title: "",
        content: "Some content",
      });
      const res = await knowledgePOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Validation failed");
    });

    it("returns 400 for empty content", async () => {
      const req = createPOST("/api/knowledge", {
        title: "Valid Title",
        content: "",
      });
      const res = await knowledgePOST(req);
      expect(res.status).toBe(400);
    });
  });

  // ── Knowledge Import Blog ────────────────────────────────────────────────
  describe("POST /api/knowledge/import/blog", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    });

    it("returns 400 for empty urls array", async () => {
      const req = createPOST("/api/knowledge/import/blog", { urls: [] });
      const res = await blogImportPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Validation failed");
    });

    it("returns 400 for more than 20 urls", async () => {
      const urls = Array.from({ length: 21 }, (_, i) => `https://example.com/post-${i}`);
      const req = createPOST("/api/knowledge/import/blog", { urls });
      const res = await blogImportPOST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid URL format", async () => {
      const req = createPOST("/api/knowledge/import/blog", {
        urls: ["not-a-url"],
      });
      const res = await blogImportPOST(req);
      expect(res.status).toBe(400);
    });
  });

  // ── Chat Sessions ────────────────────────────────────────────────────────
  describe("POST /api/chat/sessions", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
    });

    it("returns 400 when expertId is missing", async () => {
      const req = createPOST("/api/chat/sessions", {});
      const res = await chatSessionsPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Validation failed");
    });

    it("returns 400 when expertId is empty string", async () => {
      const req = createPOST("/api/chat/sessions", { expertId: "" });
      const res = await chatSessionsPOST(req);
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent expert", async () => {
      mockPrisma.expertProfile.findUnique.mockResolvedValue(null);
      const req = createPOST("/api/chat/sessions", { expertId: "non-existent" });
      const res = await chatSessionsPOST(req);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toContain("Expert not found");
    });
  });

  // ── Subscribe ────────────────────────────────────────────────────────────
  describe("POST /api/experts/[expertId]/subscribe", () => {
    it("returns 400 when expert subscribes to self", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.expertProfile.findUnique.mockResolvedValue({
        ...mockExpertProfile,
        userId: "expert-id-1",
      });

      const req = createPOST("/api/experts/expert-id-1/subscribe", {});
      const res = await subscribePOST(req, {
        params: paramsPromise({ expertId: "expert-id-1" }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("cannot subscribe to yourself");
    });

    it("returns 404 for non-existent expert", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      mockPrisma.expertProfile.findUnique.mockResolvedValue(null);

      const req = createPOST("/api/experts/non-existent/subscribe", {});
      const res = await subscribePOST(req, {
        params: paramsPromise({ expertId: "non-existent" }),
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toContain("Expert not found");
    });
  });

  // ── Pricing ──────────────────────────────────────────────────────────────
  describe("PUT /api/expert/pricing", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    });

    it("returns 400 for negative price", async () => {
      const req = createPUT("/api/expert/pricing", {
        tiers: [{ tier: "PREMIUM", price: -10 }],
      });
      const res = await pricingPUT(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid tier name", async () => {
      const req = createPUT("/api/expert/pricing", {
        tiers: [{ tier: "ULTRA", price: 20 }],
      });
      const res = await pricingPUT(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when tiers array is missing", async () => {
      const req = createPUT("/api/expert/pricing", {});
      const res = await pricingPUT(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when tiers is not an array", async () => {
      const req = createPUT("/api/expert/pricing", { tiers: "not-array" });
      const res = await pricingPUT(req);
      expect(res.status).toBe(400);
    });
  });
});

// =============================================================================
// 2. AUTHORIZATION TESTS
// =============================================================================
describe("Authorization", () => {
  // ── Expert routes should 403 for subscriber ──────────────────────────────
  describe("Expert routes reject non-expert roles", () => {
    it("GET /api/expert/pricing — 403 for subscriber", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      const req = createGET("/api/expert/pricing");
      const res = await pricingGET();
      expect(res.status).toBe(403);
    });

    it("PUT /api/expert/pricing — 403 for subscriber", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      const req = createPUT("/api/expert/pricing", {
        tiers: [{ tier: "PREMIUM", price: 20 }],
      });
      const res = await pricingPUT(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/expert/widget — 403 for subscriber", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      mockPrisma.user.findUnique.mockResolvedValue({ role: "SUBSCRIBER" });
      const res = await widgetGET();
      expect(res.status).toBe(403);
    });

    it("PUT /api/expert/widget — 403 for subscriber", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      mockPrisma.user.findUnique.mockResolvedValue({ role: "SUBSCRIBER" });
      const req = createPUT("/api/expert/widget", { greeting: "Hi" });
      const res = await widgetPUT(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/expert/analytics — 403 for subscriber", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      const req = createGET("/api/expert/analytics");
      const res = await expertAnalyticsGET(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/expert/analytics/questions — 403 for subscriber", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      const req = createGET("/api/expert/analytics/questions");
      const res = await analyticsQuestionsGET(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/expert/analytics/topic-gaps — 403 for subscriber", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      const req = createGET("/api/expert/analytics/topic-gaps");
      const res = await analyticsTopicGapsGET(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/expert/analytics/revenue — 403 for subscriber", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      const req = createGET("/api/expert/analytics/revenue");
      const res = await analyticsRevenueGET(req);
      expect(res.status).toBe(403);
    });

    it("POST /api/knowledge/import/blog — 403 for subscriber", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      const req = createPOST("/api/knowledge/import/blog", {
        urls: ["https://example.com"],
      });
      const res = await blogImportPOST(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/knowledge/import/history — 403 for subscriber", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      const req = createGET("/api/knowledge/import/history");
      const res = await importHistoryGET(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/expert/pricing — 403 for admin", async () => {
      mockAuth.mockResolvedValue(mockSession.admin);
      const res = await pricingGET();
      expect(res.status).toBe(403);
    });

    it("POST /api/posts — 403 for subscriber", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      const req = createPOST("/api/posts", {
        content: "Hello",
        tags: [],
      });
      const res = await postsPOST(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/knowledge — 403 for subscriber", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      const res = await knowledgeGET();
      expect(res.status).toBe(403);
    });

    it("POST /api/knowledge — 403 for subscriber", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      const req = createPOST("/api/knowledge", {
        title: "T",
        content: "C",
      });
      const res = await knowledgePOST(req);
      expect(res.status).toBe(403);
    });
  });

  // ── Admin routes should 403 for expert/subscriber ────────────────────────
  describe("Admin routes reject non-admin roles", () => {
    it("GET /api/admin/users — 403 for expert", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      const req = createGET("/api/admin/users");
      const res = await adminUsersGET(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/admin/users — 403 for subscriber", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      const req = createGET("/api/admin/users");
      const res = await adminUsersGET(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/admin/content — 403 for expert", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      const req = createGET("/api/admin/content");
      const res = await adminContentGET(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/admin/content — 403 for subscriber", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      const req = createGET("/api/admin/content");
      const res = await adminContentGET(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/admin/reports — 403 for expert", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      const req = createGET("/api/admin/reports");
      const res = await adminReportsGET(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/admin/reports — 403 for subscriber", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      const req = createGET("/api/admin/reports");
      const res = await adminReportsGET(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/admin/analytics — 403 for expert", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      const res = await adminAnalyticsGET();
      expect(res.status).toBe(403);
    });

    it("GET /api/admin/analytics — 403 for subscriber", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      const res = await adminAnalyticsGET();
      expect(res.status).toBe(403);
    });

    it("GET /api/admin/settings — 403 for expert", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      const res = await adminSettingsGET();
      expect(res.status).toBe(403);
    });

    it("GET /api/admin/settings — 403 for subscriber", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      const res = await adminSettingsGET();
      expect(res.status).toBe(403);
    });

    it("GET /api/admin/experts — 403 for expert", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      const req = createGET("/api/admin/experts");
      const res = await adminExpertsGET(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/admin/experts — 403 for subscriber", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      const req = createGET("/api/admin/experts");
      const res = await adminExpertsGET(req);
      expect(res.status).toBe(403);
    });
  });

  // ── Unauthenticated access ──────────────────────────────────────────────
  describe("Protected routes return 401 for unauthenticated users", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(null);
    });

    it("POST /api/posts — 401", async () => {
      const req = createPOST("/api/posts", { content: "Hello", tags: [] });
      const res = await postsPOST(req);
      expect(res.status).toBe(401);
    });

    it("PATCH /api/posts/[postId] — 401", async () => {
      const req = createPATCH("/api/posts/post-id-1", { content: "Updated" });
      const res = await postPATCH(req, { params: paramsPromise({ postId: "post-id-1" }) });
      expect(res.status).toBe(401);
    });

    it("DELETE /api/posts/[postId] — 401", async () => {
      const req = createRequest("/api/posts/post-id-1", { method: "DELETE" });
      const res = await postDELETE(req, { params: paramsPromise({ postId: "post-id-1" }) });
      expect(res.status).toBe(401);
    });

    it("GET /api/knowledge — 401", async () => {
      const res = await knowledgeGET();
      expect(res.status).toBe(401);
    });

    it("POST /api/knowledge — 401", async () => {
      const req = createPOST("/api/knowledge", { title: "T", content: "C" });
      const res = await knowledgePOST(req);
      expect(res.status).toBe(401);
    });

    it("POST /api/knowledge/import/blog — 401", async () => {
      const req = createPOST("/api/knowledge/import/blog", { urls: ["https://example.com"] });
      const res = await blogImportPOST(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/knowledge/import/history — 401", async () => {
      const req = createGET("/api/knowledge/import/history");
      const res = await importHistoryGET(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/chat/sessions — 401", async () => {
      const req = createGET("/api/chat/sessions");
      const res = await chatSessionsGET(req);
      expect(res.status).toBe(401);
    });

    it("POST /api/chat/sessions — 401", async () => {
      const req = createPOST("/api/chat/sessions", { expertId: "expert-id-1" });
      const res = await chatSessionsPOST(req);
      expect(res.status).toBe(401);
    });

    it("POST /api/experts/[expertId]/subscribe — 401", async () => {
      const req = createPOST("/api/experts/expert-id-1/subscribe", {});
      const res = await subscribePOST(req, {
        params: paramsPromise({ expertId: "expert-id-1" }),
      });
      expect(res.status).toBe(401);
    });

    it("GET /api/expert/pricing — 401", async () => {
      const res = await pricingGET();
      expect(res.status).toBe(401);
    });

    it("PUT /api/expert/pricing — 401", async () => {
      const req = createPUT("/api/expert/pricing", { tiers: [] });
      const res = await pricingPUT(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/expert/widget — 401", async () => {
      const res = await widgetGET();
      expect(res.status).toBe(401);
    });

    it("GET /api/expert/analytics — 401", async () => {
      const req = createGET("/api/expert/analytics");
      const res = await expertAnalyticsGET(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/admin/users — 401", async () => {
      const req = createGET("/api/admin/users");
      const res = await adminUsersGET(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/admin/content — 401", async () => {
      const req = createGET("/api/admin/content");
      const res = await adminContentGET(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/admin/reports — 401", async () => {
      const req = createGET("/api/admin/reports");
      const res = await adminReportsGET(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/admin/analytics — 401", async () => {
      const res = await adminAnalyticsGET();
      expect(res.status).toBe(401);
    });

    it("GET /api/admin/settings — 401", async () => {
      const res = await adminSettingsGET();
      expect(res.status).toBe(401);
    });

    it("GET /api/admin/experts — 401", async () => {
      const req = createGET("/api/admin/experts");
      const res = await adminExpertsGET(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/knowledge/[itemId] — 401", async () => {
      const req = createGET("/api/knowledge/item-1");
      const res = await knowledgeItemGET(req, { params: paramsPromise({ itemId: "item-1" }) });
      expect(res.status).toBe(401);
    });
  });
});

// =============================================================================
// 3. NOT FOUND TESTS
// =============================================================================
describe("Not Found (404)", () => {
  it("GET /api/posts/[nonexistent] — 404", async () => {
    mockAuth.mockResolvedValue(null);
    mockPrisma.post.findUnique.mockResolvedValue(null);

    const req = createGET("/api/posts/nonexistent-post");
    const res = await postGET(req, { params: paramsPromise({ postId: "nonexistent-post" }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Post not found");
  });

  it("GET /api/experts/[nonexistent] — 404", async () => {
    mockAuth.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = createGET("/api/experts/nonexistent-expert");
    const res = await expertProfileGET(req, {
      params: paramsPromise({ expertId: "nonexistent-expert" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Expert not found");
  });

  it("GET /api/knowledge/[nonexistent] — 404", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.knowledgeItem.findUnique.mockResolvedValue(null);

    const req = createGET("/api/knowledge/nonexistent-item");
    const res = await knowledgeItemGET(req, {
      params: paramsPromise({ itemId: "nonexistent-item" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Knowledge item not found");
  });

  it("GET /api/shared/[nonexistent] — 404", async () => {
    mockPrisma.sharedConversation.findUnique.mockResolvedValue(null);

    const req = createGET("/api/shared/nonexistent-share");
    const res = await sharedConversationGET(req, {
      params: paramsPromise({ shareId: "nonexistent-share" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Shared conversation not found");
  });

  it("GET /api/widget/config?apiKey=invalid — 404", async () => {
    mockPrisma.widgetConfig.findUnique.mockResolvedValue(null);

    const req = createGET("/api/widget/config", { apiKey: "invalid-key" });
    const res = await widgetConfigGET(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Widget not found");
  });

  it("GET /api/widget/config without apiKey — 400", async () => {
    const req = createGET("/api/widget/config");
    const res = await widgetConfigGET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("API key is required");
  });
});

// =============================================================================
// 4. DATABASE ERROR HANDLING
// =============================================================================
describe("Database Error Handling", () => {
  const dbError = new Error("Database connection failed");

  it("retired password registration: POST /api/auth/register — returns 500 on db failure", async () => {
mockPrisma.user.findUnique.mockRejectedValue(dbError);
const req = createPOST("/api/auth/register", {
      name: "Test User",
      email: "test@test.com",
      password: "password123",
      role: "SUBSCRIBER",
    });
const res = await registerPOST(req);
expect(res.status).toBe(410);
expect((await res.json()).code).toBe("REGISTRATION_RETIRED");
expect(mockPrisma.user.create).not.toHaveBeenCalled();
expect(mockPrisma.expertProfile.create).not.toHaveBeenCalled();
});

  it("GET /api/posts — returns 500 on db failure", async () => {
    mockAuth.mockResolvedValue(null);
    mockPrisma.post.findMany.mockRejectedValue(dbError);

    const req = createGET("/api/posts");
    const res = await postsGET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Internal server error");
  });

  it("GET /api/posts/[postId] — returns 500 on db failure", async () => {
    mockPrisma.post.findUnique.mockRejectedValue(dbError);

    const req = createGET("/api/posts/post-id-1");
    const res = await postGET(req, { params: paramsPromise({ postId: "post-id-1" }) });
    expect(res.status).toBe(500);
  });

  it("GET /api/expert/pricing — returns 500 on db failure", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockRejectedValue(dbError);

    const res = await pricingGET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Internal server error");
  });

  it("GET /api/admin/users — returns 500 on db failure", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.user.findMany.mockRejectedValue(dbError);

    const req = createGET("/api/admin/users");
    const res = await adminUsersGET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Internal server error");
  });

  it("POST /api/chat/sessions — returns 500 on db failure", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockRejectedValue(dbError);

    const req = createPOST("/api/chat/sessions", { expertId: "expert-id-1" });
    const res = await chatSessionsPOST(req);
    expect(res.status).toBe(500);
  });

  it("POST /api/experts/[expertId]/subscribe — returns 500 on db failure", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockRejectedValue(dbError);

    const req = createPOST("/api/experts/expert-id-1/subscribe", {});
    const res = await subscribePOST(req, {
      params: paramsPromise({ expertId: "expert-id-1" }),
    });
    expect(res.status).toBe(500);
  });

  it("GET /api/shared/[shareId] — returns 500 on db failure", async () => {
    mockPrisma.sharedConversation.findUnique.mockRejectedValue(dbError);

    const req = createGET("/api/shared/share-id-1");
    const res = await sharedConversationGET(req, {
      params: paramsPromise({ shareId: "share-id-1" }),
    });
    expect(res.status).toBe(500);
  });
});

// =============================================================================
// 5. CASCADE & DATA INTEGRITY
// =============================================================================
describe("Cascade & Data Integrity", () => {
  it("Expert profile not found when accessing expert features (knowledge)", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(null);

    const res = await knowledgeGET();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Expert profile not found");
  });

  it("Expert profile not found when accessing pricing", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(null);

    const res = await pricingGET();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Expert profile not found");
  });

  it("Expert profile not found when accessing analytics", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(null);

    const req = createGET("/api/expert/analytics");
    const res = await expertAnalyticsGET(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Expert profile not found");
  });

  it("Expert profile not found when accessing widget config", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.user.findUnique.mockResolvedValue({ role: "EXPERT" });
    mockPrisma.expertProfile.findUnique.mockResolvedValue(null);

    const res = await widgetGET();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Expert profile not found");
  });

  it("Cancelled subscription does not grant chat access — trial exhausted", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      user: { name: "Expert User" },
    });
    // Subscription exists but is CANCELLED
    mockPrisma.expertSubscription.findUnique.mockResolvedValue({
      id: "sub-id-1",
      subscriberId: "subscriber-id-1",
      expertProfileId: "profile-id-1",
      status: "CANCELLED",
    });
    // Trial is exhausted
    (checkTrialAccess as jest.Mock).mockResolvedValue({
      allowed: false,
      used: 3,
      limit: 3,
    });

    const req = createPOST("/api/chat/sessions", { expertId: "expert-id-1" });
    const res = await chatSessionsPOST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("TRIAL_EXHAUSTED");
    expect(body.questionsUsed).toBe(3);
    expect(body.questionsAllowed).toBe(3);
  });

  it("Trial exhausted returns proper error code", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      user: { name: "Expert User" },
    });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue(null);
    (checkTrialAccess as jest.Mock).mockResolvedValue({
      allowed: false,
      used: 5,
      limit: 3,
    });

    const req = createPOST("/api/chat/sessions", { expertId: "expert-id-1" });
    const res = await chatSessionsPOST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Free trial exhausted");
    expect(body.code).toBe("TRIAL_EXHAUSTED");
  });

  it("Widget disabled — config endpoint returns 404", async () => {
    mockPrisma.widgetConfig.findUnique.mockResolvedValue({
      id: "wc-1",
      apiKey: "valid-key",
      isEnabled: false,
      expertProfile: {
        displayName: "Expert",
        twinGreeting: "Hello",
        user: { name: "Expert", image: null },
      },
    });

    const req = createGET("/api/widget/config", { apiKey: "valid-key" });
    const res = await widgetConfigGET(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Widget is disabled");
  });

  it("Expert profile not found on knowledge creation", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(null);

    const req = createPOST("/api/knowledge", {
      title: "Test",
      content: "Content",
    });
    const res = await knowledgePOST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Expert profile not found");
  });

  it("Expert profile not found on import blog", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(null);

    const req = createPOST("/api/knowledge/import/blog", {
      urls: ["https://example.com/post"],
    });
    const res = await blogImportPOST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Expert profile not found");
  });

  it("Expert profile not found on import history", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(null);

    const req = createGET("/api/knowledge/import/history");
    const res = await importHistoryGET(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Expert profile not found");
  });
});

// =============================================================================
// 6. BOUNDARY & EDGE CASES
// =============================================================================
describe("Boundary & Edge Cases", () => {
  describe("Pagination", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession.admin);
    });

    it("page=0 should default to page 1", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const req = createGET("/api/admin/users", { page: "0" });
      const res = await adminUsersGET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination.page).toBe(1);
    });

    it("negative page should default to page 1", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const req = createGET("/api/admin/users", { page: "-5" });
      const res = await adminUsersGET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination.page).toBe(1);
    });

    it("limit=0 should default to minimum of 1", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const req = createGET("/api/admin/users", { limit: "0" });
      const res = await adminUsersGET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination.limit).toBe(1);
    });

    it("very large limit should be capped at max (50 for users)", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const req = createGET("/api/admin/users", { limit: "10000" });
      const res = await adminUsersGET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination.limit).toBe(50);
    });

    it("posts pagination — page=0 defaults to 1, large limit capped at 50", async () => {
      mockAuth.mockResolvedValue(null);
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(0);

      const req = createGET("/api/posts", { page: "0", limit: "999" });
      const res = await postsGET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(50);
    });
  });

  describe("Search edge cases", () => {
    it("empty search query returns results normally", async () => {
      mockAuth.mockResolvedValue(null);
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(0);

      const req = createGET("/api/posts", { search: "" });
      const res = await postsGET(req);
      expect(res.status).toBe(200);
    });

    it("search with special characters does not crash", async () => {
      mockAuth.mockResolvedValue(null);
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(0);

      const req = createGET("/api/posts", { search: "hello%20world<script>" });
      const res = await postsGET(req);
      expect(res.status).toBe(200);
    });
  });

  describe("Content edge cases", () => {
    it("very long content string is accepted by post creation", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      const longContent = "A".repeat(100000);

      // The validation should pass; mocking the DB calls
      mockPrisma.post.create.mockResolvedValue({
        id: "post-long",
        content: longContent,
        authorId: "expert-id-1",
        title: null,
        status: "PUBLISHED",
        tags: [],
        media: [],
        author: {
          id: "expert-id-1",
          name: "Expert",
          image: null,
          expertProfile: null,
        },
        _count: { likes: 0, comments: 0, bookmarks: 0 },
      });

      const req = createPOST("/api/posts", {
        content: longContent,
        tags: [],
      });
      const res = await postsPOST(req);
      // Should succeed or validate — not crash
      expect([201, 400]).toContain(res.status);
    });

    it("special characters in post content are handled", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);

      const specialContent = 'Content with <html> "quotes" & \'apostrophes\' \\ backslashes and emoji 🎉';
      mockPrisma.post.create.mockResolvedValue({
        id: "post-special",
        content: specialContent,
        authorId: "expert-id-1",
        title: null,
        status: "PUBLISHED",
        tags: [],
        media: [],
        author: {
          id: "expert-id-1",
          name: "Expert",
          image: null,
          expertProfile: null,
        },
        _count: { likes: 0, comments: 0, bookmarks: 0 },
      });

      const req = createPOST("/api/posts", {
        content: specialContent,
        tags: [],
      });
      const res = await postsPOST(req);
      expect([201, 400]).toContain(res.status);
    });

    it("retired password registration: special characters in registration name are handled", async () => {
mockPrisma.user.findUnique.mockResolvedValue(null);
mockPrisma.user.create.mockResolvedValue({
        id: "new-user-id",
        name: "O'Brien-Smith",
        email: "obrien@test.com",
        hashedPassword: "$2a$12$hashed",
        role: "SUBSCRIBER",
        bio: null,
        headline: null,
        image: null,
        isActive: true,
        isBanned: false,
        expertProfile: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
const req = createPOST("/api/auth/register", {
        name: "O'Brien-Smith",
        email: "obrien@test.com",
        password: "password123",
        role: "SUBSCRIBER",
      });
const res = await registerPOST(req);
expect(res.status).toBe(410);
expect((await res.json()).code).toBe("REGISTRATION_RETIRED");
expect(mockPrisma.user.create).not.toHaveBeenCalled();
expect(mockPrisma.expertProfile.create).not.toHaveBeenCalled();
});
  });

  describe("Non-string params", () => {
    it("NaN page value is handled without crashing", async () => {
      mockAuth.mockResolvedValue(mockSession.admin);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const req = createGET("/api/admin/users", { page: "abc" });
      const res = await adminUsersGET(req);
      // parseInt("abc") is NaN — route should still return 200 without crashing
      expect(res.status).toBe(200);
    });
  });

  describe("Delete post authorization", () => {
    it("returns 403 when non-author non-admin tries to delete", async () => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
      mockPrisma.post.findUnique.mockResolvedValue({
        ...mockPost,
        authorId: "expert-id-1",
      });

      const req = createRequest("/api/posts/post-id-1", { method: "DELETE" });
      const res = await postDELETE(req, { params: paramsPromise({ postId: "post-id-1" }) });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("Only the author or an admin");
    });

    it("returns 404 when deleting non-existent post", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.post.findUnique.mockResolvedValue(null);

      const req = createRequest("/api/posts/nonexistent", { method: "DELETE" });
      const res = await postDELETE(req, { params: paramsPromise({ postId: "nonexistent" }) });
      expect(res.status).toBe(404);
    });
  });

  describe("Knowledge item ownership", () => {
    it("returns 403 when accessing knowledge item belonging to another expert", async () => {
      mockAuth.mockResolvedValue(mockSession.expert);
      mockPrisma.knowledgeItem.findUnique.mockResolvedValue({
        ...mockKnowledgeItem,
        expertProfile: {
          ...mockExpertProfile,
          userId: "another-expert-id", // different from session expert-id-1
        },
      });

      const req = createGET("/api/knowledge/knowledge-id-1");
      const res = await knowledgeItemGET(req, {
        params: paramsPromise({ itemId: "knowledge-id-1" }),
      });
      expect(res.status).toBe(403);
    });
  });
});
