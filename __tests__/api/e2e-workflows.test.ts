jest.mock("@/lib/knowledge/shared-access", () => ({ canPublishConversation: jest.fn().mockResolvedValue(true) }));
jest.mock("@/lib/knowledge/lifecycle", () => require("../mocks/lifecycle"));
import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import {
  mockUsers,
  mockExpertProfile,
  mockPost,
  mockKnowledgeItem,
  mockSubscription,
  mockChatSession,
  mockReport,
} from "../mocks/data";
import {
  createGET,
  createPOST,
  createPATCH,
  createDELETE,
} from "../helpers/request";

// ─── Module mocks ────────────────────────────────────────────────────────────
jest.mock("@/lib/prisma", () => ({ __esModule: true, default: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: mockAuth }));
jest.mock("@/lib/vector/indexer", () => ({
  indexDocument: jest.fn().mockResolvedValue(["vec-1"]),
  removeDocument: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/ai/chat-engine", () => ({
  runChatEngine: jest.fn(),
}));
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("$2a$12$hashedpassword"),
  compare: jest.fn().mockResolvedValue(true),
}));
jest.mock("@/lib/import/blog-scraper", () => ({
  scrapeBlogContent: jest.fn().mockResolvedValue({
    title: "Scraped Blog Title",
    content: "Scraped blog content here.",
  }),
}));
jest.mock("@/lib/trial", () => ({
  checkTrialAccess: jest.fn().mockResolvedValue({
    allowed: true,
    used: 0,
    limit: 3,
  }),
}));

// ─── Route handler imports ───────────────────────────────────────────────────
import { POST as registerUser } from "@/app/api/auth/register/route";
import {
  GET as getExpertProfile,
  PATCH as updateExpertProfile,
} from "@/app/api/expert/profile/route";
import { GET as getExpertPricing } from "@/app/api/expert/pricing/route";
import {
  GET as listPosts,
  POST as createPost,
} from "@/app/api/posts/route";
import {
  GET as getPost,
  PATCH as updatePost,
} from "@/app/api/posts/[postId]/route";
import { POST as importBlog } from "@/app/api/knowledge/import/blog/route";
import { GET as getWidgetConfig } from "@/app/api/expert/widget/route";
import { GET as listExperts } from "@/app/api/experts/route";
import { GET as getExpertDetail } from "@/app/api/experts/[expertId]/route";
import { GET as getTrialStatus } from "@/app/api/experts/[expertId]/trial-status/route";
import {
  GET as listChatSessions,
  POST as createChatSession,
} from "@/app/api/chat/sessions/route";
import { GET as getExpertPricingPublic } from "@/app/api/experts/[expertId]/pricing/route";
import { POST as toggleSubscribe } from "@/app/api/experts/[expertId]/subscribe/route";
import {
  POST as shareConversation,
} from "@/app/api/chat/sessions/[sessionId]/share/route";
import { GET as getSharedConversation } from "@/app/api/shared/[shareId]/route";
import { POST as toggleBookmark } from "@/app/api/posts/[postId]/bookmark/route";
import { POST as toggleLike } from "@/app/api/posts/[postId]/like/route";
import {
  POST as createComment,
} from "@/app/api/posts/[postId]/comments/route";
import { POST as ragToggle } from "@/app/api/posts/[postId]/rag-toggle/route";
import { GET as adminListUsers } from "@/app/api/admin/users/route";
import {
  GET as adminGetUser,
  PATCH as adminUpdateUser,
} from "@/app/api/admin/users/[userId]/route";
import { GET as adminListContent } from "@/app/api/admin/content/route";
import { PATCH as adminContentAction } from "@/app/api/admin/content/[postId]/route";
import {
  GET as adminListReports,
  PATCH as adminUpdateReport,
} from "@/app/api/admin/reports/route";
import { POST as adminVerifyExpert } from "@/app/api/admin/experts/[expertId]/verify/route";
import { GET as adminAnalytics } from "@/app/api/admin/analytics/route";
import { GET as subscriberFeed } from "@/app/api/subscriber/feed/route";
import { GET as subscriberBookmarks } from "@/app/api/subscriber/bookmarks/route";
import { GET as expertAnalytics } from "@/app/api/expert/analytics/route";
import {
  GET as listKnowledge,
  POST as createKnowledge,
} from "@/app/api/knowledge/route";
import { GET as importHistory } from "@/app/api/knowledge/import/history/route";
import { GET as knowledgeStats } from "@/app/api/knowledge/stats/route";
import { DELETE as deleteKnowledge } from "@/app/api/knowledge/[itemId]/route";

import { syncKnowledgeItem as indexDocument, removeKnowledgeItem as removeDocument, syncPostSource } from "@/lib/knowledge/lifecycle";
import { checkTrialAccess } from "@/lib/trial";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function postParams(postId: string) {
  return { params: Promise.resolve({ postId }) };
}
function expertParams(expertId: string) {
  return { params: Promise.resolve({ expertId }) };
}
function sessionParams(sessionId: string) {
  return { params: Promise.resolve({ sessionId }) };
}
function shareParams(shareId: string) {
  return { params: Promise.resolve({ shareId }) };
}
function userParams(userId: string) {
  return { params: Promise.resolve({ userId }) };
}
function itemParams(itemId: string) {
  return { params: Promise.resolve({ itemId }) };
}

beforeEach(() => {
  resetAllMocks();
  jest.clearAllMocks();
  mockAuth.mockReset();
  (indexDocument as jest.Mock).mockClear();
  (removeDocument as jest.Mock).mockClear();
  (checkTrialAccess as jest.Mock).mockReset();
  (checkTrialAccess as jest.Mock).mockResolvedValue({
    allowed: true,
    used: 0,
    limit: 3,
  });
});

