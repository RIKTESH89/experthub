import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import { mockUsers, mockReport } from "../mocks/data";
import { createGET, createPATCH, createDELETE } from "../helpers/request";

jest.mock("@/lib/prisma", () => ({ __esModule: true, default: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: mockAuth }));

import { GET as getAnalytics } from "@/app/api/admin/analytics/route";
import { GET as listUsers } from "@/app/api/admin/users/route";
import {
  PATCH as updateUser,
  DELETE as deleteUser,
} from "@/app/api/admin/users/[userId]/route";
import {
  GET as listReports,
  PATCH as updateReport,
} from "@/app/api/admin/reports/route";

function userParams(userId: string) {
  return { params: Promise.resolve({ userId }) };
}

beforeEach(() => {
  resetAllMocks();
  mockAuth.mockReset();
});

// ---------------------------------------------------------------------------
// Admin Analytics
// ---------------------------------------------------------------------------
describe("Admin Analytics API", () => {
  // 1. GET /admin/analytics - admin gets platform stats
  it("GET /admin/analytics - admin gets platform stats", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);

    mockPrisma.user.count
      .mockResolvedValueOnce(100)  // totalUsers
      .mockResolvedValueOnce(20)   // activeExperts
      .mockResolvedValueOnce(70)   // totalSubscribers
      .mockResolvedValueOnce(5)    // prevUsers
      .mockResolvedValueOnce(3)    // prevExperts
      .mockResolvedValueOnce(10);  // recentUserCount
    mockPrisma.post.count
      .mockResolvedValueOnce(500)  // totalPosts
      .mockResolvedValueOnce(0)    // prevPosts
      .mockResolvedValueOnce(15);  // recentPostCount
    mockPrisma.expertSubscription.count
      .mockResolvedValueOnce(50)   // activeSubscriptions
      .mockResolvedValueOnce(8)    // prevSubscriptions
      .mockResolvedValueOnce(12);  // recentSubCount
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.post.groupBy.mockResolvedValue([]);
    mockPrisma.expertSubscription.aggregate.mockResolvedValue({
      _sum: { price: 499.5 },
    });

    const res = await getAnalytics();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.totalUsers).toBe(100);
    expect(json.activeExperts).toBe(20);
    expect(json.totalSubscribers).toBe(70);
    expect(json.totalPosts).toBe(500);
    expect(json.activeSubscriptions).toBe(50);
    expect(json.trends).toBeDefined();
    expect(json.trends.users).toBeDefined();
    expect(json.subscriptionRevenue).toBe(499.5);
    expect(json.recentSignups).toEqual([]);
    expect(json.postsPerDay).toEqual({});
  });

  // 2. GET /admin/analytics - non-admin gets 403
  it("GET /admin/analytics - non-admin gets 403", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const res = await getAnalytics();
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/admin access required/i);
  });
});

