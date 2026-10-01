import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import { mockNotification } from "../mocks/data";
import { createGET, createPOST } from "../helpers/request";

jest.mock("@/lib/prisma", () => ({ __esModule: true, default: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: mockAuth }));

import { GET as search } from "@/app/api/search/route";
import { GET as listNotifications } from "@/app/api/notifications/route";
import { POST as upload } from "@/app/api/upload/route";

beforeEach(() => {
  resetAllMocks();
  mockAuth.mockReset();
});

// ---------------------------------------------------------------------------
// Search API
// ---------------------------------------------------------------------------
describe("Search API", () => {
  // 1. Returns experts, tags, and posts matching query
  it("GET /search?q=AI - returns experts, tags, and posts", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    const expertResults = [
      {
        id: "expert-id-1",
        name: "AI Expert",
        image: null,
        expertProfile: {
          displayName: "AI Expert",
          specialty: ["AI"],
          isVerified: true,
          totalSubscribers: 10,
        },
      },
    ];
    const tagResults = [
      { id: "tag-1", name: "AI", slug: "ai", postCount: 5 },
    ];
    const postResults = [
      {
        id: "post-id-1",
        title: "Introduction to AI",
        content: "A short intro to artificial intelligence techniques and methods.",
        createdAt: new Date("2024-01-01"),
        author: { id: "expert-id-1", name: "AI Expert", image: null },
        _count: { likes: 5, comments: 2 },
      },
    ];

    mockPrisma.user.findMany.mockResolvedValue(expertResults);
    mockPrisma.tag.findMany.mockResolvedValue(tagResults);
    mockPrisma.post.findMany.mockResolvedValue(postResults);

    const req = createGET("/api/search", { q: "AI" });
    const res = await search(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.experts).toHaveLength(1);
    expect(json.experts[0].name).toBe("AI Expert");
    expect(json.tags).toHaveLength(1);
    expect(json.tags[0].name).toBe("AI");
    expect(json.posts).toHaveLength(1);
    expect(json.posts[0].title).toBe("Introduction to AI");
  });

  // 2. Returns 400 for empty query
  it("GET /search - returns 400 for empty query", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    const req = createGET("/api/search");
    const res = await search(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/search query is required/i);
  });

  // 3. Handles query with no results
  it("GET /search?q=nonexistent - handles no results", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.tag.findMany.mockResolvedValue([]);
    mockPrisma.post.findMany.mockResolvedValue([]);

    const req = createGET("/api/search", { q: "nonexistent" });
    const res = await search(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.experts).toHaveLength(0);
    expect(json.tags).toHaveLength(0);
    expect(json.posts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Notifications API
// ---------------------------------------------------------------------------
describe("Notifications API", () => {
  // 4. Lists notifications for current user
  it("GET /notifications - lists notifications for current user", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const notifications = [mockNotification];
    mockPrisma.notification.findMany.mockResolvedValue(notifications);
    mockPrisma.notification.count
      .mockResolvedValueOnce(1)  // total
      .mockResolvedValueOnce(1); // unreadCount

    const req = createGET("/api/notifications");
    const res = await listNotifications(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.notifications).toHaveLength(1);
    expect(json.notifications[0].id).toBe("notif-id-1");
    expect(json.unreadCount).toBe(1);
    expect(json.pagination).toMatchObject({ page: 1, total: 1 });
  });

  // 5. Filters unread only
  it("GET /notifications?unreadOnly=true - filters unread only", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.notification.findMany.mockResolvedValue([mockNotification]);
    mockPrisma.notification.count
      .mockResolvedValueOnce(1)  // total (with unread filter)
      .mockResolvedValueOnce(1); // unreadCount

    const req = createGET("/api/notifications", { unreadOnly: "true" });
    const res = await listNotifications(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.notifications).toHaveLength(1);

    // Verify the where clause includes isRead: false
    const findManyCall = mockPrisma.notification.findMany.mock.calls[0][0];
    expect(findManyCall.where).toMatchObject({
      userId: "subscriber-id-1",
      isRead: false,
    });
  });

  // 6. Unauthenticated gets 401
  it("GET /notifications - unauthenticated gets 401", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createGET("/api/notifications");
    const res = await listNotifications(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toMatch(/unauthorized/i);
  });
});

// ---------------------------------------------------------------------------
// Upload API (auth check only)
// ---------------------------------------------------------------------------
describe("Upload API", () => {
  // 7. Upload route requires auth
  it("POST /upload - unauthenticated gets 401", async () => {
    mockAuth.mockResolvedValue(null);

    // Create a minimal request with an empty FormData
    const formData = new FormData();
    const req = new Request("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    });

    // Import the NextRequest constructor to wrap
    const { NextRequest } = require("next/server");
    const nextReq = new NextRequest(req);

    const res = await upload(nextReq);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toMatch(/unauthorized/i);
  });
});