// =============================================================================
// 1. Expert Onboarding Flow
// =============================================================================
describe("E2E: Expert Onboarding Flow", () => {
  it("retired password registration: Step 1 - Register as expert", async () => {
mockPrisma.user.findUnique.mockResolvedValue(null);
const createdUser = {
      ...mockUsers.expert,
      expertProfile: {
        id: "profile-id-1",
        userId: "expert-id-1",
        displayName: "Expert User",
        vectorNamespace: "expert_temp",
      },
    };
mockPrisma.user.create.mockResolvedValue(createdUser);
mockPrisma.expertProfile.update.mockResolvedValue({
      ...createdUser.expertProfile,
      vectorNamespace: "expert_expert_user_expert-i",
    });
const req = createPOST("/api/auth/register", {
      name: "Expert User",
      email: "expert@test.com",
      password: "password123",
      role: "EXPERT",
    });
const res = await registerUser(req);
expect(res.status).toBe(410);
expect((await res.json()).code).toBe("REGISTRATION_RETIRED");
expect(mockPrisma.user.create).not.toHaveBeenCalled();
expect(mockPrisma.expertProfile.create).not.toHaveBeenCalled();
});

  it("Step 2 - Get expert profile", async () => {
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
    expect(json.displayName).toBe("Expert User");
    expect(json.specialty).toEqual(["AI", "ML"]);
  });

  it("Step 3 - Update expert profile", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);

    const updatedUser = {
      name: "Updated Expert",
      email: "expert@test.com",
      image: null,
      bio: "Updated bio",
      headline: "Senior AI Expert",
    };
    const updatedProfile = {
      displayName: "Updated Expert",
      specialty: ["AI", "ML", "NLP"],
      monthlyPrice: 14.99,
      socialLinks: { twitter: "https://twitter.com/expert" },
    };
    mockPrisma.user.update.mockResolvedValue(updatedUser);
    mockPrisma.expertProfile.update.mockResolvedValue(updatedProfile);

    const req = createPATCH("/api/expert/profile", {
      name: "Updated Expert",
      displayName: "Updated Expert",
      bio: "Updated bio",
      headline: "Senior AI Expert",
      specialty: ["AI", "ML", "NLP"],
      monthlyPrice: 14.99,
      socialLinks: { twitter: "https://twitter.com/expert" },
    });
    const res = await updateExpertProfile(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.displayName).toBe("Updated Expert");
    expect(json.specialty).toContain("NLP");
    expect(json.monthlyPrice).toBe(14.99);
  });

  it("Step 4 - Set up pricing tiers (creates defaults)", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    // First findMany returns empty array (no tiers yet)
    mockPrisma.expertPricingTier.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "tier-1", tier: "FREE", price: 0, expertProfileId: "profile-id-1" },
        { id: "tier-2", tier: "STANDARD", price: 9.99, expertProfileId: "profile-id-1" },
        { id: "tier-3", tier: "PREMIUM", price: 29.99, expertProfileId: "profile-id-1" },
      ]);
    mockPrisma.expertPricingTier.create.mockResolvedValue({});

    const res = await getExpertPricing();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.tiers).toHaveLength(2);
    // Only FREE and PREMIUM are offered; STANDARD is legacy.
    expect(mockPrisma.expertPricingTier.create).toHaveBeenCalledTimes(2);
  });

  it("Step 5 - Create first post", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.tag.upsert.mockResolvedValue({ id: "tag-1", name: "AI", slug: "ai" });
    const createdPost = {
      ...mockPost,
      tags: [{ tag: { id: "tag-1", name: "AI", slug: "ai" } }],
    };
    mockPrisma.post.create.mockResolvedValue(createdPost);

    const req = createPOST("/api/posts", {
      title: "My First Post",
      content: "This is my first expert post about AI.",
      status: "PUBLISHED",
      tags: ["AI"],
      media: [],
    });
    const res = await createPost(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.id).toBe("post-id-1");
    expect(json.tags).toContain("AI");
  });

  it("Step 6 - Import blog content", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.importJob.create.mockResolvedValue({
      id: "import-1",
      status: "PENDING",
    });
    mockPrisma.importJob.update.mockResolvedValue({});
    mockPrisma.knowledgeItem.create.mockResolvedValue({
      id: "ki-1",
      title: "Scraped Blog Title",
    });
    mockPrisma.knowledgeItem.update.mockResolvedValue({});

    const req = createPOST("/api/knowledge/import/blog", {
      urls: ["https://example.com/blog-post"],
    });
    const res = await importBlog(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    expect(json[0].status).toBe("success");
    expect(json[0].title).toBe("Scraped Blog Title");
    expect(indexDocument).toHaveBeenCalled();
  });

  it("Step 7 - Configure widget (creates defaults)", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.user.findUnique.mockResolvedValue({ role: "EXPERT" });
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    // No existing widget config
    mockPrisma.widgetConfig.findUnique.mockResolvedValue(null);
    const widgetConfig = {
      id: "widget-1",
      expertProfileId: "profile-id-1",
      greeting: "Hello! Ask me about AI.",
      apiKey: "wk_test123",
      primaryColor: "#000000",
      position: "bottom-right",
      isEnabled: true,
    };
    mockPrisma.widgetConfig.create.mockResolvedValue(widgetConfig);

    const res = await getWidgetConfig();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.apiKey).toBe("wk_test123");
    expect(json.embedCode).toContain("wk_test123");
    expect(json.greeting).toBe("Hello! Ask me about AI.");
  });
});

