import { NextRequest } from "next/server";
import mockPrisma from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import { mockUsers, mockExpertProfile, mockPost, mockSubscription } from "../mocks/data";
import { resetAllMocks } from "../mocks/prisma";

jest.mock("@/lib/prisma", () => ({ __esModule: true, default: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: mockAuth }));

import { GET as listExperts } from "@/app/api/experts/route";
import { GET as getExpert } from "@/app/api/experts/[expertId]/route";
import { POST as subscribeToExpert } from "@/app/api/experts/[expertId]/subscribe/route";
import { GET as getTrending } from "@/app/api/experts/trending/route";
import { GET as getSubscriptions } from "@/app/api/subscriptions/route";

function createRequest(url: string, method = "GET"): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), { method });
}

function expertIdParams(expertId: string) {
  return { params: Promise.resolve({ expertId }) };
}

// Reusable expert list item shape matching the select in the listing route
const mockExpertListItem = {
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
    twinGreeting: "Hello! Ask me about AI.",
  },
  _count: { posts: 5, subscriptionsAsSubscriber: 0 },
};

const mockExpertListItem2 = {
  id: "expert-id-2",
  name: "Second Expert",
  image: null,
  bio: "Another expert",
  headline: "ML Expert",
  expertProfile: {
    id: "profile-id-2",
    displayName: "Second Expert",
    specialty: ["ML"],
    monthlyPrice: 14.99,
    isVerified: false,
    totalSubscribers: 25,
    twinGreeting: "Hi there!",
  },
  _count: { posts: 10, subscriptionsAsSubscriber: 0 },
};

// Expert detail shape matching the select in the [expertId] route
const mockExpertDetail = {
  id: "expert-id-1",
  name: "Expert User",
  image: null,
  bio: "Expert bio",
  headline: "AI Expert",
  createdAt: new Date("2024-01-01"),
  expertProfile: {
    id: "profile-id-1",
    displayName: "Expert User",
    specialty: ["AI", "ML"],
    socialLinks: null,
    monthlyPrice: 9.99,
    isVerified: true,
    totalSubscribers: 10,
    ragEnabled: true,
    twinPersonality: "I am an AI expert",
    twinGreeting: "Hello! Ask me about AI.",
  },
  posts: [
    {
      ...mockPost,
      media: [],
      tags: [{ tag: { id: "tag-1", name: "AI", slug: "ai" } }],
      _count: { likes: 5, comments: 3, bookmarks: 2 },
    },
  ],
  _count: { posts: 1 },
};

beforeEach(() => {
  resetAllMocks();
  mockAuth.mockReset();
});

