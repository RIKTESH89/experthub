import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import { mockNotification } from "../mocks/data";
import { createGET, createPATCH } from "../helpers/request";

jest.mock("@/lib/prisma", () => ({ __esModule: true, default: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: mockAuth }));

import { GET as listContent } from "@/app/api/admin/content/route";
import { PATCH as contentAction } from "@/app/api/admin/content/[postId]/route";
import { GET as getFeaturedExperts } from "@/app/api/experts/featured/route";
import { PATCH as markNotificationRead } from "@/app/api/notifications/[notificationId]/read/route";

function postIdParams(postId: string) {
  return { params: Promise.resolve({ postId }) };
}

function notificationIdParams(notificationId: string) {
  return { params: Promise.resolve({ notificationId }) };
}

beforeEach(() => {
  resetAllMocks();
  mockAuth.mockReset();
});

// ---------------------------------------------------------------------------
// Admin Content Moderation
// ---------------------------------------------------------------------------
describe("Admin Content API", () => {
  const samplePosts = [
    {
      id: "post-id-1",
      title: "Test Post",
      content: "Test content",
      status: "PUBLISHED",
      isHidden: false,
      createdAt: new Date("2024-01-01"),
      author: { id: "expert-id-1", name: "Expert User", image: null },
      _count: { likes: 5, comments: 3 },
    },
  ];

  // 1. Admin lists all content for moderation
  it("GET /admin/content - admin lists all content", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);

    mockPrisma.post.findMany.mockResolvedValue(samplePosts);
    mockPrisma.post.count.mockResolvedValue(1);
    mockPrisma.report.groupBy.mockResolvedValue([
      { contentId: "post-id-1", _count: { id: 2 } },
    ]);

    const req = createGET("/api/admin/content");
    const res = await listContent(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.posts).toHaveLength(1);
    expect(json.posts[0].id).toBe("post-id-1");
    expect(json.posts[0].status).toBe("PUBLISHED");
    expect(json.posts[0]._count.reports).toBe(2);
    expect(json.pagination).toMatchObject({ page: 1, total: 1 });
  });

  // 2. Non-admin gets 403
  it("GET /admin/content - non-admin gets 403", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    const req = createGET("/api/admin/content");
    const res = await listContent(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/admin access required/i);
  });

  // 3. Unauthenticated gets 401
  it("GET /admin/content - unauthenticated gets 401", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createGET("/api/admin/content");
    const res = await listContent(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toMatch(/unauthorized/i);
  });

  // 4. Admin archives post
  it("PATCH /admin/content/:postId - admin archives post", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);

    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-id-1",
      status: "PUBLISHED",
      isHidden: false,
    });
    mockPrisma.post.update.mockResolvedValue({
      id: "post-id-1",
      title: "Test Post",
      status: "ARCHIVED",
      isHidden: false,
    });

    const req = createPATCH("/api/admin/content/post-id-1", {
      action: "archive",
    });
    const res = await contentAction(req, postIdParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("ARCHIVED");
    expect(mockPrisma.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "post-id-1" },
        data: { status: "ARCHIVED", isHidden: false },
      })
    );
  });

  // 5. Admin removes post
  it("PATCH /admin/content/:postId - admin removes post", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);

    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-id-1",
      status: "PUBLISHED",
      isHidden: false,
    });
    mockPrisma.post.update.mockResolvedValue({
      id: "post-id-1",
      title: "Test Post",
      status: "PUBLISHED",
      isHidden: true,
    });

    const req = createPATCH("/api/admin/content/post-id-1", {
      action: "remove",
    });
    const res = await contentAction(req, postIdParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("REMOVED");
  });

  // 6. Admin restores post
  it("PATCH /admin/content/:postId - admin restores post", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);

    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-id-1",
      status: "ARCHIVED",
      isHidden: true,
    });
    mockPrisma.post.update.mockResolvedValue({
      id: "post-id-1",
      title: "Test Post",
      status: "PUBLISHED",
      isHidden: false,
    });

    const req = createPATCH("/api/admin/content/post-id-1", {
      action: "restore",
    });
    const res = await contentAction(req, postIdParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("PUBLISHED");
    expect(mockPrisma.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "PUBLISHED", isHidden: false },
      })
    );
  });

  // 7. Invalid action returns 400
  it("PATCH /admin/content/:postId - invalid action returns 400", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);

    const req = createPATCH("/api/admin/content/post-id-1", {
      action: "invalid_action",
    });
    const res = await contentAction(req, postIdParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/validation failed/i);
  });

  // 8. Non-admin gets 403
  it("PATCH /admin/content/:postId - non-admin gets 403", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    const req = createPATCH("/api/admin/content/post-id-1", {
      action: "archive",
    });
    const res = await contentAction(req, postIdParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/admin access required/i);
  });
});

// ---------------------------------------------------------------------------
// Featured Experts
// ---------------------------------------------------------------------------
describe("Featured Experts API", () => {
  const expertsList = [
    {
      id: "expert-id-1",
      name: "Expert User",
      image: null,
      bio: "Expert bio",
      headline: "AI Expert",
      expertProfile: {
        id: "profile-id-1",
        displayName: "Expert User",
        specialty: ["AI", "ML"],
        monthlyPrice: 9.99,
        isVerified: true,
        totalSubscribers: 10,
        twinGreeting: "Hello!",
      },
      _count: { posts: 5 },
    },
  ];

  // 9. Returns featured experts sorted by subscribers
  it("GET /experts/featured - returns featured experts", async () => {
    mockPrisma.user.findMany.mockResolvedValue(expertsList);

    const req = createGET("/api/experts/featured");
    const res = await getFeaturedExperts(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.experts).toHaveLength(1);
    expect(json.experts[0].id).toBe("expert-id-1");
    expect(json.experts[0].expertProfile.totalSubscribers).toBe(10);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { expertProfile: { totalSubscribers: "desc" } },
      })
    );
  });

  // 10. Respects limit parameter
  it("GET /experts/featured?limit=3 - respects limit parameter", async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);

    const req = createGET("/api/experts/featured", { limit: "3" });
    const res = await getFeaturedExperts(req);

    expect(res.status).toBe(200);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 })
    );
  });
});

// ---------------------------------------------------------------------------
// Mark Notification Read
// ---------------------------------------------------------------------------
describe("Mark Notification Read API", () => {
  // 11. Marks notification as read
  it("PATCH /notifications/:id/read - marks notification as read", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);
    mockPrisma.notification.update.mockResolvedValue({
      ...mockNotification,
      isRead: true,
    });

    const req = createPATCH("/api/notifications/notif-id-1/read", {});
    const res = await markNotificationRead(
      req,
      notificationIdParams("notif-id-1")
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.notification.isRead).toBe(true);
    expect(mockPrisma.notification.update).toHaveBeenCalledWith({
      where: { id: "notif-id-1" },
      data: { isRead: true },
    });
  });

  // 12. Non-owner gets 403
  it("PATCH /notifications/:id/read - non-owner gets 403", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    // Notification belongs to subscriber-id-1, but we are logged in as expert-id-1
    mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);

    const req = createPATCH("/api/notifications/notif-id-1/read", {});
    const res = await markNotificationRead(
      req,
      notificationIdParams("notif-id-1")
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/forbidden/i);
  });

  // 13. Unauthenticated gets 401
  it("PATCH /notifications/:id/read - unauthenticated gets 401", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createPATCH("/api/notifications/notif-id-1/read", {});
    const res = await markNotificationRead(
      req,
      notificationIdParams("notif-id-1")
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toMatch(/unauthorized/i);
  });
});