// ---------------------------------------------------------------------------
// Admin Users
// ---------------------------------------------------------------------------
describe("Admin Users API", () => {
  const usersList = [
    {
      id: "user-1",
      name: "Test User",
      email: "test@test.com",
      image: null,
      role: "SUBSCRIBER",
      isActive: true,
      isBanned: false,
      createdAt: new Date("2024-01-01"),
      expertProfile: null,
      _count: { posts: 0, subscriptionsAsSubscriber: 0 },
    },
  ];

  // 3. GET /admin/users - admin lists all users
  it("GET /admin/users - admin lists all users", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.user.findMany.mockResolvedValue(usersList);
    mockPrisma.user.count.mockResolvedValue(1);

    const req = createGET("/api/admin/users");
    const res = await listUsers(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.users).toHaveLength(1);
    expect(json.pagination).toMatchObject({ page: 1, total: 1 });
  });

  // 4. GET /admin/users?search=test - filters by search
  it("GET /admin/users?search=test - filters by search", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.user.findMany.mockResolvedValue(usersList);
    mockPrisma.user.count.mockResolvedValue(1);

    const req = createGET("/api/admin/users", { search: "test" });
    const res = await listUsers(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.users).toHaveLength(1);

    const findManyCall = mockPrisma.user.findMany.mock.calls[0][0];
    expect(findManyCall.where.OR).toEqual([
      { name: { contains: "test", mode: "insensitive" } },
      { email: { contains: "test", mode: "insensitive" } },
    ]);
  });

  // 5. GET /admin/users?role=EXPERT - filters by role
  it("GET /admin/users?role=EXPERT - filters by role", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);

    const req = createGET("/api/admin/users", { role: "EXPERT" });
    const res = await listUsers(req);

    expect(res.status).toBe(200);

    const findManyCall = mockPrisma.user.findMany.mock.calls[0][0];
    expect(findManyCall.where.role).toBe("EXPERT");
  });

  // 6. PATCH /admin/users/:id - admin updates user role
  it("PATCH /admin/users/:id - admin updates user role", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.user.findUnique.mockResolvedValue(mockUsers.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(null);
    mockPrisma.expertProfile.create.mockResolvedValue({});
    mockPrisma.user.update.mockResolvedValue({
      ...mockUsers.subscriber,
      role: "EXPERT",
      expertProfile: { id: "new-profile" },
    });

    const req = createPATCH("/api/admin/users/subscriber-id-1", { role: "EXPERT" });
    const res = await updateUser(req, userParams("subscriber-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.role).toBe("EXPERT");
    // Should create expert profile when promoting to EXPERT
    expect(mockPrisma.expertProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "subscriber-id-1",
        vectorNamespace: "expert_subscriber-id-1",
      }),
    });
  });

  // 7. PATCH /admin/users/:id - admin bans user
  it("PATCH /admin/users/:id - admin bans user", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.user.findUnique.mockResolvedValue(mockUsers.subscriber);
    mockPrisma.user.update.mockResolvedValue({
      ...mockUsers.subscriber,
      isBanned: true,
    });

    const req = createPATCH("/api/admin/users/subscriber-id-1", { isBanned: true });
    const res = await updateUser(req, userParams("subscriber-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isBanned).toBe(true);
  });

  // 8. PATCH /admin/users/:id - admin unbans user
  it("PATCH /admin/users/:id - admin unbans user", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.user.findUnique.mockResolvedValue({
      ...mockUsers.subscriber,
      isBanned: true,
    });
    mockPrisma.user.update.mockResolvedValue({
      ...mockUsers.subscriber,
      isBanned: false,
    });

    const req = createPATCH("/api/admin/users/subscriber-id-1", { isBanned: false });
    const res = await updateUser(req, userParams("subscriber-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isBanned).toBe(false);
  });

  // 9. PATCH /admin/users/:id - cannot change own admin role
  it("PATCH /admin/users/:id - cannot change own admin role", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.user.findUnique.mockResolvedValue(mockUsers.admin);

    const req = createPATCH("/api/admin/users/admin-id-1", { role: "SUBSCRIBER" });
    const res = await updateUser(req, userParams("admin-id-1"));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/cannot change your own admin role/i);
  });

  // 10. DELETE /admin/users/:id - admin deletes user
  it("DELETE /admin/users/:id - admin deletes user", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.user.findUnique.mockResolvedValue(mockUsers.subscriber);
    mockPrisma.user.delete.mockResolvedValue(mockUsers.subscriber);

    const req = createDELETE("/api/admin/users/subscriber-id-1");
    const res = await deleteUser(req, userParams("subscriber-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toMatch(/deleted/i);
    expect(mockPrisma.user.delete).toHaveBeenCalledWith({
      where: { id: "subscriber-id-1" },
    });
  });

  // 11. DELETE /admin/users/:id - cannot delete self
  it("DELETE /admin/users/:id - cannot delete self", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);

    const req = createDELETE("/api/admin/users/admin-id-1");
    const res = await deleteUser(req, userParams("admin-id-1"));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/cannot delete your own account/i);
  });

  // 12. DELETE /admin/users/:id - non-admin gets 403
  it("DELETE /admin/users/:id - non-admin gets 403", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const req = createDELETE("/api/admin/users/some-user-id");
    const res = await deleteUser(req, userParams("some-user-id"));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/admin access required/i);
  });
});

// ---------------------------------------------------------------------------
// Admin Reports
// ---------------------------------------------------------------------------
describe("Admin Reports API", () => {
  // 13. GET /admin/reports - admin lists reports
  it("GET /admin/reports - admin lists reports", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);

    const reportsData = [
      {
        ...mockReport,
        reporter: { id: "subscriber-id-1", name: "Subscriber User", email: "subscriber@test.com", image: null },
        reported: { id: "expert-id-1", name: "Expert User", email: "expert@test.com", image: null },
      },
    ];
    mockPrisma.report.findMany.mockResolvedValue(reportsData);
    mockPrisma.report.count.mockResolvedValue(1);
    mockPrisma.post.findMany.mockResolvedValue([
      { id: "post-id-1", title: "Test Post", content: "Test content", author: { name: "Expert User" } },
    ]);

    const req = createGET("/api/admin/reports");
    const res = await listReports(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.reports).toHaveLength(1);
    expect(json.reports[0].status).toBe("PENDING");
    expect(json.pagination).toMatchObject({ page: 1, total: 1 });
  });

  // 14. PATCH /admin/reports - admin resolves report
  it("PATCH /admin/reports - admin resolves report", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.report.findUnique.mockResolvedValue(mockReport);
    mockPrisma.report.update.mockResolvedValue({
      ...mockReport,
      status: "RESOLVED",
      adminNotes: "Issue has been addressed",
      reporter: { id: "subscriber-id-1", name: "Subscriber User", email: "subscriber@test.com" },
      reported: { id: "expert-id-1", name: "Expert User", email: "expert@test.com" },
    });

    const req = createPATCH("/api/admin/reports", {
      reportId: "report-id-1",
      status: "RESOLVED",
      adminNotes: "Issue has been addressed",
    });
    const res = await updateReport(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("RESOLVED");
    expect(json.adminNotes).toBe("Issue has been addressed");
    expect(mockPrisma.report.update).toHaveBeenCalledWith({
      where: { id: "report-id-1" },
      data: {
        status: "RESOLVED",
        adminNotes: "Issue has been addressed",
      },
      include: expect.any(Object),
    });
  });
});