// =============================================================================
// 2. Subscriber Journey Flow
// =============================================================================
describe("E2E: Subscriber Journey Flow", () => {
  it("retired password registration: Step 1 - Register as subscriber", async () => {
mockPrisma.user.findUnique.mockResolvedValue(null);
const createdUser = {
      ...mockUsers.subscriber,
      expertProfile: null,
    };
mockPrisma.user.create.mockResolvedValue(createdUser);
const req = createPOST("/api/auth/register", {
      name: "Subscriber User",
      email: "subscriber@test.com",
      password: "password123",
      role: "SUBSCRIBER",
    });
const res = await registerUser(req);
expect(res.status).toBe(410);
expect((await res.json()).code).toBe("REGISTRATION_RETIRED");
expect(mockPrisma.user.create).not.toHaveBeenCalled();
expect(mockPrisma.expertProfile.create).not.toHaveBeenCalled();
});

  it("Step 2 - Browse experts", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: "expert-id-1",
        name: "Expert User",
        image: null,
        bio: "Expert bio",
        headline: "AI Expert",
        expertProfile: {
          id: "profile-id-1",
          displayName: "Expert User",
          specialty: ["AI"],
          monthlyPrice: 9.99,
          isVerified: true,
          totalSubscribers: 10,
          twinGreeting: "Hello!",
        },
        _count: { posts: 5, subscriptionsAsSubscriber: 0 },
      },
    ]);
    mockPrisma.user.count.mockResolvedValue(1);

    const req = createGET("/api/experts");
    const res = await listExperts(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.experts).toHaveLength(1);
    expect(json.experts[0].expertProfile.displayName).toBe("Expert User");
    expect(json.pagination.total).toBe(1);
  });

  it("Step 3 - View expert detail", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "expert-id-1",
      name: "Expert User",
      image: null,
      bio: "Expert bio",
      headline: "AI Expert",
      createdAt: new Date("2024-01-01"),
      expertProfile: {
        id: "profile-id-1",
        displayName: "Expert User",
        specialty: ["AI"],
        socialLinks: null,
        monthlyPrice: 9.99,
        isVerified: true,
        totalSubscribers: 10,
        ragEnabled: true,
        twinPersonality: "I am an AI expert",
        twinGreeting: "Hello!",
      },
      posts: [],
      _count: { posts: 5 },
    });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue(null);

    const req = createGET("/api/experts/expert-id-1");
    const res = await getExpertDetail(req, expertParams("expert-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.displayName).toBe("Expert User");
    expect(json.isSubscribed).toBe(false);
    expect(json.expertProfileId).toBe("profile-id-1");
  });

  it("Step 4 - Check trial status (has access)", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.expertSubscription.findUnique.mockResolvedValue(null);
    (checkTrialAccess as jest.Mock).mockResolvedValue({
      allowed: true,
      used: 0,
      limit: 3,
    });

    const req = createGET("/api/experts/expert-id-1/trial-status");
    const res = await getTrialStatus(req, expertParams("expert-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.hasTrialAccess).toBe(true);
    expect(json.hasSubscription).toBe(false);
    expect(json.questionsUsed).toBe(0);
    expect(json.questionsAllowed).toBe(3);
  });

  it("Step 5 - Create trial chat session", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      user: { name: "Expert User" },
    });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue(null);
    (checkTrialAccess as jest.Mock).mockResolvedValue({
      allowed: true,
      used: 0,
      limit: 3,
    });
    const chatSession = {
      id: "session-trial-1",
      subscriberId: "subscriber-id-1",
      expertProfileId: "profile-id-1",
      isTrial: true,
      title: "Chat with Expert User",
      expertProfile: {
        displayName: "Expert User",
        twinGreeting: "Hello!",
        user: { id: "expert-id-1", name: "Expert User", image: null },
      },
    };
    mockPrisma.chatSession.create.mockResolvedValue(chatSession);
    mockPrisma.chatMessage.create.mockResolvedValue({});

    const req = createPOST("/api/chat/sessions", {
      expertId: "expert-id-1",
    });
    const res = await createChatSession(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.isTrial).toBe(true);
    expect(json.expertProfile.displayName).toBe("Expert User");
  });

  it("Step 6 - View pricing tiers", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    const tiers = [
      { id: "t-1", tier: "FREE", price: 0, isActive: true },
      { id: "t-2", tier: "STANDARD", price: 9.99, isActive: true },
      { id: "t-3", tier: "PREMIUM", price: 29.99, isActive: true },
    ];
    mockPrisma.expertPricingTier.findMany.mockResolvedValue(tiers);

    const req = createGET("/api/experts/expert-id-1/pricing");
    const res = await getExpertPricingPublic(req, expertParams("expert-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.tiers).toHaveLength(2);
  });

  it("Step 7 - Paid tier requires payment before access", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique
      .mockResolvedValueOnce({
        ...mockExpertProfile,
        user: { name: "Expert User" },
      })
      .mockResolvedValueOnce({ totalSubscribers: 11 });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue(null); // no existing sub
    mockPrisma.expertPricingTier.findUnique.mockResolvedValue({
      id: "t-2",
      tier: "STANDARD",
      price: 9.99,
    });
    mockPrisma.expertSubscription.create.mockResolvedValue({});
    mockPrisma.expertProfile.update.mockResolvedValue({});
    mockPrisma.notification.create.mockResolvedValue({});

    const req = createPOST("/api/experts/expert-id-1/subscribe", {
      tier: "STANDARD",
    });
    const res = await toggleSubscribe(req, expertParams("expert-id-1"));
    const json = await res.json();

    expect(res.status).toBe(402);
    expect(json.requiresPayment).toBe(true);
    expect(mockPrisma.expertSubscription.create).not.toHaveBeenCalled();
  });

  it("Step 8 - Create full (non-trial) chat session after subscribing", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      user: { name: "Expert User" },
    });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue({
      ...mockSubscription,
      status: "ACTIVE",
    });
    const chatSession = {
      id: "session-full-1",
      subscriberId: "subscriber-id-1",
      expertProfileId: "profile-id-1",
      isTrial: false,
      title: "Chat with Expert User",
      expertProfile: {
        displayName: "Expert User",
        twinGreeting: "Hello!",
        user: { id: "expert-id-1", name: "Expert User", image: null },
      },
    };
    mockPrisma.chatSession.create.mockResolvedValue(chatSession);
    mockPrisma.chatMessage.create.mockResolvedValue({});

    const req = createPOST("/api/chat/sessions", {
      expertId: "expert-id-1",
    });
    const res = await createChatSession(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.isTrial).toBe(false);
    // checkTrialAccess should NOT have been called since user has active subscription
    expect(checkTrialAccess).not.toHaveBeenCalled();
  });

  it("Step 9 - Share conversation", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.chatSession.findUnique.mockResolvedValue({
      id: "session-full-1",
      subscriberId: "subscriber-id-1",
      sharedConversation: null,
    });
    mockPrisma.sharedConversation.create.mockResolvedValue({
      id: "shared-1",
      shareId: "share-abc123",
      chatSessionId: "session-full-1",
      sharedById: "subscriber-id-1",
      isActive: true,
    });

    const req = createPOST("/api/chat/sessions/session-full-1/share", {});
    const res = await shareConversation(req, sessionParams("session-full-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isShared).toBe(true);
    expect(json.shareId).toBe("share-abc123");
    expect(json.shareUrl).toBe("/shared/share-abc123");
  });

  it("Step 10 - View shared conversation", async () => {
    mockPrisma.sharedConversation.findUnique.mockResolvedValue({
      id: "shared-1",
      shareId: "share-abc123",
      isActive: true,
      chatSession: {
        id: "session-full-1",
        messages: [
          { id: "msg-1", role: "assistant", content: "Hello!", createdAt: new Date() },
        ],
        expertProfile: {
          displayName: "Expert User",
          user: { name: "Expert User", image: null },
        },
      },
    });

    const req = createGET("/api/shared/share-abc123");
    const res = await getSharedConversation(req, shareParams("share-abc123"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.chatSession.messages).toHaveLength(1);
    expect(json.chatSession.expertProfile.displayName).toBe("Expert User");
  });

  it("Step 11 - Bookmark a post", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.post.findUnique.mockResolvedValue(mockPost);
    mockPrisma.bookmark.findUnique.mockResolvedValue(null); // not bookmarked
    mockPrisma.bookmark.create.mockResolvedValue({});
    mockPrisma.bookmark.count.mockResolvedValue(3);

    const req = createPOST("/api/posts/post-id-1/bookmark", {});
    const res = await toggleBookmark(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isBookmarked).toBe(true);
    expect(json.bookmarkCount).toBe(3);
  });

  it("Step 12 - Like a post", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.post.findUnique.mockResolvedValue(mockPost);
    mockPrisma.like.findUnique.mockResolvedValue(null); // not liked
    mockPrisma.like.create.mockResolvedValue({});
    mockPrisma.like.count.mockResolvedValue(6);

    const req = createPOST("/api/posts/post-id-1/like", {});
    const res = await toggleLike(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isLiked).toBe(true);
    expect(json.likeCount).toBe(6);
  });

  it("Step 13 - Add comment", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.post.findUnique.mockResolvedValue(mockPost);
    const createdComment = {
      id: "comment-1",
      content: "Great post!",
      userId: "subscriber-id-1",
      postId: "post-id-1",
      parentId: null,
      createdAt: new Date(),
      user: { id: "subscriber-id-1", name: "Subscriber User", image: null },
    };
    mockPrisma.comment.create.mockResolvedValue(createdComment);
    mockPrisma.notification.create.mockResolvedValue({});

    const req = createPOST("/api/posts/post-id-1/comments", {
      content: "Great post!",
    });
    const res = await createComment(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.content).toBe("Great post!");
    expect(json.user.name).toBe("Subscriber User");
    // Should create notification for post author
    expect(mockPrisma.notification.create).toHaveBeenCalled();
  });

  it("Step 14 - Unsubscribe", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique
      .mockResolvedValueOnce({
        ...mockExpertProfile,
        user: { name: "Expert User" },
      })
      .mockResolvedValueOnce({ totalSubscribers: 9 });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue({
      ...mockSubscription,
      status: "ACTIVE",
    });
    mockPrisma.expertSubscription.update.mockResolvedValue({});
    mockPrisma.expertProfile.update.mockResolvedValue({});

    const req = createPOST("/api/experts/expert-id-1/subscribe", {});
    const res = await toggleSubscribe(req, expertParams("expert-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isSubscribed).toBe(false);
    expect(json.totalSubscribers).toBe(9);
  });
});

