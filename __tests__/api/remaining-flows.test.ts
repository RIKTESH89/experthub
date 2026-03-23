import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import { mockUsers } from "../mocks/data";
import { createGET, createPATCH } from "../helpers/request";
import { compare } from "bcryptjs";

jest.mock("@/lib/prisma", () => ({ __esModule: true, default: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: mockAuth }));
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("$2a$12$newhashed"),
  compare: jest.fn(),
}));

import { PATCH as batchMarkRead } from "@/app/api/notifications/route";
import {
  GET as getSubscriberSettings,
  PATCH as updateSubscriberSettings,
} from "@/app/api/subscriber/settings/route";
import { GET as getAdminUserDetail } from "@/app/api/admin/users/[userId]/route";

beforeEach(() => {
  resetAllMocks();
  mockAuth.mockReset();
});

// ---------------------------------------------------------------------------
// PATCH /api/notifications - Batch mark as read
// ---------------------------------------------------------------------------
describe("PATCH /api/notifications - Batch mark as read", () => {
  it("marks multiple notifications as read", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.notification.updateMany.mockResolvedValue({ count: 2 });
    mockPrisma.notification.count.mockResolvedValue(3);

    const req = createPATCH("/api/notifications", {
      notificationIds: ["notif-1", "notif-2"],
    });
    const res = await batchMarkRead(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Notifications marked as read");
    expect(json.unreadCount).toBe(3);

    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["notif-1", "notif-2"] },
        userId: "subscriber-id-1",
      },
      data: { isRead: true },
    });
  });

  it("returns 400 for empty notificationIds array", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const req = createPATCH("/api/notifications", {
      notificationIds: [],
    });
    const res = await batchMarkRead(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 for missing notificationIds", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const req = createPATCH("/api/notifications", {});
    const res = await batchMarkRead(req);

    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createPATCH("/api/notifications", {
      notificationIds: ["notif-1"],
    });
    const res = await batchMarkRead(req);

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/subscriber/settings
// ---------------------------------------------------------------------------
describe("GET /api/subscriber/settings", () => {
  it("returns saved subscriber settings", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.userSettings.findUnique.mockResolvedValue({
      id: "settings-1",
      userId: "subscriber-id-1",
      emailOnNewSubscriber: false,
      emailOnComment: true,
      emailOnChat: false,
      emailDigest: "daily",
      twoFactorEnabled: false,
    });

    const res = await getSubscriberSettings();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.emailOnNewPost).toBe(false); // mapped from emailOnNewSubscriber
    expect(json.emailOnReply).toBe(true); // mapped from emailOnComment
    expect(json.emailDigest).toBe("daily");
    expect(json.twoFactorEnabled).toBe(false);
  });

  it("creates default settings when none exist", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.userSettings.findUnique.mockResolvedValue(null);
    mockPrisma.userSettings.create.mockResolvedValue({
      id: "settings-new",
      userId: "subscriber-id-1",
      emailOnNewSubscriber: true,
      emailOnComment: true,
      emailOnChat: false,
      emailDigest: "weekly",
      twoFactorEnabled: false,
    });

    const res = await getSubscriberSettings();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.emailOnNewPost).toBe(true);
    expect(json.emailDigest).toBe("weekly");

    expect(mockPrisma.userSettings.create).toHaveBeenCalledWith({
      data: { userId: "subscriber-id-1" },
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await getSubscriberSettings();
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/subscriber/settings
// ---------------------------------------------------------------------------
describe("PATCH /api/subscriber/settings", () => {
  it("updates notification preferences", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.userSettings.upsert.mockResolvedValue({});

    const req = createPATCH("/api/subscriber/settings", {
      emailOnNewPost: false,
      emailOnReply: false,
      emailDigest: "never",
    });
    const res = await updateSubscriberSettings(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    expect(mockPrisma.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId: "subscriber-id-1" },
      create: expect.objectContaining({
        userId: "subscriber-id-1",
        emailOnNewSubscriber: false,
        emailOnComment: false,
        emailDigest: "never",
      }),
      update: expect.objectContaining({
        emailOnNewSubscriber: false,
        emailOnComment: false,
        emailDigest: "never",
      }),
    });
  });

  it("changes password successfully", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.user.findUnique.mockResolvedValue({
      hashedPassword: "$2a$12$oldhashed",
    });
    (compare as jest.Mock).mockResolvedValue(true);
    mockPrisma.user.update.mockResolvedValue({});

    const req = createPATCH("/api/subscriber/settings", {
      currentPassword: "OldPass123",
      newPassword: "NewPass456",
    });
    const res = await updateSubscriberSettings(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "subscriber-id-1" },
      data: { hashedPassword: "$2a$12$newhashed" },
    });
  });

  it("rejects wrong current password", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.user.findUnique.mockResolvedValue({
      hashedPassword: "$2a$12$oldhashed",
    });
    (compare as jest.Mock).mockResolvedValue(false);

    const req = createPATCH("/api/subscriber/settings", {
      currentPassword: "WrongPass",
      newPassword: "NewPass456",
    });
    const res = await updateSubscriberSettings(req);

    expect(res.status).toBe(400);
  });

  it("rejects short new password", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.user.findUnique.mockResolvedValue({
      hashedPassword: "$2a$12$oldhashed",
    });
    (compare as jest.Mock).mockResolvedValue(true);

    const req = createPATCH("/api/subscriber/settings", {
      currentPassword: "OldPass123",
      newPassword: "short",
    });
    const res = await updateSubscriberSettings(req);

    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const req = createPATCH("/api/subscriber/settings", {});
    const res = await updateSubscriberSettings(req);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/users/[userId] - Admin user detail
// ---------------------------------------------------------------------------
describe("GET /api/admin/users/[userId]", () => {
  const userParams = (userId: string) => ({
    params: Promise.resolve({ userId }),
  });

  it("admin gets detailed user info", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);

    const mockUser = {
      ...mockUsers.expert,
      expertProfile: {
        id: "profile-1",
        displayName: "Expert",
        specialty: ["AI"],
        isVerified: true,
        totalSubscribers: 10,
        monthlyPrice: 9.99,
      },
      _count: {
        posts: 5,
        subscriptionsAsSubscriber: 2,
      },
      posts: [
        { id: "post-1", title: "Test", status: "PUBLISHED", createdAt: new Date() },
      ],
    };
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const req = createGET("/api/admin/users/expert-id-1");
    const res = await getAdminUserDetail(req, userParams("expert-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.id).toBe("expert-id-1");
    expect(json.role).toBe("EXPERT");
    expect(json.status).toBeDefined(); // derived from isBanned
  });

  it("returns 404 for non-existent user", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);

    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = createGET("/api/admin/users/nonexistent");
    const res = await getAdminUserDetail(req, userParams("nonexistent"));

    expect(res.status).toBe(404);
  });

  it("non-admin gets 403", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    const req = createGET("/api/admin/users/expert-id-1");
    const res = await getAdminUserDetail(req, userParams("expert-id-1"));

    expect(res.status).toBe(403);
  });

  it("unauthenticated gets 401", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createGET("/api/admin/users/expert-id-1");
    const res = await getAdminUserDetail(req, userParams("expert-id-1"));

    expect(res.status).toBe(401);
  });
});
