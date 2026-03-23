/**
 * Utility Functions & Rate Limiting Tests
 */

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: require("../mocks/prisma").default,
}));

import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { checkTrialAccess, incrementTrialUsage } from "@/lib/trial";
import { rateLimit } from "@/lib/rate-limit";
import { TIER_LABELS, DEFAULT_TIER_PRICES, DEFAULT_STANDARD_QUESTIONS, TIER_DESCRIPTIONS } from "@/lib/constants";

beforeEach(() => {
  resetAllMocks();
});

describe("Trial Utility Functions", () => {
  describe("checkTrialAccess", () => {
    it("returns allowed when no usage exists", async () => {
      mockPrisma.expertProfile.findUnique.mockResolvedValue({
        freeTrialQuestions: 3,
      });
      mockPrisma.freeTrialUsage.findUnique.mockResolvedValue(null);

      const result = await checkTrialAccess("user-1", "profile-1");

      expect(result.allowed).toBe(true);
      expect(result.used).toBe(0);
      expect(result.limit).toBe(3);
    });

    it("returns not allowed when limit reached", async () => {
      mockPrisma.expertProfile.findUnique.mockResolvedValue({
        freeTrialQuestions: 3,
      });
      mockPrisma.freeTrialUsage.findUnique.mockResolvedValue({
        questionCount: 3,
      });

      const result = await checkTrialAccess("user-1", "profile-1");

      expect(result.allowed).toBe(false);
      expect(result.used).toBe(3);
    });

    it("returns allowed when partially used", async () => {
      mockPrisma.expertProfile.findUnique.mockResolvedValue({
        freeTrialQuestions: 3,
      });
      mockPrisma.freeTrialUsage.findUnique.mockResolvedValue({
        questionCount: 1,
      });

      const result = await checkTrialAccess("user-1", "profile-1");

      expect(result.allowed).toBe(true);
      expect(result.used).toBe(1);
    });

    it("defaults to 3 questions when expert not found", async () => {
      mockPrisma.expertProfile.findUnique.mockResolvedValue(null);
      mockPrisma.freeTrialUsage.findUnique.mockResolvedValue(null);

      const result = await checkTrialAccess("user-1", "profile-1");

      expect(result.limit).toBe(3);
      expect(result.allowed).toBe(true);
    });
  });

  describe("incrementTrialUsage", () => {
    it("upserts trial usage record", async () => {
      mockPrisma.freeTrialUsage.upsert.mockResolvedValue({});

      await incrementTrialUsage("user-1", "profile-1");

      expect(mockPrisma.freeTrialUsage.upsert).toHaveBeenCalledWith({
        where: {
          userId_expertProfileId: {
            userId: "user-1",
            expertProfileId: "profile-1",
          },
        },
        create: expect.objectContaining({
          userId: "user-1",
          expertProfileId: "profile-1",
          questionCount: 1,
        }),
        update: expect.objectContaining({
          questionCount: { increment: 1 },
        }),
      });
    });
  });
});

describe("Rate Limiter", () => {
  it("allows requests within limit", () => {
    const result1 = rateLimit("test-client-1", 5, 60000);
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(4);

    const result2 = rateLimit("test-client-1", 5, 60000);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(3);
  });

  it("blocks requests over limit", () => {
    const id = "test-client-block-" + Date.now();
    for (let i = 0; i < 3; i++) {
      rateLimit(id, 3, 60000);
    }

    const result = rateLimit(id, 3, 60000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("isolates different clients", () => {
    const id1 = "client-a-" + Date.now();
    const id2 = "client-b-" + Date.now();

    for (let i = 0; i < 3; i++) {
      rateLimit(id1, 3, 60000);
    }

    const result = rateLimit(id2, 3, 60000);
    expect(result.allowed).toBe(true);
  });
});

describe("Constants", () => {
  it("exports tier labels", () => {
    expect(TIER_LABELS.FREE).toBe("Free");
    expect(TIER_LABELS.STANDARD).toBe("Standard");
    expect(TIER_LABELS.PREMIUM).toBe("Premium");
  });

  it("exports default prices", () => {
    expect(DEFAULT_TIER_PRICES.FREE).toBe(0);
    expect(DEFAULT_TIER_PRICES.STANDARD).toBe(9.99);
    expect(DEFAULT_TIER_PRICES.PREMIUM).toBe(29.99);
  });

  it("exports default standard questions", () => {
    expect(DEFAULT_STANDARD_QUESTIONS).toBe(20);
  });

  it("exports tier descriptions", () => {
    expect(TIER_DESCRIPTIONS.FREE).toBeDefined();
    expect(TIER_DESCRIPTIONS.STANDARD).toBeDefined();
    expect(TIER_DESCRIPTIONS.PREMIUM).toBeDefined();
  });
});