// =============================================================================
// 3. Admin Moderation Flow
// =============================================================================
describe("E2E: Admin Moderation Flow", () => {
  it("Step 1 - List all users", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: "expert-id-1",
        name: "Expert User",
        email: "expert@test.com",
        image: null,
        role: "EXPERT",
        isActive: true,
        isBanned: false,
        createdAt: new Date(),
        expertProfile: { displayName: "Expert User", totalSubscribers: 10, isVerified: true },
        _count: { posts: 5, subscriptionsAsSubscriber: 0 },
      },
    ]);
    mockPrisma.user.count.mockResolvedValue(1);

    const req = createGET("/api/admin/users");
    const res = await adminListUsers(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.users).toHaveLength(1);
    expect(json.pagination.total).toBe(1);
  });

  it("Step 2 - View user detail", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "expert-id-1",
      name: "Expert User",
      email: "expert@test.com",
      image: null,
      role: "EXPERT",
      isBanned: false,
      isActive: true,
      bio: "Expert bio",
      headline: "AI Expert",
      createdAt: new Date(),
      _count: { posts: 5, subscriptionsAsSubscriber: 0 },
      posts: [
        {
          id: "post-id-1",
          title: "Test Post",
          content: "Content",
          status: "PUBLISHED",
          createdAt: new Date(),
        },
      ],
    });

    const req = createGET("/api/admin/users/expert-id-1");
    const res = await adminGetUser(req, userParams("expert-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.name).toBe("Expert User");
    expect(json.status).toBe("active");
    expect(json.recentPosts).toHaveLength(1);
  });

  it("Step 3 - Ban a user", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.user.findUnique.mockResolvedValue(mockUsers.expert);
    mockPrisma.user.update.mockResolvedValue({
      ...mockUsers.expert,
      isBanned: true,
    });

    const req = createPATCH("/api/admin/users/expert-id-1", {
      isBanned: true,
    });
    const res = await adminUpdateUser(req, userParams("expert-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isBanned).toBe(true);
  });

  it("Step 4 - Unban a user", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.user.findUnique.mockResolvedValue({
      ...mockUsers.expert,
      isBanned: true,
    });
    mockPrisma.user.update.mockResolvedValue({
      ...mockUsers.expert,
      isBanned: false,
    });

    const req = createPATCH("/api/admin/users/expert-id-1", {
      isBanned: false,
    });
    const res = await adminUpdateUser(req, userParams("expert-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isBanned).toBe(false);
  });

  it("Step 5 - Change user role to EXPERT", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.user.findUnique.mockResolvedValue(mockUsers.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(null); // no existing profile
    mockPrisma.expertProfile.create.mockResolvedValue({
      id: "new-profile-1",
      userId: "subscriber-id-1",
      displayName: "Subscriber User",
      vectorNamespace: "expert_subscriber-id-1",
    });
    mockPrisma.user.update.mockResolvedValue({
      ...mockUsers.subscriber,
      role: "EXPERT",
      expertProfile: {
        id: "new-profile-1",
        userId: "subscriber-id-1",
        displayName: "Subscriber User",
      },
    });

    const req = createPATCH("/api/admin/users/subscriber-id-1", {
      role: "EXPERT",
    });
    const res = await adminUpdateUser(req, userParams("subscriber-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.role).toBe("EXPERT");
    // Should have created an expert profile
    expect(mockPrisma.expertProfile.create).toHaveBeenCalled();
  });

  it("Step 6 - List content", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.post.findMany.mockResolvedValue([
      {
        id: "post-id-1",
        title: "Test Post",
        content: "Content",
        status: "PUBLISHED",
        isHidden: false,
        createdAt: new Date(),
        author: { id: "expert-id-1", name: "Expert User", image: null },
        _count: { likes: 5, comments: 3 },
      },
    ]);
    mockPrisma.post.count.mockResolvedValue(1);
    mockPrisma.report.groupBy.mockResolvedValue([]);

    const req = createGET("/api/admin/content");
    const res = await adminListContent(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.posts).toHaveLength(1);
    expect(json.posts[0].status).toBe("PUBLISHED");
    expect(json.pagination.total).toBe(1);
  });

  it("Step 7 - Archive a post", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.post.findUnique.mockResolvedValue(mockPost);
    mockPrisma.post.update.mockResolvedValue({
      id: "post-id-1",
      title: "Test Post",
      status: "ARCHIVED",
      isHidden: false,
    });

    const req = createPATCH("/api/admin/content/post-id-1", {
      action: "archive",
    });
    const res = await adminContentAction(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("ARCHIVED");
  });

  it("Step 8 - Restore a post", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.post.findUnique.mockResolvedValue({
      ...mockPost,
      status: "ARCHIVED",
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
    const res = await adminContentAction(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("PUBLISHED");
  });

  it("Step 9 - List reports", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.report.findMany.mockResolvedValue([
      {
        ...mockReport,
        reporter: { id: "subscriber-id-1", name: "Subscriber User", email: "sub@test.com", image: null },
        reported: { id: "expert-id-1", name: "Expert User", email: "expert@test.com", image: null },
      },
    ]);
    mockPrisma.report.count.mockResolvedValue(1);
    mockPrisma.post.findMany.mockResolvedValue([
      {
        id: "post-id-1",
        title: "Test Post",
        content: "Content",
        author: { name: "Expert User" },
      },
    ]);

    const req = createGET("/api/admin/reports");
    const res = await adminListReports(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.reports).toHaveLength(1);
    expect(json.reports[0].status).toBe("PENDING");
    expect(json.pagination.total).toBe(1);
  });

  it("Step 10 - Resolve a report", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.report.findUnique.mockResolvedValue(mockReport);
    mockPrisma.report.update.mockResolvedValue({
      ...mockReport,
      status: "RESOLVED",
      adminNotes: "Reviewed and resolved",
      reporter: { id: "subscriber-id-1", name: "Subscriber User", email: "sub@test.com" },
      reported: { id: "expert-id-1", name: "Expert User", email: "expert@test.com" },
    });

    const req = createPATCH("/api/admin/reports", {
      reportId: "report-id-1",
      status: "RESOLVED",
      adminNotes: "Reviewed and resolved",
    });
    const res = await adminUpdateReport(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("RESOLVED");
  });

  it("Step 11 - Verify an expert", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      isVerified: false,
    });
    mockPrisma.expertProfile.update.mockResolvedValue({
      ...mockExpertProfile,
      isVerified: true,
    });

    const req = createPOST("/api/admin/experts/expert-id-1/verify", {
      verified: true,
    });
    const res = await adminVerifyExpert(req, expertParams("expert-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isVerified).toBe(true);
    expect(json.id).toBe("expert-id-1");
  });

  it("Step 12 - View analytics", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.user.count
      .mockResolvedValueOnce(100)   // totalUsers
      .mockResolvedValueOnce(20)    // activeExperts
      .mockResolvedValueOnce(60)    // totalSubscribers
      .mockResolvedValueOnce(10)    // prevUsers
      .mockResolvedValueOnce(15)    // prevExperts
      .mockResolvedValueOnce(15)    // recentUserCount
      .mockResolvedValueOnce(5);    // recentPostCount -> but we need more
    mockPrisma.post.count
      .mockResolvedValueOnce(200)   // totalPosts
      .mockResolvedValueOnce(5)     // prevPosts
      .mockResolvedValueOnce(20)    // recentPostCount
      ;
    mockPrisma.expertSubscription.count
      .mockResolvedValueOnce(50)    // activeSubscriptions
      .mockResolvedValueOnce(8)     // prevSubscriptions
      .mockResolvedValueOnce(12)    // recentSubCount
      ;
    mockPrisma.user.findMany.mockResolvedValue([]); // recentSignups
    mockPrisma.post.groupBy.mockResolvedValue([]);   // recentPosts
    mockPrisma.expertSubscription.aggregate.mockResolvedValue({
      _sum: { price: 499.50 },
    });
    // recount for recent
    mockPrisma.user.count.mockResolvedValue(15);
    mockPrisma.post.count.mockResolvedValue(20);
    mockPrisma.expertSubscription.count.mockResolvedValue(12);

    const res = await adminAnalytics();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.totalUsers).toBeDefined();
    expect(json.activeExperts).toBeDefined();
    expect(json.totalPosts).toBeDefined();
    expect(json.trends).toBeDefined();
    expect(json.subscriptionRevenue).toBeDefined();
  });
});

