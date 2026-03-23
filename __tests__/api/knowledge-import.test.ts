/**
 * Feature: Blog/PDF Import — Integration Tests
 */

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: require("../mocks/prisma").default,
}));

jest.mock("@/lib/auth", () => ({
  auth: require("../mocks/auth").mockAuth,
}));

jest.mock("@/lib/import/blog-scraper", () => ({
  scrapeBlogContent: jest.fn(),
}));

jest.mock("@/lib/import/pdf-parser", () => ({
  parsePdfContent: jest.fn(),
}));

jest.mock("@/lib/vector/indexer", () => ({
  indexDocument: jest.fn().mockResolvedValue(["vec-1", "vec-2"]),
}));

import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import { mockExpertProfile } from "../mocks/data";
import { createGET, createPOST } from "../helpers/request";

import { scrapeBlogContent } from "@/lib/import/blog-scraper";
import { POST as importBlog } from "@/app/api/knowledge/import/blog/route";
import { GET as getImportHistory } from "@/app/api/knowledge/import/history/route";

const mockScrapeBlogContent = scrapeBlogContent as jest.Mock;

beforeEach(() => {
  resetAllMocks();
  mockScrapeBlogContent.mockReset();
});

describe("Blog Import API", () => {
  it("imports a single blog URL successfully", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockScrapeBlogContent.mockResolvedValue({
      title: "Test Blog Post",
      content: "This is the content of the blog post about AI and machine learning.",
    });
    mockPrisma.importJob.create.mockResolvedValue({ id: "job-1" });
    mockPrisma.importJob.update.mockResolvedValue({});
    mockPrisma.knowledgeItem.create.mockResolvedValue({ id: "ki-1" });
    mockPrisma.knowledgeItem.update.mockResolvedValue({});

    const req = createPOST("/api/knowledge/import/blog", {
      urls: ["https://example.com/blog-post"],
    });
    const res = await importBlog(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].status).toBe("success");
    expect(data[0].title).toBe("Test Blog Post");
  });

  it("handles scraping failures gracefully", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockScrapeBlogContent.mockRejectedValue(new Error("Timeout"));
    mockPrisma.importJob.create.mockResolvedValue({ id: "job-1" });
    mockPrisma.importJob.update.mockResolvedValue({});

    const req = createPOST("/api/knowledge/import/blog", {
      urls: ["https://bad-url.example.com"],
    });
    const res = await importBlog(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data[0].status).toBe("error");
    expect(data[0].error).toBeDefined();
  });

  it("imports multiple URLs", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockScrapeBlogContent
      .mockResolvedValueOnce({ title: "Post 1", content: "Content about topic one" })
      .mockResolvedValueOnce({ title: "Post 2", content: "Content about topic two" });
    mockPrisma.importJob.create.mockResolvedValue({ id: "job-1" });
    mockPrisma.importJob.update.mockResolvedValue({});
    mockPrisma.knowledgeItem.create.mockResolvedValue({ id: "ki-1" });
    mockPrisma.knowledgeItem.update.mockResolvedValue({});

    const req = createPOST("/api/knowledge/import/blog", {
      urls: ["https://example.com/post-1", "https://example.com/post-2"],
    });
    const res = await importBlog(req);
    const data = await res.json();

    expect(data).toHaveLength(2);
    expect(data[0].status).toBe("success");
    expect(data[1].status).toBe("success");
  });

  it("rejects empty URL array", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);

    const req = createPOST("/api/knowledge/import/blog", { urls: [] });
    const res = await importBlog(req);

    expect(res.status).toBe(400);
  });

  it("rejects invalid URLs", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);

    const req = createPOST("/api/knowledge/import/blog", { urls: ["not-a-url"] });
    const res = await importBlog(req);

    expect(res.status).toBe(400);
  });

  it("returns 401 for unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createPOST("/api/knowledge/import/blog", { urls: ["https://example.com"] });
    const res = await importBlog(req);

    expect(res.status).toBe(401);
  });

  it("returns 403 for non-expert", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const req = createPOST("/api/knowledge/import/blog", { urls: ["https://example.com"] });
    const res = await importBlog(req);

    expect(res.status).toBe(403);
  });
});

describe("Import History API", () => {
  it("returns paginated import history", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.importJob.findMany.mockResolvedValue([
      {
        id: "job-1",
        sourceType: "BLOG_URL",
        sourceUrl: "https://example.com/post",
        status: "COMPLETED",
        itemsCreated: 1,
        createdAt: new Date(),
      },
    ]);
    mockPrisma.importJob.count.mockResolvedValue(1);

    const req = createGET("/api/knowledge/import/history");
    const res = await getImportHistory(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].sourceType).toBe("BLOG_URL");
    expect(data.total).toBe(1);
  });

  it("returns empty when no imports", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.importJob.findMany.mockResolvedValue([]);
    mockPrisma.importJob.count.mockResolvedValue(0);

    const req = createGET("/api/knowledge/import/history");
    const res = await getImportHistory(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items).toHaveLength(0);
  });

  it("returns 401 for unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createGET("/api/knowledge/import/history");
    const res = await getImportHistory(req);

    expect(res.status).toBe(401);
  });
});

describe("Content Chunker Utility", () => {
  const { chunkText } = require("@/lib/import/chunker");

  it("returns single chunk for short text over 20 chars", () => {
    const text = "This is a reasonably long text that is over twenty characters.";
    const result = chunkText(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(text);
  });

  it("splits long text into overlapping chunks", () => {
    const longText = "A".repeat(2500);
    const result = chunkText(longText, 1000, 200);
    expect(result.length).toBeGreaterThan(1);
  });

  it("returns short text as single chunk when under maxChunkSize", () => {
    // Short text below maxChunkSize is returned as-is (single chunk)
    const result = chunkText("short");
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("short");
  });

  it("returns single empty-string chunk for empty text", () => {
    // Empty text is below maxChunkSize, so returned as single element
    const result = chunkText("");
    expect(result).toHaveLength(1);
  });

  it("preserves content in chunks", () => {
    const text = "A".repeat(500) + ". " + "B".repeat(500) + ". " + "C".repeat(500);
    const result = chunkText(text, 600, 100);
    expect(result.length).toBeGreaterThan(1);
    result.forEach((chunk: string) => {
      expect(chunk.length).toBeGreaterThan(20);
    });
  });
});
