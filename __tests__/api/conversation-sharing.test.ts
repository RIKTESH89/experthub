/**
 * Feature: Conversation Sharing — Integration Tests
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
import { createGET, createRequest } from "../helpers/request";

import {
  GET as getShareStatus,
  POST as createShare,
  DELETE as deleteShare,
} from "@/app/api/chat/sessions/[sessionId]/share/route";
import { GET as getSharedConversation } from "@/app/api/shared/[shareId]/route";

beforeEach(() => {
  resetAllMocks();
});

const baseChatSession = {
  id: "session-1",
  subscriberId: "subscriber-id-1",
  expertProfileId: "profile-1",
  title: "Chat about AI",
  isTrial: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSharedConv = {
  id: "sc-1",
  shareId: "share-abc123",
  chatSessionId: "session-1",
  sharedById: "subscriber-id-1",
  isActive: true,
};

describe("Share Status (GET)", () => {
  const params = Promise.resolve({ sessionId: "session-1" });

  it("returns not shared when no share exists", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.chatSession.findUnique.mockResolvedValue({
      ...baseChatSession,
      sharedConversation: null,
    });

    const req = createGET("/api/chat/sessions/session-1/share");
    const res = await getShareStatus(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.isShared).toBe(false);
  });

  it("returns shared status with shareId when active", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.chatSession.findUnique.mockResolvedValue({
      ...baseChatSession,
      sharedConversation: mockSharedConv,
    });

    const req = createGET("/api/chat/sessions/session-1/share");
    const res = await getShareStatus(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.isShared).toBe(true);
    expect(data.shareId).toBe("share-abc123");
    expect(data.shareUrl).toContain("/shared/share-abc123");
  });

  it("returns 401 for unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createGET("/api/chat/sessions/session-1/share");
    const res = await getShareStatus(req, { params });

    expect(res.status).toBe(401);
  });

  it("returns 403 for non-owner", async () => {
    mockAuth.mockResolvedValue(mockSession.expert);
    mockPrisma.chatSession.findUnique.mockResolvedValue({
      ...baseChatSession,
      sharedConversation: null,
    });

    const req = createGET("/api/chat/sessions/session-1/share");
    const res = await getShareStatus(req, { params });

    expect(res.status).toBe(403);
  });

  it("returns 404 for nonexistent session", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.chatSession.findUnique.mockResolvedValue(null);

    const req = createGET("/api/chat/sessions/session-1/share");
    const res = await getShareStatus(req, { params });

    expect(res.status).toBe(404);
  });
});

describe("Create Share (POST)", () => {
  const params = Promise.resolve({ sessionId: "session-1" });

  it("creates a new share", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.chatSession.findUnique.mockResolvedValue({
      ...baseChatSession,
      sharedConversation: null,
    });
    mockPrisma.sharedConversation.create.mockResolvedValue(mockSharedConv);

    const req = createRequest("/api/chat/sessions/session-1/share", { method: "POST" });
    const res = await createShare(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.isShared).toBe(true);
    expect(data.shareId).toBe("share-abc123");
  });

  it("reactivates an existing inactive share", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.chatSession.findUnique.mockResolvedValue({
      ...baseChatSession,
      sharedConversation: { ...mockSharedConv, isActive: false },
    });
    mockPrisma.sharedConversation.update.mockResolvedValue(mockSharedConv);

    const req = createRequest("/api/chat/sessions/session-1/share", { method: "POST" });
    const res = await createShare(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.isShared).toBe(true);
    expect(mockPrisma.sharedConversation.update).toHaveBeenCalled();
  });
});

describe("Delete Share (DELETE)", () => {
  const params = Promise.resolve({ sessionId: "session-1" });

  it("deactivates a share", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.chatSession.findUnique.mockResolvedValue({
      ...baseChatSession,
      sharedConversation: mockSharedConv,
    });
    mockPrisma.sharedConversation.update.mockResolvedValue({
      ...mockSharedConv,
      isActive: false,
    });

    const req = createRequest("/api/chat/sessions/session-1/share", { method: "DELETE" });
    const res = await deleteShare(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.isShared).toBe(false);
  });

  it("returns 200 even when no share exists (idempotent)", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.chatSession.findUnique.mockResolvedValue({
      ...baseChatSession,
      sharedConversation: null,
    });

    const req = createRequest("/api/chat/sessions/session-1/share", { method: "DELETE" });
    const res = await deleteShare(req, { params });

    expect(res.status).toBe(200);
    expect((await res.json()).isShared).toBe(false);
  });
});

describe("Public Shared Conversation (GET)", () => {
  const params = Promise.resolve({ shareId: "share-abc123" });

  it("returns full conversation data", async () => {
    mockPrisma.sharedConversation.findUnique.mockResolvedValue({
      ...mockSharedConv,
      chatSession: {
        ...baseChatSession,
        messages: [
          { id: "m1", role: "user", content: "What is AI?", createdAt: new Date() },
          { id: "m2", role: "assistant", content: "AI is...", createdAt: new Date() },
        ],
        expertProfile: {
          displayName: "Expert User",
          specialty: ["AI"],
          user: { name: "Expert User", image: null },
        },
      },
    });

    const req = createGET("/api/shared/share-abc123");
    const res = await getSharedConversation(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.chatSession.messages).toHaveLength(2);
    expect(data.chatSession.expertProfile.displayName).toBe("Expert User");
  });

  it("returns 404 for inactive share", async () => {
    mockPrisma.sharedConversation.findUnique.mockResolvedValue(null);

    const req = createGET("/api/shared/nonexistent");
    const res = await getSharedConversation(req, { params: Promise.resolve({ shareId: "nonexistent" }) });

    expect(res.status).toBe(404);
  });

  it("includes CORS headers", async () => {
    mockPrisma.sharedConversation.findUnique.mockResolvedValue({
      ...mockSharedConv,
      chatSession: {
        messages: [],
        expertProfile: {
          displayName: "Expert",
          specialty: [],
          user: { name: "Expert", image: null },
        },
      },
    });

    const req = createGET("/api/shared/share-abc123");
    const res = await getSharedConversation(req, { params });

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