// =============================================================================
// 4. Content Lifecycle Flow
// =============================================================================
describe("E2E: Content Lifecycle Flow", () => {
  it("Step 1 - Expert creates a post with media", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.tag.upsert.mockResolvedValue({ id: "tag-1", name: "AI", slug: "ai" });
    const postWithMedia = {
      ...mockPost,
      media: [
        { id: "media-1", type: "IMAGE", url: "https://example.com/img.png", order: 0 },
      ],
      tags: [{ tag: { id: "tag-1", name: "AI", slug: "ai" } }],
    };
    mockPrisma.post.create.mockResolvedValue(postWithMedia);

    const req = createPOST("/api/posts", {
      title: "Post with Media",
      content: "Check out this image.",
      status: "PUBLISHED",
      tags: ["AI"],
      media: [{ type: "IMAGE", url: "https://example.com/img.png", order: 0 }],
    });
    const res = await createPost(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.media).toHaveLength(1);
    expect(json.media[0].type).toBe("IMAGE");
  });

  it("Step 2 - Expert creates a premium post", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.tag.upsert.mockResolvedValue({ id: "tag-2", name: "Premium", slug: "premium" });
    const premiumPost = {
      ...mockPost,
      id: "post-premium-1",
      isPremiumOnly: true,
      tags: [{ tag: { id: "tag-2", name: "Premium", slug: "premium" } }],
    };
    mockPrisma.post.create.mockResolvedValue(premiumPost);

    const req = createPOST("/api/posts", {
      title: "Premium Content",
      content: "Exclusive content for premium subscribers.",
      status: "PUBLISHED",
      isPremiumOnly: true,
      tags: ["Premium"],
      media: [],
    });
    const res = await createPost(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.isPremiumOnly).toBe(true);
  });

  it("Step 3 - Expert archives a post", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.post.findUnique.mockResolvedValue({
      ...mockPost,
      authorId: "expert-id-1",
    });
    mockPrisma.tag.upsert.mockResolvedValue({ id: "tag-1", name: "AI", slug: "ai" });
    mockPrisma.post.update.mockResolvedValue({
      ...mockPost,
      status: "ARCHIVED",
      author: { id: "expert-id-1", name: "Expert User", image: null },
      media: [],
      tags: [{ tag: { id: "tag-1", name: "AI", slug: "ai" } }],
      _count: { likes: 5, comments: 3, bookmarks: 2 },
    });

    const req = createPATCH("/api/posts/post-id-1", {
      status: "ARCHIVED",
    });
    const res = await updatePost(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("ARCHIVED");
  });

  it("Step 4 - Expert toggles RAG on", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.post.findUnique.mockResolvedValue({
      ...mockPost,
      isRagEnabled: false,
      authorId: "expert-id-1",
    });
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.knowledgeItem.create.mockResolvedValue({
      id: "ki-rag-1",
    });
    mockPrisma.post.update.mockResolvedValue({
      ...mockPost,
      isRagEnabled: true,
    });

    const req = createPOST("/api/posts/post-id-1/rag-toggle", {});
    const res = await ragToggle(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isRagEnabled).toBe(true);
    expect(json.message).toBe("Post added to knowledge base");
    expect(syncPostSource).toHaveBeenCalledWith("post-id-1");
  });

  it("Step 5 - Subscriber views feed", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertSubscription.findMany.mockResolvedValue([
      { expertProfile: { userId: "expert-id-1" } },
    ]);
    const feedPost = {
      ...mockPost,
      tags: [{ tag: { id: "tag-1", name: "AI", slug: "ai" } }],
    };
    mockPrisma.post.findMany.mockResolvedValue([feedPost]);
    mockPrisma.post.count.mockResolvedValue(1);

    const req = createGET("/api/subscriber/feed");
    const res = await subscriberFeed(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.posts).toHaveLength(1);
    expect(json.pagination.total).toBe(1);
  });

  it("Step 6 - Subscriber bookmarks a post", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.post.findUnique.mockResolvedValue(mockPost);
    mockPrisma.bookmark.findUnique.mockResolvedValue(null);
    mockPrisma.bookmark.create.mockResolvedValue({});
    mockPrisma.bookmark.count.mockResolvedValue(1);

    const req = createPOST("/api/posts/post-id-1/bookmark", {});
    const res = await toggleBookmark(req, postParams("post-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isBookmarked).toBe(true);
  });

  it("Step 7 - Subscriber views bookmarks", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.bookmark.findMany.mockResolvedValue([
      { postId: "post-id-1" },
    ]);
    mockPrisma.bookmark.count.mockResolvedValue(1);
    mockPrisma.post.findMany.mockResolvedValue([
      {
        ...mockPost,
        tags: [{ tag: { id: "tag-1", name: "AI", slug: "ai" } }],
        author: {
          id: "expert-id-1",
          name: "Expert User",
          image: null,
          expertProfile: { displayName: "Expert User", isVerified: true },
        },
        media: [],
        _count: { likes: 5, comments: 3, bookmarks: 2 },
      },
    ]);

    const req = createGET("/api/subscriber/bookmarks");
    const res = await subscriberBookmarks(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.posts).toHaveLength(1);
    expect(json.pagination.total).toBe(1);
  });

  it("Step 8 - Expert views post analytics", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      id: "profile-id-1",
      userId: "expert-id-1",
    });
    mockPrisma.expertSubscription.count
      .mockResolvedValueOnce(50)    // totalSubscribers
      .mockResolvedValueOnce(30);   // activeSubscribers
    mockPrisma.expertSubscription.aggregate
      .mockResolvedValueOnce({ _sum: { price: 500 } })  // totalRevenue
      .mockResolvedValueOnce({ _sum: { price: 100 } }); // periodRevenue
    mockPrisma.twinInteraction.count
      .mockResolvedValueOnce(200)   // totalTwinQuestions
      .mockResolvedValueOnce(50);   // periodTwinQuestions
    mockPrisma.twinInteraction.aggregate.mockResolvedValue({
      _avg: { answerQuality: 4.5 },
    });
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([])    // subscriberGrowth
      .mockResolvedValueOnce([])    // revenueOverTime
      .mockResolvedValueOnce([]);   // twinUsage
    mockPrisma.post.findMany.mockResolvedValue([
      {
        id: "post-id-1",
        title: "Top Post",
        viewCount: 100,
        createdAt: new Date("2024-01-01"),
        _count: { likes: 10, comments: 5 },
      },
    ]);

    const req = createGET("/api/expert/analytics");
    const res = await expertAnalytics(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.overview).toBeDefined();
    expect(json.overview.totalSubscribers).toBe(50);
    expect(json.overview.activeSubscribers).toBe(30);
    expect(json.contentPerformance).toHaveLength(1);
    expect(json.contentPerformance[0].title).toBe("Top Post");
  });
});

