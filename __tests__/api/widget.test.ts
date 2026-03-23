/**
 * Feature 2: Embeddable Widget — Integration Tests
 */

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: require("../mocks/prisma").default,
}));

jest.mock("@/lib/auth", () => ({
  auth: require("../mocks/auth").mockAuth,
}));

jest.mock("@/lib/ai/chat-engine", () => ({
  runChatEngine: jest.fn(),
}));

import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import { mockExpertProfile } from "../mocks/data";
import { createGET, createPOST, createRequest } from "../helpers/request";

import { GET as getWidgetConfig } from "@/app/api/widget/config/route";
import { GET as getExpertWidget, PUT as updateExpertWidget } from "@/app/api/expert/widget/route";

beforeEach(() => {
  resetAllMocks();
});

const mockWidgetConfig = {
  id: "wc-1",
  expertProfileId: "profile-id-1",
  isEnabled: true,
  apiKey: "test-api-key-123",
  primaryColor: "#6366f1",
  position: "bottom-right",
  greeting: "Hello! Ask me anything.",
  freeQuestions: 2,
  allowedDomains: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Widget Config Public Endpoint", () => {
  it("returns widget config by apiKey", async () => {
    mockPrisma.widgetConfig.findUnique.mockResolvedValue({
      ...mockWidgetConfig,
      expertProfile: {
        displayName: "Expert User",
        twinGreeting: "Hello!",
        user: { id: "expert-id-1", name: "Expert User", image: null },
      },
    });

    const req = createGET("/api/widget/config", { apiKey: "test-api-key-123" });
    const res = await getWidgetConfig(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.expertName).toBe("Expert User");
    expect(data.primaryColor).toBe("#6366f1");
    expect(data.freeQuestions).toBe(2);
  });

  it("returns 404 for invalid apiKey", async () => {
    mockPrisma.widgetConfig.findUnique.mockResolvedValue(null);

    const req = createGET("/api/widget/config", { apiKey: "invalid-key" });
    const res = await getWidgetConfig(req);

    expect(res.status).toBe(404);
  });

  it("returns 400 for missing apiKey", async () => {
    const req = createGET("/api/widget/config");
    const res = await getWidgetConfig(req);

    expect(res.status).toBe(400);
  });

  it("includes CORS headers", async () => {
    mockPrisma.widgetConfig.findUnique.mockResolvedValue({
      ...mockWidgetConfig,
      expertProfile: {
        displayName: "Expert",
        twinGreeting: null,
        user: { id: "expert-id-1", name: "Expert", image: null },
      },
    });

    const req = createGET("/api/widget/config", { apiKey: "test-api-key-123" });
    const res = await getWidgetConfig(req);

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("Expert Widget Management (GET)", () => {
  it("returns existing widget config", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.user.findUnique.mockResolvedValue({ role: "EXPERT" });
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.widgetConfig.findUnique.mockResolvedValue(mockWidgetConfig);

    const res = await getExpertWidget();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.apiKey).toBe("test-api-key-123");
    expect(data.embedCode).toContain("test-api-key-123");
  });

  it("creates default config when none exists", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.user.findUnique.mockResolvedValue({ role: "EXPERT" });
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.widgetConfig.findUnique.mockResolvedValue(null);
    mockPrisma.widgetConfig.create.mockResolvedValue(mockWidgetConfig);

    const res = await getExpertWidget();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.widgetConfig.create).toHaveBeenCalled();
  });

  it("returns 403 for non-expert", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.user.findUnique.mockResolvedValue({ role: "SUBSCRIBER" });

    const res = await getExpertWidget();
    expect(res.status).toBe(403);
  });
});

describe("Expert Widget Management (PUT)", () => {
  it("updates widget config", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.user.findUnique.mockResolvedValue({ role: "EXPERT" });
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);
    mockPrisma.widgetConfig.findUnique.mockResolvedValue(mockWidgetConfig);
    mockPrisma.widgetConfig.upsert.mockResolvedValue({
      ...mockWidgetConfig,
      primaryColor: "#ff0000",
      greeting: "New greeting",
    });

    const req = createRequest("/api/expert/widget", {
      method: "PUT",
      body: {
        primaryColor: "#ff0000",
        greeting: "New greeting",
        freeQuestions: 5,
      },
    });
    const res = await updateExpertWidget(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrisma.widgetConfig.upsert).toHaveBeenCalled();
  });
});
