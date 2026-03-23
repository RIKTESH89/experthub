import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import { mockExpertProfile, mockPost } from "../mocks/data";
import { createGET, createPATCH } from "../helpers/request";

jest.mock("@/lib/prisma", () => ({ __esModule: true, default: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: mockAuth }));
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("$2a$12$newhashed"),
  compare: jest.fn(),
}));

import { GET as getExpertPosts } from "@/app/api/expert/posts/route";
import {
  GET as getExpertProfile,
  PATCH as updateExpertProfile,
} from "@/app/api/expert/profile/route";
import { GET as getSubscribers } from "@/app/api/expert/subscribers/route";
import { GET as getSettings, PATCH as updateSettings } from "@/app/api/expert/settings/route";
import { GET as getKnowledgeStats } from "@/app/api/knowledge/stats/route";
import {
  GET as getTwinConfig,
  PATCH as updateTwinConfig,
} from "@/app/api/expert/twin-config/route";
import { GET as getTwinStats } from "@/app/api/expert/twin-stats/route";
import { compare } from "bcryptjs";

beforeEach(() => {
  resetAllMocks();
  mockAuth.mockReset();
});

// ---------------------------------------------------------------------------
// Expert Posts
// ---------------------------------------------------------------------------
describe("Expert Posts API", () => {
  // 1. Expert lists their own posts
  it("GET /expert/posts - expert lists their own posts", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    const postData = [
      {
        id: "post-id-1",
        title: "Test Post",
        content: "This is a test post content.",
        status: "PUBLISHED",
        isRagEnabled: false,
        viewCount: 100,
        createdAt: new Date("2024-01-01"),
        tags: [{ tag: { name: "AI" } }],
        media: [],
        _count: { likes: 5, comments: 3, bookmarks: 2 },
      },
    ];
    mockPrisma.post.findMany.mockResolvedValue(postData);

    const res = await getExpertPosts();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.posts).toHaveLength(1);
    expect(json.posts[0].id).toBe("post-id-1");
    expect(json.posts[0].tags).toEqual(["AI"]);
    expect(json.posts[0]._count).toMatchObject({
      likes: 5,
      comments: 3,
      views: 100,
    });
    expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { authorId: "expert-id-1" },
      })
    );
  });

  // 2. Non-expert gets 403
  it("GET /expert/posts - non-expert gets 403", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const res = await getExpertPosts();
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/only experts/i);
  });

  // 3. Unauthenticated gets 401
  it("GET /expert/posts - unauthenticated gets 401", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await getExpertPosts();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toMatch(/unauthorized/i);
  });
});

// ---------------------------------------------------------------------------
// Expert Profile
// ---------------------------------------------------------------------------
describe("Expert Profile API", () => {
  // 4. Expert gets their profile data
  it("GET /expert/profile - expert gets profile data", async () => {
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
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.name).toBe("Expert User");
    expect(json.email).toBe("expert@test.com");
    expect(json.displayName).toBe("Expert User");
    expect(json.specialty).toEqual(["AI", "ML"]);
    expect(json.monthlyPrice).toBe(9.99);
    // expertProfile should be flattened, not nested
    expect(json.expertProfile).toBeUndefined();
  });

  // 5. Non-expert gets 403
  it("GET /expert/profile - non-expert gets 403", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const res = await getExpertProfile();
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/only experts/i);
  });

  // 6. Expert updates profile
  it("PATCH /expert/profile - expert updates profile", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);

    const updatedUser = {
      name: "New Name",
      email: "expert@test.com",
      image: null,
      bio: "Updated bio",
      headline: "Updated headline",
    };
    const updatedProfile = {
      displayName: "New Display",
      specialty: ["AI", "ML", "NLP"],
      monthlyPrice: 14.99,
      socialLinks: null,
    };

    mockPrisma.user.update.mockResolvedValue(updatedUser);
    mockPrisma.expertProfile.update.mockResolvedValue(updatedProfile);

    const req = createPATCH("/api/expert/profile", {
      name: "New Name",
      displayName: "New Display",
      headline: "Updated headline",
      bio: "Updated bio",
      specialty: ["AI", "ML", "NLP"],
      monthlyPrice: 14.99,
    });
    const res = await updateExpertProfile(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.name).toBe("New Name");
    expect(json.displayName).toBe("New Display");
    expect(json.specialty).toEqual(["AI", "ML", "NLP"]);
    expect(json.monthlyPrice).toBe(14.99);
  });

  // 7. Non-expert gets 403 on profile update
  it("PATCH /expert/profile - non-expert gets 403", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const req = createPATCH("/api/expert/profile", { name: "Hack" });
    const res = await updateExpertProfile(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/only experts/i);
  });
});

// ---------------------------------------------------------------------------
// Expert Subscribers
// ---------------------------------------------------------------------------
describe("Expert Subscribers API", () => {
  // 8. Expert lists their subscribers
  it("GET /expert/subscribers - expert lists subscribers", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      id: "profile-id-1",
    });

    const subscriptions = [
      {
        id: "sub-id-1",
        status: "ACTIVE",
        startDate: new Date("2024-01-15"),
        price: 9.99,
        subscriber: {
          id: "subscriber-id-1",
          name: "Subscriber User",
          email: "subscriber@test.com",
          image: null,
        },
      },
    ];
    mockPrisma.expertSubscription.findMany.mockResolvedValue(subscriptions);

    const res = await getSubscribers();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.subscribers).toHaveLength(1);
    expect(json.subscribers[0].id).toBe("subscriber-id-1");
    expect(json.subscribers[0].name).toBe("Subscriber User");
    expect(json.subscribers[0].status).toBe("ACTIVE");
    expect(json.subscribers[0].monthlyAmount).toBe(9.99);
    expect(json.subscribers[0].subscriptionDate).toBeDefined();
  });

  // 9. Non-expert gets 403
  it("GET /expert/subscribers - non-expert gets 403", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const res = await getSubscribers();
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/only experts/i);
  });
});