// =============================================================================
// 5. Knowledge Management Flow
// =============================================================================
describe("E2E: Knowledge Management Flow", () => {
  it("Step 1 - Expert creates manual knowledge item", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    const created = {
      id: "ki-manual-1",
      expertProfileId: "profile-id-1",
      title: "Manual Knowledge",
      content: "This is manual knowledge content.",
      sourceType: "manual",
      isIndexed: false,
      vectorIds: [],
      createdAt: new Date(),
    };
    mockPrisma.knowledgeItem.create.mockResolvedValue(created);
    mockPrisma.knowledgeItem.update.mockResolvedValue({
      ...created,
      isIndexed: true,
      vectorIds: ["vec-1"],
    });

    const req = createPOST("/api/knowledge", {
      title: "Manual Knowledge",
      content: "This is manual knowledge content.",
      sourceType: "manual",
    });
    const res = await createKnowledge(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.isIndexed).toBe(true);
    expect(json.vectorIds).toContain("vec-1");
    expect(indexDocument).toHaveBeenCalled();
  });

  it("Step 2 - Expert imports blog URLs", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.importJob.create.mockResolvedValue({ id: "import-1", status: "PENDING" });
    mockPrisma.importJob.update.mockResolvedValue({});
    mockPrisma.knowledgeItem.create.mockResolvedValue({ id: "ki-blog-1" });
    mockPrisma.knowledgeItem.update.mockResolvedValue({});

    const req = createPOST("/api/knowledge/import/blog", {
      urls: [
        "https://example.com/blog-1",
        "https://example.com/blog-2",
      ],
    });
    const res = await importBlog(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(2);
    expect(json[0].status).toBe("success");
    expect(json[1].status).toBe("success");
    expect(indexDocument).toHaveBeenCalledTimes(2);
  });

  it("Step 3 - Expert views import history", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.importJob.findMany.mockResolvedValue([
      {
        id: "import-1",
        sourceType: "BLOG_URL",
        sourceUrl: "https://example.com/blog-1",
        status: "COMPLETED",
        itemsCreated: 1,
        createdAt: new Date(),
      },
    ]);
    mockPrisma.importJob.count.mockResolvedValue(1);

    const req = createGET("/api/knowledge/import/history");
    const res = await importHistory(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.items).toHaveLength(1);
    expect(json.items[0].status).toBe("COMPLETED");
    expect(json.total).toBe(1);
  });

  it("Step 4 - Expert views knowledge stats", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.knowledgeItem.count
      .mockResolvedValueOnce(10)  // total
      .mockResolvedValueOnce(8);  // indexed

    const res = await knowledgeStats();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.total).toBe(10);
    expect(json.indexed).toBe(8);
    expect(json.pending).toBe(2);
  });

  it("Step 5 - Expert deletes knowledge item", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.knowledgeItem.findUnique.mockResolvedValue({
      ...mockKnowledgeItem,
      expertProfile: mockExpertProfile,
    });
    mockPrisma.knowledgeItem.delete.mockResolvedValue({});

    const req = createDELETE("/api/knowledge/knowledge-id-1");
    const res = await deleteKnowledge(req, itemParams("knowledge-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("Knowledge item deleted successfully");
    expect(removeDocument).toHaveBeenCalledWith("profile-id-1", "knowledge-id-1");
  });
});

