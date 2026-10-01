import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import { mockUsers, mockExpertProfile } from "../mocks/data";
import { createGET, createPOST, createPATCH } from "../helpers/request";

jest.mock("@/lib/prisma", () => ({ __esModule: true, default: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: mockAuth }));

import { GET as getSubscriberStats } from "@/app/api/subscriber/stats/route";
import { GET as getTrendingTopics } from "@/app/api/topics/trending/route";
import { GET as getExpertStats } from "@/app/api/expert/stats/route";
import {
  GET as getAdminSettings,
  PATCH as updateAdminSettings,
} from "@/app/api/admin/settings/route";
import { GET as listExperts } from "@/app/api/admin/experts/route";
import { POST as verifyExpert } from "@/app/api/admin/experts/[expertId]/verify/route";
import { POST as unverifyExpert } from "@/app/api/admin/experts/[expertId]/unverify/route";
import { GET as getSubscriberFeed } from "@/app/api/subscriber/feed/route";
import { GET as getSubscriberBookmarks } from "@/app/api/subscriber/bookmarks/route";

function expertParams(expertId: string) {
  return { params: Promise.resolve({ expertId }) };
}

beforeEach(() => {
  resetAllMocks();
  mockAuth.mockReset();
});

// ---------------------------------------------------------------------------
// GET /api/subscriber/stats
// ---------------------------------------------------------------------------
describe("GET /api/subscriber/stats", () => {
  it("returns stats for an authenticated subscriber", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.expertSubscription.count.mockResolvedValue(3);
    mockPrisma.bookmark.count.mockResolvedValue(7);
    mockPrisma.chatSession.count.mockResolvedValue(2);

    const res = await getSubscriberStats();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.activeSubscriptions).toBe(3);
    expect(json.bookmarkedPosts).toBe(7);
    expect(json.twinChats).toBe(2);

    // Verify correct filters were passed
    expect(mockPrisma.expertSubscription.count).toHaveBeenCalledWith({
      where: { subscriberId: "subscriber-id-1", status: "ACTIVE" },
    });
    expect(mockPrisma.bookmark.count).toHaveBeenCalledWith({
      where: { userId: "subscriber-id-1" },
    });
    expect(mockPrisma.chatSession.count).toHaveBeenCalledWith({
      where: { subscriberId: "subscriber-id-1" },
    });
  });

  it("returns 401 for a non-subscriber (e.g. EXPERT role)", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    const res = await getSubscriberStats();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 401 for an admin user", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);

    const res = await getSubscriberStats();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await getSubscriberStats();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });
});

// ---------------------------------------------------------------------------
// GET /api/topics/trending
// ---------------------------------------------------------------------------
describe("GET /api/topics/trending", () => {
  it("returns tags sorted by postCount descending", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    const mockTopics = [
      { name: "Machine Learning", postCount: 42 },
      { name: "AI", postCount: 35 },
      { name: "Web Dev", postCount: 10 },
    ];
    mockPrisma.tag.findMany.mockResolvedValue(mockTopics);

    const res = await getTrendingTopics();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.topics).toEqual(mockTopics);
    expect(json.topics).toHaveLength(3);

    // Verify correct query shape
    expect(mockPrisma.tag.findMany).toHaveBeenCalledWith({
      orderBy: { postCount: "desc" },
      take: 20,
      select: {
        name: true,
        postCount: true,
      },
    });
  });

  it("works without authentication (public endpoint)", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    // No mockAuth setup needed -- route doesn't call auth()
    mockPrisma.tag.findMany.mockResolvedValue([]);

    const res = await getTrendingTopics();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.topics).toEqual([]);
  });

  it("returns empty array when no tags exist", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.tag.findMany.mockResolvedValue([]);

    const res = await getTrendingTopics();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.topics).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/experts