// ---------------------------------------------------------------------------
// Expert Listing: GET /api/experts
// ---------------------------------------------------------------------------
describe("GET /api/experts", () => {
  it("1. lists experts with expert profiles", async () => {
    const experts = [mockExpertListItem, mockExpertListItem2];
    mockPrisma.user.findMany.mockResolvedValue(experts);
    mockPrisma.user.count.mockResolvedValue(2);

    const res = await listExperts(createRequest("/api/experts"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.experts).toHaveLength(2);
    expect(body.experts[0].expertProfile).toBeDefined();
    expect(body.pagination.total).toBe(2);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(20);
    expect(body.pagination.totalPages).toBe(1);

    // Verify the prisma call includes role/isActive/isBanned filters
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: "EXPERT",
          isActive: true,
          isBanned: false,
        }),
      })
    );
  });

  it("2. filters by search term", async () => {
    mockPrisma.user.findMany.mockResolvedValue([mockExpertListItem]);
    mockPrisma.user.count.mockResolvedValue(1);

    const res = await listExperts(createRequest("/api/experts?search=AI"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.experts).toHaveLength(1);

    const calledWith = mockPrisma.user.findMany.mock.calls[0][0];
    expect(calledWith.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: { contains: "AI", mode: "insensitive" } }),
        expect.objectContaining({
          expertProfile: { displayName: { contains: "AI", mode: "insensitive" } },
        }),
      ])
    );
  });

  it("3. filters by specialty", async () => {
    mockPrisma.user.findMany.mockResolvedValue([mockExpertListItem]);
    mockPrisma.user.count.mockResolvedValue(1);

    const res = await listExperts(createRequest("/api/experts?specialty=ML"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.experts).toHaveLength(1);

    const calledWith = mockPrisma.user.findMany.mock.calls[0][0];
    expect(calledWith.where.expertProfile).toEqual(
      expect.objectContaining({ specialty: { has: "ML" } })
    );
  });

  it("4. sorts by creation date when sort=newest", async () => {
    mockPrisma.user.findMany.mockResolvedValue([mockExpertListItem]);
    mockPrisma.user.count.mockResolvedValue(1);

    const res = await listExperts(createRequest("/api/experts?sort=newest"));

    expect(res.status).toBe(200);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("5. sorts by subscriber count when sort=most_subscribers", async () => {
    mockPrisma.user.findMany.mockResolvedValue([mockExpertListItem2, mockExpertListItem]);
    mockPrisma.user.count.mockResolvedValue(2);

    const res = await listExperts(createRequest("/api/experts?sort=most_subscribers"));

    expect(res.status).toBe(200);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { expertProfile: { totalSubscribers: "desc" } },
      })
    );
  });

  it("6. respects page and limit for pagination", async () => {
    mockPrisma.user.findMany.mockResolvedValue([mockExpertListItem2]);
    mockPrisma.user.count.mockResolvedValue(15);

    const res = await listExperts(createRequest("/api/experts?page=2&limit=5"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.limit).toBe(5);
    expect(body.pagination.total).toBe(15);
    expect(body.pagination.totalPages).toBe(3);

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5, // (page 2 - 1) * limit 5
        take: 5,
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Expert Profile: GET /api/experts/:id
// ---------------------------------------------------------------------------
describe("GET /api/experts/:id", () => {
  it("7. returns expert profile with posts", async () => {
    mockAuth.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(mockExpertDetail);

    const res = await getExpert(
      createRequest("/api/experts/expert-id-1"),
      expertIdParams("expert-id-1")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe("expert-id-1");
    expect(body.displayName).toBe("Expert User");
    expect(body._count.subscribers).toBeDefined();
    expect(body.posts).toHaveLength(1);
    expect(body.isSubscribed).toBe(false);
    expect(body.subscription).toBeNull();
  });

  it("8. returns subscription status for authenticated subscriber", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.user.findUnique.mockResolvedValue(mockExpertDetail);

    const activeSub = {
      id: "sub-id-1",
      subscriberId: "subscriber-id-1",
      expertProfileId: "profile-id-1",
      status: "ACTIVE",
      startDate: new Date("2024-01-01"),
      endDate: null,
      price: 9.99,
    };
    mockPrisma.expertSubscription.findUnique.mockResolvedValue(activeSub);

    const res = await getExpert(
      createRequest("/api/experts/expert-id-1"),
      expertIdParams("expert-id-1")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.isSubscribed).toBe(true);
    expect(body.subscription).toBeDefined();
    expect(body.subscription.status).toBe("ACTIVE");

    // Verify lookup used composite key
    expect(mockPrisma.expertSubscription.findUnique).toHaveBeenCalledWith({
      where: {
        subscriberId_expertProfileId: {
          subscriberId: "subscriber-id-1",
          expertProfileId: "profile-id-1",
        },
      },
    });
  });

  it("9. returns 404 for non-existent expert", async () => {
    mockAuth.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await getExpert(
      createRequest("/api/experts/non-existent"),
      expertIdParams("non-existent")
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Expert not found");
  });
});

// ---------------------------------------------------------------------------
// Subscription Flow: POST /api/experts/:id/subscribe
// ---------------------------------------------------------------------------
describe("POST /api/experts/:id/subscribe", () => {
  const mockProfileWithUser = {
    ...mockExpertProfile,
    user: { name: "Expert User" },
  };

  it("10. subscriber successfully subscribes (new subscription)", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockProfileWithUser);
    mockPrisma.expertSubscription.findUnique.mockResolvedValue(null); // no existing
    mockPrisma.expertSubscription.create.mockResolvedValue({});
    mockPrisma.expertProfile.update.mockResolvedValue({});
    mockPrisma.notification.create.mockResolvedValue({});
    mockPrisma.expertProfile.findUnique
      .mockResolvedValueOnce(mockProfileWithUser) // first call in handler
      .mockResolvedValueOnce({ totalSubscribers: 11 }); // second call for updated count

    const res = await subscribeToExpert(
      createRequest("/api/experts/expert-id-1/subscribe", "POST"),
      expertIdParams("expert-id-1")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.isSubscribed).toBe(true);
    expect(body.totalSubscribers).toBe(11);

    // Verify subscription was created with correct data
    expect(mockPrisma.expertSubscription.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subscriberId: "subscriber-id-1",
        expertProfileId: "profile-id-1",
        status: "ACTIVE",
        price: 9.99,
      }),
    });

    // Verify notification was sent to the expert
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "expert-id-1",
        title: "New Subscriber",
      }),
    });
  });

  it("11. subscriber unsubscribes (already subscribed - toggles)", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const activeSub = {
      id: "sub-id-1",
      subscriberId: "subscriber-id-1",
      expertProfileId: "profile-id-1",
      status: "ACTIVE",
    };

    mockPrisma.expertProfile.findUnique
      .mockResolvedValueOnce(mockProfileWithUser)
      .mockResolvedValueOnce({ totalSubscribers: 9 });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue(activeSub);
    mockPrisma.expertSubscription.update.mockResolvedValue({});
    mockPrisma.expertProfile.update.mockResolvedValue({});

    const res = await subscribeToExpert(
      createRequest("/api/experts/expert-id-1/subscribe", "POST"),
      expertIdParams("expert-id-1")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.isSubscribed).toBe(false);
    expect(body.totalSubscribers).toBe(9);

    // Verify subscription was cancelled, not deleted
    expect(mockPrisma.expertSubscription.update).toHaveBeenCalledWith({
      where: { id: "sub-id-1" },
      data: expect.objectContaining({
        status: "CANCELLED",
        endDate: expect.any(Date),
      }),
    });
  });

  it("12. increments totalSubscribers on subscribe", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique
      .mockResolvedValueOnce(mockProfileWithUser)
      .mockResolvedValueOnce({ totalSubscribers: 11 });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue(null);
    mockPrisma.expertSubscription.create.mockResolvedValue({});
    mockPrisma.expertProfile.update.mockResolvedValue({});
    mockPrisma.notification.create.mockResolvedValue({});

    await subscribeToExpert(
      createRequest("/api/experts/expert-id-1/subscribe", "POST"),
      expertIdParams("expert-id-1")
    );

    expect(mockPrisma.expertProfile.update).toHaveBeenCalledWith({
      where: { id: "profile-id-1" },
      data: { totalSubscribers: { increment: 1 } },
    });
  });

  it("13. decrements totalSubscribers on unsubscribe", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const activeSub = {
      id: "sub-id-1",
      subscriberId: "subscriber-id-1",
      expertProfileId: "profile-id-1",
      status: "ACTIVE",
    };

    mockPrisma.expertProfile.findUnique
      .mockResolvedValueOnce(mockProfileWithUser)
      .mockResolvedValueOnce({ totalSubscribers: 9 });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue(activeSub);
    mockPrisma.expertSubscription.update.mockResolvedValue({});
    mockPrisma.expertProfile.update.mockResolvedValue({});

    await subscribeToExpert(
      createRequest("/api/experts/expert-id-1/subscribe", "POST"),
      expertIdParams("expert-id-1")
    );

    expect(mockPrisma.expertProfile.update).toHaveBeenCalledWith({
      where: { id: "profile-id-1" },
      data: { totalSubscribers: { decrement: 1 } },
    });
  });

  it("14. cannot subscribe to self", async () => {
    mockAuth.mockResolvedValue(mockSession.expert); // expert-id-1 session
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockProfileWithUser);

    const res = await subscribeToExpert(
      createRequest("/api/experts/expert-id-1/subscribe", "POST"),
      expertIdParams("expert-id-1") // same as session user
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("You cannot subscribe to yourself");

    // Should not have created any subscription
    expect(mockPrisma.expertSubscription.create).not.toHaveBeenCalled();
    expect(mockPrisma.expertSubscription.update).not.toHaveBeenCalled();
  });

  it("15. unauthenticated returns 401", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await subscribeToExpert(
      createRequest("/api/experts/expert-id-1/subscribe", "POST"),
      expertIdParams("expert-id-1")
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("16. returns 404 for non-existent expert", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(null);

    const res = await subscribeToExpert(
      createRequest("/api/experts/non-existent/subscribe", "POST"),
      expertIdParams("non-existent")
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Expert not found");
  });
});

