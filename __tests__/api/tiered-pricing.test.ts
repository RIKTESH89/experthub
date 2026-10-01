/**
 * Feature 3: Tiered Pricing — Integration Tests
 */

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: require("../mocks/prisma").default,
}));

jest.mock("@/lib/auth", () => ({
  auth: require("../mocks/auth").mockAuth,
}));

import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import { mockExpertProfile } from "../mocks/data";
import { createGET, createRequest } from "../helpers/request";

import { GET as getExpertPricing, PUT as updateExpertPricing } from "@/app/api/expert/pricing/route";
import { GET as getPublicPricing } from "@/app/api/experts/[expertId]/pricing/route";
import { POST as subscribe } from "@/app/api/experts/[expertId]/subscribe/route";

beforeEach(() => {
  resetAllMocks();
});

const mockTiers = [
  { id: "t1", expertProfileId: "profile-id-1", tier: "FREE", price: 0, description: "Free", monthlyQuestions: null, features: ["Public posts"], isActive: true },
  { id: "t2", expertProfileId: "profile-id-1", tier: "STANDARD", price: 9.99, description: "Standard", monthlyQuestions: 20, features: ["Posts", "20 questions/mo"], isActive: true },
  { id: "t3", expertProfileId: "profile-id-1", tier: "PREMIUM", price: 29.99, description: "Premium", monthlyQuestions: null, features: ["Unlimited"], isActive: true },
];

describe("Expert Pricing Management (GET)", () => {
  it("returns existing tiers", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.expertPricingTier.findMany.mockResolvedValue(mockTiers);

    const req = createGET("/api/expert/pricing");
    const res = await getExpertPricing();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.tiers).toHaveLength(2);
    expect(data.tiers[0].tier).toBe("FREE");
  });

  it("creates default tiers when none exist", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.expertPricingTier.findMany
      .mockResolvedValueOnce([]) // first call: no tiers
      .mockResolvedValueOnce(mockTiers); // second call: after creation
    mockPrisma.expertPricingTier.create.mockResolvedValue({});

    const res = await getExpertPricing();
    const data = await res.json();

    expect(mockPrisma.expertPricingTier.create).toHaveBeenCalledTimes(2);
    expect(data.tiers).toHaveLength(2);
  });

  it("returns 403 for non-expert", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const res = await getExpertPricing();
    expect(res.status).toBe(403);
  });
});

describe("Expert Pricing Update (PUT)", () => {
  it("updates tier prices", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.expertPricingTier.upsert.mockResolvedValue({});
    mockPrisma.expertPricingTier.findMany.mockResolvedValue(mockTiers);

    const req = createRequest("/api/expert/pricing", {
      method: "PUT",
      body: {
        tiers: [
          { tier: "FREE", price: 0, description: "Free tier" },
          { tier: "STANDARD", price: 14.99, description: "Standard" },
          { tier: "PREMIUM", price: 39.99, description: "Premium" },
        ],
      },
    });
    const res = await updateExpertPricing(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.expertPricingTier.upsert).toHaveBeenCalledTimes(3);
  });

  it("enforces FREE tier price as 0", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.expertPricingTier.upsert.mockResolvedValue({});
    mockPrisma.expertPricingTier.findMany.mockResolvedValue(mockTiers);

    const req = createRequest("/api/expert/pricing", {
      method: "PUT",
      body: {
        tiers: [{ tier: "FREE", price: 5.99, description: "Free" }],
      },
    });
    await updateExpertPricing(req);

    expect(mockPrisma.expertPricingTier.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ price: 0 }),
        create: expect.objectContaining({ price: 0 }),
      })
    );
  });
});

describe("Public Pricing Endpoint", () => {
  const params = Promise.resolve({ expertId: "expert-id-1" });

  it("returns expert tiers for any authenticated user", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.expertPricingTier.findMany.mockResolvedValue(mockTiers);

    const req = createGET("/api/experts/expert-id-1/pricing");
    const res = await getPublicPricing(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.tiers).toHaveLength(2);
  });
});

describe("Subscribe with Tier", () => {
  const params = Promise.resolve({ expertId: "expert-id-1" });

  it("requires payment for a specified paid tier", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique
      .mockResolvedValueOnce({ ...mockExpertProfile, user: { name: "Expert" } })
      .mockResolvedValueOnce({ totalSubscribers: 11 });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue(null);
    mockPrisma.expertPricingTier.findUnique.mockResolvedValue({
      price: 9.99,
      tier: "STANDARD",
    });
    mockPrisma.expertSubscription.create.mockResolvedValue({ id: "sub-1" });
    mockPrisma.expertProfile.update.mockResolvedValue({});
    mockPrisma.notification.create.mockResolvedValue({});

    const req = createRequest("/api/experts/expert-id-1/subscribe", {
      method: "POST",
      body: { tier: "STANDARD" },
    });
    const res = await subscribe(req, { params });
    const data = await res.json();

    expect(res.status).toBe(402);
    expect(data.requiresPayment).toBe(true);
    expect(mockPrisma.expertSubscription.create).not.toHaveBeenCalled();
  });

  it("defaults to FREE without paid entitlement when no tier specified", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique
      .mockResolvedValueOnce({ ...mockExpertProfile, user: { name: "Expert" } })
      .mockResolvedValueOnce({ totalSubscribers: 11 });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue(null);
    mockPrisma.expertPricingTier.findUnique.mockResolvedValue(null);
    mockPrisma.expertSubscription.create.mockResolvedValue({ id: "sub-1" });
    mockPrisma.expertProfile.update.mockResolvedValue({});
    mockPrisma.notification.create.mockResolvedValue({});

    const req = createRequest("/api/experts/expert-id-1/subscribe", {
      method: "POST",
      body: {},
    });
    const res = await subscribe(req, { params });
    const data = await res.json();

    expect(data.isSubscribed).toBe(true);
    expect(mockPrisma.expertSubscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tier: "FREE", price: 0 }),
      })
    );
  });

  it("unsubscribes active subscriber", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique
      .mockResolvedValueOnce({ ...mockExpertProfile, user: { name: "Expert" } })
      .mockResolvedValueOnce({ totalSubscribers: 9 });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue({
 tier: "FREE",
      id: "sub-1",
      status: "ACTIVE",
    });
    mockPrisma.expertSubscription.update.mockResolvedValue({});
    mockPrisma.expertProfile.update.mockResolvedValue({});

    const req = createRequest("/api/experts/expert-id-1/subscribe", {
      method: "POST",
      body: {},
    });
    const res = await subscribe(req, { params });
    const data = await res.json();

    expect(data.isSubscribed).toBe(false);
  });
});