// ---------------------------------------------------------------------------
describe("GET /api/admin/experts", () => {
  const mockExpertUser = {
    id: "expert-id-1",
    name: "Expert User",
    email: "expert@test.com",
    image: null,
    createdAt: new Date("2024-01-01"),
    expertProfile: {
      isVerified: true,
      displayName: "Expert User",
      specialty: ["AI", "ML"],
      totalSubscribers: 10,
      _count: { subscriptions: 5 },
    },
    _count: { posts: 12 },
  };

  it("admin lists experts with profiles", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.user.findMany.mockResolvedValue([mockExpertUser]);

    const req = createGET("/api/admin/experts");
    const res = await listExperts(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.experts).toHaveLength(1);
    expect(json.experts[0]).toEqual({
      id: "expert-id-1",
      name: "Expert User",
      email: "expert@test.com",
      image: null,
      displayName: "Expert User",
      specialty: ["AI", "ML"],
      isVerified: true,
      createdAt: mockExpertUser.createdAt.toISOString(),
      _count: {
        subscribers: 5,
        posts: 12,
      },
    });
  });

  it("supports search filter", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.user.findMany.mockResolvedValue([]);

    const req = createGET("/api/admin/experts", { search: "John" });
    const res = await listExperts(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.experts).toEqual([]);

    // Verify the where clause includes the OR search condition
    const callArgs = mockPrisma.user.findMany.mock.calls[0][0];
    expect(callArgs.where.role).toBe("EXPERT");
    expect(callArgs.where.OR).toEqual([
      { name: { contains: "John", mode: "insensitive" } },
      { email: { contains: "John", mode: "insensitive" } },
      {
        expertProfile: {
          displayName: { contains: "John", mode: "insensitive" },
        },
      },
    ]);
  });

  it("supports verified=true filter", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.user.findMany.mockResolvedValue([]);

    const req = createGET("/api/admin/experts", { verified: "true" });
    const res = await listExperts(req);

    expect(res.status).toBe(200);

    const callArgs = mockPrisma.user.findMany.mock.calls[0][0];
    expect(callArgs.where.expertProfile).toEqual({ isVerified: true });
  });

  it("supports verified=false filter", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.user.findMany.mockResolvedValue([]);

    const req = createGET("/api/admin/experts", { verified: "false" });
    const res = await listExperts(req);

    expect(res.status).toBe(200);

    const callArgs = mockPrisma.user.findMany.mock.calls[0][0];
    expect(callArgs.where.expertProfile).toEqual({ isVerified: false });
  });

  it("returns 403 for non-admin (subscriber)", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const req = createGET("/api/admin/experts");
    const res = await listExperts(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Admin access required");
  });

  it("returns 403 for non-admin (expert)", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    const req = createGET("/api/admin/experts");
    const res = await listExperts(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Admin access required");
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createGET("/api/admin/experts");
    const res = await listExperts(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });
});

// ---------------------------------------------------------------------------
// POST /api/admin/experts/[expertId]/verify
// ---------------------------------------------------------------------------
describe("POST /api/admin/experts/[expertId]/verify", () => {
  it("admin verifies an expert", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      isVerified: false,
    });
    mockPrisma.expertProfile.update.mockResolvedValue({
      ...mockExpertProfile,
      isVerified: true,
    });

    const req = createPOST("/api/admin/experts/expert-id-1/verify", {});
    const res = await verifyExpert(req, expertParams("expert-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.id).toBe("expert-id-1");
    expect(json.isVerified).toBe(true);

    expect(mockPrisma.expertProfile.update).toHaveBeenCalledWith({
      where: { userId: "expert-id-1" },
      data: { isVerified: true },
    });
  });

  it("admin can pass verified=false in body to unverify via verify endpoint", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.expertProfile.update.mockResolvedValue({
      ...mockExpertProfile,
      isVerified: false,
    });

    const req = createPOST("/api/admin/experts/expert-id-1/verify", {
      verified: false,
    });
    const res = await verifyExpert(req, expertParams("expert-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isVerified).toBe(false);

    expect(mockPrisma.expertProfile.update).toHaveBeenCalledWith({
      where: { userId: "expert-id-1" },
      data: { isVerified: false },
    });
  });

  it("returns 404 when expert profile not found", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(null);

    const req = createPOST("/api/admin/experts/nonexistent/verify", {});
    const res = await verifyExpert(req, expertParams("nonexistent"));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Expert profile not found");
  });

  it("returns 403 for non-admin (subscriber)", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const req = createPOST("/api/admin/experts/expert-id-1/verify", {});
    const res = await verifyExpert(req, expertParams("expert-id-1"));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Admin access required");
  });

  it("returns 403 for non-admin (expert)", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    const req = createPOST("/api/admin/experts/expert-id-1/verify", {});
    const res = await verifyExpert(req, expertParams("expert-id-1"));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Admin access required");
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createPOST("/api/admin/experts/expert-id-1/verify", {});
    const res = await verifyExpert(req, expertParams("expert-id-1"));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });
});

// ---------------------------------------------------------------------------
// POST /api/admin/experts/[expertId]/unverify
// ---------------------------------------------------------------------------
describe("POST /api/admin/experts/[expertId]/unverify", () => {
  it("admin unverifies an expert", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      isVerified: true,
    });
    mockPrisma.expertProfile.update.mockResolvedValue({
      ...mockExpertProfile,
      isVerified: false,
    });

    const req = createPOST("/api/admin/experts/expert-id-1/unverify", {});
    const res = await unverifyExpert(req, expertParams("expert-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.id).toBe("expert-id-1");
    expect(json.isVerified).toBe(false);

    expect(mockPrisma.expertProfile.update).toHaveBeenCalledWith({
      where: { userId: "expert-id-1" },
      data: { isVerified: false },
    });
  });

  it("returns 404 when expert profile not found", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(null);

    const req = createPOST("/api/admin/experts/nonexistent/unverify", {});
    const res = await unverifyExpert(req, expertParams("nonexistent"));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Expert profile not found");
  });

  it("returns 403 for non-admin (subscriber)", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const req = createPOST("/api/admin/experts/expert-id-1/unverify", {});
    const res = await unverifyExpert(req, expertParams("expert-id-1"));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Admin access required");
  });

  it("returns 403 for non-admin (expert)", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    const req = createPOST("/api/admin/experts/expert-id-1/unverify", {});
    const res = await unverifyExpert(req, expertParams("expert-id-1"));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Admin access required");
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createPOST("/api/admin/experts/expert-id-1/unverify", {});
    const res = await unverifyExpert(req, expertParams("expert-id-1"));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });
});