// =============================================================================
// 6. Access Control Tests
// =============================================================================
describe("E2E: Access Control Tests", () => {
  describe("Subscriber cannot access expert routes", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession.subscriber);
    });

    it("GET /api/expert/profile returns 403", async () => {
      const res = await getExpertProfile();
      expect(res.status).toBe(403);
    });

    it("PATCH /api/expert/profile returns 403", async () => {
      const req = createPATCH("/api/expert/profile", { name: "hack" });
      const res = await updateExpertProfile(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/expert/pricing returns 403", async () => {
      const res = await getExpertPricing();
      expect(res.status).toBe(403);
    });

    it("POST /api/posts (create post) returns 403", async () => {
      const req = createPOST("/api/posts", {
        content: "Subscriber trying to post",
        tags: [],
        media: [],
      });
      const res = await createPost(req);
      expect(res.status).toBe(403);
    });

    it("POST /api/knowledge returns 403", async () => {
      const req = createPOST("/api/knowledge", {
        title: "Hack",
        content: "Should not work",
      });
      const res = await createKnowledge(req);
      expect(res.status).toBe(403);
    });

    it("POST /api/knowledge/import/blog returns 403", async () => {
      const req = createPOST("/api/knowledge/import/blog", {
        urls: ["https://example.com"],
      });
      const res = await importBlog(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/knowledge/import/history returns 403", async () => {
      const req = createGET("/api/knowledge/import/history");
      const res = await importHistory(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/knowledge/stats returns 403", async () => {
      const res = await knowledgeStats();
      expect(res.status).toBe(403);
    });

    it("POST /api/posts/[postId]/rag-toggle returns 403", async () => {
      const req = createPOST("/api/posts/post-id-1/rag-toggle", {});
      const res = await ragToggle(req, postParams("post-id-1"));
      expect(res.status).toBe(403);
    });

    it("GET /api/expert/analytics returns 403", async () => {
      const req = createGET("/api/expert/analytics");
      const res = await expertAnalytics(req);
      expect(res.status).toBe(403);
    });
  });

  describe("Expert cannot access admin routes", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession.expert);
    });

    it("GET /api/admin/users returns 403", async () => {
      const req = createGET("/api/admin/users");
      const res = await adminListUsers(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/admin/users/[userId] returns 403", async () => {
      const req = createGET("/api/admin/users/subscriber-id-1");
      const res = await adminGetUser(req, userParams("subscriber-id-1"));
      expect(res.status).toBe(403);
    });

    it("PATCH /api/admin/users/[userId] returns 403", async () => {
      const req = createPATCH("/api/admin/users/subscriber-id-1", {
        isBanned: true,
      });
      const res = await adminUpdateUser(req, userParams("subscriber-id-1"));
      expect(res.status).toBe(403);
    });

    it("GET /api/admin/content returns 403", async () => {
      const req = createGET("/api/admin/content");
      const res = await adminListContent(req);
      expect(res.status).toBe(403);
    });

    it("PATCH /api/admin/content/[postId] returns 403", async () => {
      const req = createPATCH("/api/admin/content/post-id-1", {
        action: "archive",
      });
      const res = await adminContentAction(req, postParams("post-id-1"));
      expect(res.status).toBe(403);
    });

    it("GET /api/admin/reports returns 403", async () => {
      const req = createGET("/api/admin/reports");
      const res = await adminListReports(req);
      expect(res.status).toBe(403);
    });

    it("PATCH /api/admin/reports returns 403", async () => {
      const req = createPATCH("/api/admin/reports", {
        reportId: "report-id-1",
        status: "RESOLVED",
      });
      const res = await adminUpdateReport(req);
      expect(res.status).toBe(403);
    });

    it("POST /api/admin/experts/[expertId]/verify returns 403", async () => {
      const req = createPOST("/api/admin/experts/expert-id-1/verify", {});
      const res = await adminVerifyExpert(req, expertParams("expert-id-1"));
      expect(res.status).toBe(403);
    });

    it("GET /api/admin/analytics returns 403", async () => {
      const res = await adminAnalytics();
      expect(res.status).toBe(403);
    });
  });

  describe("Unauthenticated user gets 401 on protected routes", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(null);
    });

    it("GET /api/expert/profile returns 401", async () => {
      const res = await getExpertProfile();
      expect(res.status).toBe(401);
    });

    it("PATCH /api/expert/profile returns 401", async () => {
      const req = createPATCH("/api/expert/profile", { name: "test" });
      const res = await updateExpertProfile(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/expert/pricing returns 401", async () => {
      const res = await getExpertPricing();
      expect(res.status).toBe(401);
    });

    it("POST /api/posts returns 401", async () => {
      const req = createPOST("/api/posts", {
        content: "test",
        tags: [],
        media: [],
      });
      const res = await createPost(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/experts/[expertId]/trial-status returns 401", async () => {
      const req = createGET("/api/experts/expert-id-1/trial-status");
      const res = await getTrialStatus(req, expertParams("expert-id-1"));
      expect(res.status).toBe(401);
    });

    it("POST /api/chat/sessions returns 401", async () => {
      const req = createPOST("/api/chat/sessions", {
        expertId: "expert-id-1",
      });
      const res = await createChatSession(req);
      expect(res.status).toBe(401);
    });

    it("POST /api/experts/[expertId]/subscribe returns 401", async () => {
      const req = createPOST("/api/experts/expert-id-1/subscribe", {
        tier: "STANDARD",
      });
      const res = await toggleSubscribe(req, expertParams("expert-id-1"));
      expect(res.status).toBe(401);
    });

    it("POST /api/posts/[postId]/bookmark returns 401", async () => {
      const req = createPOST("/api/posts/post-id-1/bookmark", {});
      const res = await toggleBookmark(req, postParams("post-id-1"));
      expect(res.status).toBe(401);
    });

    it("POST /api/posts/[postId]/like returns 401", async () => {
      const req = createPOST("/api/posts/post-id-1/like", {});
      const res = await toggleLike(req, postParams("post-id-1"));
      expect(res.status).toBe(401);
    });

    it("POST /api/posts/[postId]/comments returns 401", async () => {
      const req = createPOST("/api/posts/post-id-1/comments", {
        content: "test",
      });
      const res = await createComment(req, postParams("post-id-1"));
      expect(res.status).toBe(401);
    });

    it("GET /api/admin/users returns 401", async () => {
      const req = createGET("/api/admin/users");
      const res = await adminListUsers(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/admin/analytics returns 401", async () => {
      const res = await adminAnalytics();
      expect(res.status).toBe(401);
    });

    it("POST /api/knowledge returns 401", async () => {
      const req = createPOST("/api/knowledge", {
        title: "test",
        content: "test",
      });
      const res = await createKnowledge(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/subscriber/feed returns 401", async () => {
      const req = createGET("/api/subscriber/feed");
      const res = await subscriberFeed(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/subscriber/bookmarks returns 401", async () => {
      const req = createGET("/api/subscriber/bookmarks");
      const res = await subscriberBookmarks(req);
      expect(res.status).toBe(401);
    });

    it("POST /api/chat/sessions/[sessionId]/share returns 401", async () => {
      const req = createPOST("/api/chat/sessions/session-id-1/share", {});
      const res = await shareConversation(req, sessionParams("session-id-1"));
      expect(res.status).toBe(401);
    });
  });

  describe("Admin can access admin-only routes", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession.admin);
    });

    it("GET /api/admin/users returns 200", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const req = createGET("/api/admin/users");
      const res = await adminListUsers(req);
      expect(res.status).toBe(200);
    });

    it("GET /api/admin/content returns 200", async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(0);
      mockPrisma.report.groupBy.mockResolvedValue([]);

      const req = createGET("/api/admin/content");
      const res = await adminListContent(req);
      expect(res.status).toBe(200);
    });

    it("GET /api/admin/reports returns 200", async () => {
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.report.count.mockResolvedValue(0);

      const req = createGET("/api/admin/reports");
      const res = await adminListReports(req);
      expect(res.status).toBe(200);
    });
  });
});