// ---------------------------------------------------------------------------
// Trending: GET /api/experts/trending
// ---------------------------------------------------------------------------
describe("GET /api/experts/trending", () => {
  it("17. returns top experts by engagement", async () => {
    const trendingExperts = [
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
        posts: [
          {
            viewCount: 200,
            _count: { likes: 10, comments: 5 },
          },
        ],
        _count: { posts: 5 },
      },
      {
        id: "expert-id-2",
        name: "Second Expert",
        image: null,
        bio: "Another expert",
        headline: "ML Expert",
        expertProfile: {
          id: "profile-id-2",
          displayName: "Second Expert",
          specialty: ["ML"],
          monthlyPrice: 14.99,
          isVerified: false,
          totalSubscribers: 5,
          twinGreeting: "Hi!",
        },
        posts: [
          {
            viewCount: 50,
            _count: { likes: 2, comments: 1 },
          },
        ],
        _count: { posts: 3 },
      },
    ];

    mockPrisma.user.findMany.mockResolvedValue(trendingExperts);

    const res = await getTrending(createRequest("/api/experts/trending"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(2);

    // Expert 1 engagement: totalSubscribers(10)*5 + viewCount(200) + likes(10)*3 + comments(5)*2 = 50+200+30+10 = 290
    // Expert 2 engagement: totalSubscribers(5)*5 + viewCount(50) + likes(2)*3 + comments(1)*2 = 25+50+6+2 = 83
    // Expert 1 should be first (higher score)
    expect(body[0].id).toBe("expert-id-1");
    expect(body[0].engagementScore).toBe(290);
    expect(body[1].id).toBe("expert-id-2");
    expect(body[1].engagementScore).toBe(83);

    // Posts should be stripped from the response
    expect(body[0].posts).toBeUndefined();
    expect(body[1].posts).toBeUndefined();

    // Verify query filters
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: "EXPERT",
          isActive: true,
          isBanned: false,
        }),
        take: 50,
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Subscriptions: GET /api/subscriptions
// ---------------------------------------------------------------------------
describe("GET /api/subscriptions", () => {
  it("18. returns subscriber's active subscriptions", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const subs = [
      {
        ...mockSubscription,
        expertProfile: {
          id: "profile-id-1",
          displayName: "Expert User",
          specialty: ["AI", "ML"],
          monthlyPrice: 9.99,
          isVerified: true,
          totalSubscribers: 10,
          user: {
            id: "expert-id-1",
            name: "Expert User",
            image: null,
            bio: "Expert bio",
            headline: "AI Expert",
          },
        },
      },
    ];
    mockPrisma.expertSubscription.findMany.mockResolvedValue(subs);

    const res = await getSubscriptions(createRequest("/api/subscriptions"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].expert.displayName).toBe("Expert User");
    expect(body[0].status).toBe("ACTIVE");
    expect(body[0].monthlyPrice).toBe(9.99);

    // Verify only ACTIVE subscriptions for current user are queried
    expect(mockPrisma.expertSubscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          subscriberId: "subscriber-id-1",
          status: "ACTIVE",
        },
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("19. returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await getSubscriptions(createRequest("/api/subscriptions"));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");

    // Should not query subscriptions at all
    expect(mockPrisma.expertSubscription.findMany).not.toHaveBeenCalled();
  });
});