// ---------------------------------------------------------------------------
// GET /api/expert/stats
// ---------------------------------------------------------------------------
describe("Expert Stats API", () => {
  it("GET /expert/stats - expert gets dashboard stats", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      id: "profile-id-1",
      totalSubscribers: 42,
    });
    mockPrisma.post.count
      .mockResolvedValueOnce(15) // totalPosts
      .mockResolvedValueOnce(5) // recentPosts
      .mockResolvedValueOnce(3); // prevPosts
    mockPrisma.post.aggregate.mockResolvedValue({
      _sum: { viewCount: 1200 },
    });
    mockPrisma.like.count
      .mockResolvedValueOnce(20) // recentLikes
      .mockResolvedValueOnce(10); // prevLikes
    mockPrisma.comment.count
      .mockResolvedValueOnce(8) // recentComments
      .mockResolvedValueOnce(5); // prevComments

    const res = await getExpertStats();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.totalSubscribers).toBe(42);
    expect(json.totalPosts).toBe(15);
    expect(json.totalViews).toBe(1200);
    expect(json.trends).toBeDefined();
    expect(json.trends.posts.direction).toBe("up");
  });

  it("GET /expert/stats - non-expert gets 403", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    const res = await getExpertStats();
    expect(res.status).toBe(403);
  });

  it("GET /expert/stats - unauthenticated gets 401", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await getExpertStats();
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET/PATCH /api/admin/settings
// ---------------------------------------------------------------------------
describe("Admin Settings API", () => {
  it("GET /admin/settings - admin gets platform settings", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    const res = await getAdminSettings();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.siteName).toBe("ExpertHub");
    expect(json.registrationEnabled).toBeDefined();
  });

  it("GET /admin/settings - non-admin gets 403", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    const res = await getAdminSettings();
    expect(res.status).toBe(403);
  });

  it("PATCH /admin/settings - admin updates settings", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    const req = createPATCH("/api/admin/settings", {
      maintenanceMode: true,
      siteName: "NewHub",
    });
    const res = await updateAdminSettings(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("PATCH /admin/settings - non-admin gets 403", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    const req = createPATCH("/api/admin/settings", { maintenanceMode: true });
    const res = await updateAdminSettings(req);
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// GET /api/subscriber/feed
// ---------------------------------------------------------------------------
describe("Subscriber Feed API", () => {
  it("GET /subscriber/feed - returns posts from subscribed experts", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.expertSubscription.findMany.mockResolvedValue([
      { expertProfile: { userId: "expert-id-1" } },
    ]);
    mockPrisma.post.findMany.mockResolvedValue([
      { id: "post-1", title: "Test", authorId: "expert-id-1", tags: [{ tag: { name: "AI" } }] },
    ]);
    mockPrisma.post.count.mockResolvedValue(1);

    const req = createGET("/api/subscriber/feed");
    const res = await getSubscriberFeed(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.posts).toHaveLength(1);
    expect(json.pagination).toBeDefined();
    expect(json.pagination.total).toBe(1);
  });

  it("GET /subscriber/feed - returns empty when no subscriptions", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertSubscription.findMany.mockResolvedValue([]);

    const req = createGET("/api/subscriber/feed");
    const res = await getSubscriberFeed(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.posts).toHaveLength(0);
  });

  it("GET /subscriber/feed - unauthenticated gets 401", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createGET("/api/subscriber/feed");
    const res = await getSubscriberFeed(req);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/subscriber/bookmarks
// ---------------------------------------------------------------------------
describe("Subscriber Bookmarks API", () => {
  it("GET /subscriber/bookmarks - returns bookmarked posts", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.bookmark.findMany.mockResolvedValue([
      { postId: "post-1" },
    ]);
    mockPrisma.bookmark.count.mockResolvedValue(1);
    mockPrisma.post.findMany.mockResolvedValue([
      { id: "post-1", title: "Bookmarked Post", tags: [{ tag: { name: "Tech" } }] },
    ]);

    const req = createGET("/api/subscriber/bookmarks");
    const res = await getSubscriberBookmarks(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.posts).toHaveLength(1);
    expect(json.pagination.total).toBe(1);
  });

  it("GET /subscriber/bookmarks - returns empty when no bookmarks", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.bookmark.findMany.mockResolvedValue([]);
    mockPrisma.bookmark.count.mockResolvedValue(0);

    const req = createGET("/api/subscriber/bookmarks");
    const res = await getSubscriberBookmarks(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.posts).toHaveLength(0);
  });

  it("GET /subscriber/bookmarks - unauthenticated gets 401", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createGET("/api/subscriber/bookmarks");
    const res = await getSubscriberBookmarks(req);
    expect(res.status).toBe(401);
  });
});