// ---------------------------------------------------------------------------
// Expert Settings
// ---------------------------------------------------------------------------
describe("Expert Settings API", () => {
  // 10. Expert changes password successfully
  it("PATCH /expert/settings - expert changes password successfully", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    mockPrisma.user.findUnique.mockResolvedValue({
      hashedPassword: "$2a$12$oldhashed",
    });

    (compare as jest.Mock).mockResolvedValue(true);
    mockPrisma.user.update.mockResolvedValue({});

    const req = createPATCH("/api/expert/settings", {
      currentPassword: "OldPassword123",
      newPassword: "NewPassword456",
    });
    const res = await updateSettings(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "expert-id-1" },
      data: { hashedPassword: "$2a$12$newhashed" },
    });
  });

  // 11. Expert enters wrong current password - returns 400
  it("PATCH /expert/settings - wrong current password returns 400", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    mockPrisma.user.findUnique.mockResolvedValue({
      hashedPassword: "$2a$12$oldhashed",
    });

    (compare as jest.Mock).mockResolvedValue(false);

    const req = createPATCH("/api/expert/settings", {
      currentPassword: "WrongPassword",
      newPassword: "NewPassword456",
    });
    const res = await updateSettings(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/current password is incorrect/i);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  // 12. Non-expert gets 403
  it("PATCH /expert/settings - non-expert gets 403", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const req = createPATCH("/api/expert/settings", {
      currentPassword: "abc",
      newPassword: "def",
    });
    const res = await updateSettings(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/only experts/i);
  });

  // GET /expert/settings - returns saved notification preferences
  it("GET /expert/settings - returns saved notification preferences", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    mockPrisma.userSettings.findUnique.mockResolvedValue({
      id: "settings-1",
      userId: "expert-id-1",
      emailOnNewSubscriber: false,
      emailOnComment: true,
      emailOnChat: true,
      emailDigest: "daily",
      twoFactorEnabled: true,
    });

    const res = await getSettings();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.emailOnNewSubscriber).toBe(false);
    expect(json.emailOnComment).toBe(true);
    expect(json.emailOnChat).toBe(true);
    expect(json.emailDigest).toBe("daily");
    expect(json.twoFactorEnabled).toBe(true);
  });

  // PATCH /expert/settings - persists notification preferences
  it("PATCH /expert/settings - persists notification preferences", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    mockPrisma.userSettings.upsert.mockResolvedValue({});

    const req = createPATCH("/api/expert/settings", {
      emailOnNewSubscriber: false,
      emailOnComment: false,
      emailOnChat: true,
      emailDigest: "daily",
      twoFactorEnabled: true,
    });
    const res = await updateSettings(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockPrisma.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId: "expert-id-1" },
      create: expect.objectContaining({
        userId: "expert-id-1",
        emailOnNewSubscriber: false,
        emailOnComment: false,
        emailOnChat: true,
        emailDigest: "daily",
        twoFactorEnabled: true,
      }),
      update: expect.objectContaining({
        emailOnNewSubscriber: false,
        emailOnComment: false,
        emailOnChat: true,
        emailDigest: "daily",
        twoFactorEnabled: true,
      }),
    });
  });
});

// ---------------------------------------------------------------------------
// Knowledge Stats
// ---------------------------------------------------------------------------
describe("Knowledge Stats API", () => {
  // 13. Expert gets knowledge stats
  it("GET /knowledge/stats - expert gets knowledge stats", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.knowledgeItem.count
      .mockResolvedValueOnce(25) // total
      .mockResolvedValueOnce(20); // indexed

    const res = await getKnowledgeStats();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.total).toBe(25);
    expect(json.indexed).toBe(20);
    expect(json.pending).toBe(5);
  });

  // 14. Non-expert gets 403
  it("GET /knowledge/stats - non-expert gets 403", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const res = await getKnowledgeStats();
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/only experts/i);
  });
});

// ---------------------------------------------------------------------------
// Twin Config
// ---------------------------------------------------------------------------
describe("Twin Config API", () => {
  // 15. Expert gets twin config
  it("GET /expert/twin-config - expert gets twin config", async () => {
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

  // 16. Non-expert gets 403
  it("GET /expert/twin-config - non-expert gets 403", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const res = await getTwinConfig();
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toMatch(/only experts/i);
  });

  // 17. Expert updates twin config
  it("PATCH /expert/twin-config - expert updates twin config", async () => {
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
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.twinPersonality).toBe("Updated personality");
    expect(json.twinGreeting).toBe("Updated greeting");
    expect(json.ragEnabled).toBe(false);
    expect(mockPrisma.expertProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockExpertProfile.id },
        data: {
          twinPersonality: "Updated personality",
          twinGreeting: "Updated greeting",
          ragEnabled: false,
        },
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Twin Stats
// ---------------------------------------------------------------------------
describe("Twin Stats API", () => {
  // 18. Expert gets twin stats
  it("GET /expert/twin-stats - expert gets twin stats", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.knowledgeItem.count
      .mockResolvedValueOnce(30)  // totalKnowledgeItems
      .mockResolvedValueOnce(25); // indexedDocuments
    mockPrisma.chatSession.count.mockResolvedValue(15);

    const res = await getTwinStats();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.totalKnowledgeItems).toBe(30);
    expect(json.indexedDocuments).toBe(25);
    expect(json.totalChats).toBe(15);
  });
});