// =============================================================================
// Error scenarios within workflows
// =============================================================================
describe("E2E: Error Scenarios", () => {
  it("retired password registration: Registration fails when email already exists", async () => {
mockPrisma.user.findUnique.mockResolvedValue(mockUsers.subscriber);
const req = createPOST("/api/auth/register", {
      name: "Test",
      email: "subscriber@test.com",
      password: "password123",
      role: "SUBSCRIBER",
    });
const res = await registerUser(req);
expect(res.status).toBe(410);
expect((await res.json()).code).toBe("REGISTRATION_RETIRED");
expect(mockPrisma.user.create).not.toHaveBeenCalled();
expect(mockPrisma.expertProfile.create).not.toHaveBeenCalled();
});

  it("retired password registration: Registration fails with invalid data", async () => {
const req = createPOST("/api/auth/register", {
      name: "T", // too short
      email: "not-an-email",
      password: "short",
      role: "SUBSCRIBER",
    });
const res = await registerUser(req);
expect(res.status).toBe(410);
expect((await res.json()).code).toBe("REGISTRATION_RETIRED");
expect(mockPrisma.user.create).not.toHaveBeenCalled();
expect(mockPrisma.expertProfile.create).not.toHaveBeenCalled();
});

  it("Expert profile not found returns 404", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.user.findUnique.mockResolvedValue({
      name: "Expert",
      email: "expert@test.com",
      expertProfile: null,
    });

    const res = await getExpertProfile();
    expect(res.status).toBe(404);
  });

  it("Subscribing to self returns 400", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      user: { name: "Expert User" },
    });

    const req = createPOST("/api/experts/expert-id-1/subscribe", {
      tier: "STANDARD",
    });
    const res = await toggleSubscribe(req, expertParams("expert-id-1"));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("cannot subscribe to yourself");
  });

  it("Trial exhausted returns 403 when creating chat session", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      user: { name: "Expert User" },
    });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue(null);
    (checkTrialAccess as jest.Mock).mockResolvedValue({
      allowed: false,
      used: 3,
      limit: 3,
    });

    const req = createPOST("/api/chat/sessions", {
      expertId: "expert-id-1",
    });
    const res = await createChatSession(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.code).toBe("TRIAL_EXHAUSTED");
    expect(json.questionsUsed).toBe(3);
  });

  it("Share conversation fails if not owner", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.chatSession.findUnique.mockResolvedValue({
      id: "session-1",
      subscriberId: "other-user-id", // different user
      sharedConversation: null,
    });

    const req = createPOST("/api/chat/sessions/session-1/share", {});
    const res = await shareConversation(req, sessionParams("session-1"));

    expect(res.status).toBe(403);
  });

  it("Shared conversation returns 404 if not found", async () => {
    mockPrisma.sharedConversation.findUnique.mockResolvedValue(null);

    const req = createGET("/api/shared/nonexistent-id");
    const res = await getSharedConversation(req, shareParams("nonexistent-id"));

    expect(res.status).toBe(404);
  });

  it("Bookmark non-existent post returns 404", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.post.findUnique.mockResolvedValue(null);

    const req = createPOST("/api/posts/nonexistent/bookmark", {});
    const res = await toggleBookmark(req, postParams("nonexistent"));

    expect(res.status).toBe(404);
  });

  it("Like non-existent post returns 404", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.post.findUnique.mockResolvedValue(null);

    const req = createPOST("/api/posts/nonexistent/like", {});
    const res = await toggleLike(req, postParams("nonexistent"));

    expect(res.status).toBe(404);
  });

  it("Comment on non-existent post returns 404", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.post.findUnique.mockResolvedValue(null);

    const req = createPOST("/api/posts/nonexistent/comments", {
      content: "comment",
    });
    const res = await createComment(req, postParams("nonexistent"));

    expect(res.status).toBe(404);
  });

  it("Admin cannot change own role", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.user.findUnique.mockResolvedValue(mockUsers.admin);

    const req = createPATCH("/api/admin/users/admin-id-1", {
      role: "SUBSCRIBER",
    });
    const res = await adminUpdateUser(req, userParams("admin-id-1"));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("Cannot change your own admin role");
  });

  it("Admin archive non-existent post returns 404", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.post.findUnique.mockResolvedValue(null);

    const req = createPATCH("/api/admin/content/nonexistent", {
      action: "archive",
    });
    const res = await adminContentAction(req, postParams("nonexistent"));

    expect(res.status).toBe(404);
  });

  it("Admin resolve non-existent report returns 404", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.report.findUnique.mockResolvedValue(null);

    const req = createPATCH("/api/admin/reports", {
      reportId: "nonexistent",
      status: "RESOLVED",
    });
    const res = await adminUpdateReport(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toContain("Report not found");
  });

  it("Verify non-existent expert returns 404", async () => {
    mockAuth.mockResolvedValue(mockSession.admin);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(null);

    const req = createPOST("/api/admin/experts/nonexistent/verify", {});
    const res = await adminVerifyExpert(req, expertParams("nonexistent"));

    expect(res.status).toBe(404);
  });

  it("Delete non-existent knowledge item returns 404", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.knowledgeItem.findUnique.mockResolvedValue(null);

    const req = createDELETE("/api/knowledge/nonexistent");
    const res = await deleteKnowledge(req, itemParams("nonexistent"));

    expect(res.status).toBe(404);
  });

  it("Blog import with invalid URLs returns 400", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);

    const req = createPOST("/api/knowledge/import/blog", {
      urls: ["not-a-url"],
    });
    const res = await importBlog(req);

    expect(res.status).toBe(400);
  });

  it("RAG toggle on non-owned post returns 403", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.post.findUnique.mockResolvedValue({
      ...mockPost,
      authorId: "other-expert-id", // different author
      isRagEnabled: false,
    });

    const req = createPOST("/api/posts/post-id-1/rag-toggle", {});
    const res = await ragToggle(req, postParams("post-id-1"));

    expect(res.status).toBe(403);
  });

  it("Expert not found when viewing detail returns 404", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = createGET("/api/experts/nonexistent");
    const res = await getExpertDetail(req, expertParams("nonexistent"));

    expect(res.status).toBe(404);
  });

  it("Empty feed when subscriber has no subscriptions", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertSubscription.findMany.mockResolvedValue([]);

    const req = createGET("/api/subscriber/feed");
    const res = await subscriberFeed(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.posts).toHaveLength(0);
    expect(json.pagination.total).toBe(0);
  });
});
