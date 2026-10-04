import { syntheticPaidPeriod } from "../helpers/paid-period";
import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import {
  mockExpertProfile,
  mockChatSession,
  mockSubscription,
} from "../mocks/data";
import { createGET, createPOST, createDELETE } from "../helpers/request";

jest.mock("@/lib/prisma", () => ({ __esModule: true, default: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: mockAuth }));
jest.mock("@/lib/ai/chat-engine", () => ({
  runChatEngine: jest.fn(),
}));

import { GET as listSessions, POST as createSession } from "@/app/api/chat/sessions/route";
import {
  GET as getSession,
  DELETE as deleteSession,
} from "@/app/api/chat/sessions/[sessionId]/route";
import { POST as sendMessage } from "@/app/api/chat/sessions/[sessionId]/messages/route";
import { runChatEngine } from "@/lib/ai/chat-engine";

function sessionParams(sessionId: string) {
  return { params: Promise.resolve({ sessionId }) };
}

beforeEach(() => {
  resetAllMocks();
  mockAuth.mockReset();
  mockPrisma.expertSubscription.findUnique.mockResolvedValue(mockSubscription);
  (runChatEngine as jest.Mock).mockReset();
});

// ---------------------------------------------------------------------------
// Chat Sessions CRUD
// ---------------------------------------------------------------------------
describe("Chat Sessions API", () => {
  // 1. GET /chat/sessions?expertId=X - lists sessions for subscriber
  it("GET /chat/sessions?expertId=X - lists sessions for subscriber", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue(mockExpertProfile);

    const sessionData = {
      ...mockChatSession,
      expertProfile: {
        displayName: "Expert User",
        user: { id: "expert-id-1", name: "Expert User", image: null },
      },
      messages: [],
    };
    mockPrisma.chatSession.findMany.mockResolvedValue([sessionData]);

    const req = createGET("/api/chat/sessions", { expertId: "expert-id-1" });
    const res = await listSessions(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    expect(json[0].id).toBe("session-id-1");
    expect(mockPrisma.chatSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          subscriberId: "subscriber-id-1",
          expertProfileId: mockExpertProfile.id,
        },
      })
    );
  });

  // 2. POST /chat/sessions - creates new session (requires active subscription)
  it("POST /chat/sessions - creates new session with active subscription", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      user: { name: "Expert User" },
      twinGreeting: "Hello! Ask me about AI.",
    });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue(mockSubscription);

    const createdSession = {
      ...mockChatSession,
      expertProfile: {
        displayName: "Expert User",
        twinGreeting: "Hello! Ask me about AI.",
        user: { id: "expert-id-1", name: "Expert User", image: null },
      },
    };
    mockPrisma.chatSession.create.mockResolvedValue(createdSession);
    mockPrisma.chatMessage.create.mockResolvedValue({});

    const req = createPOST("/api/chat/sessions", { expertId: "expert-id-1" });
    const res = await createSession(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.id).toBe("session-id-1");
    // Should create greeting message since expert has twinGreeting
    expect(mockPrisma.chatMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        role: "assistant",
        content: "Hello! Ask me about AI.",
      }),
    });
  });

  // 3. POST /chat/sessions - fails without active subscription and exhausted trial
  it("POST /chat/sessions - fails without active subscription", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.expertProfile.findUnique.mockResolvedValue({
      ...mockExpertProfile,
      freeTrialQuestions: 3,
      user: { name: "Expert User" },
    });
    mockPrisma.expertSubscription.findUnique.mockResolvedValue({
      ...mockSubscription,
      status: "CANCELLED",
      currentPeriodEnd: new Date("2020-02-01"),
    });
    // Trial is also exhausted
    mockPrisma.freeTrialUsage.findUnique.mockResolvedValue({
      questionCount: 3,
    });

    const req = createPOST("/api/chat/sessions", { expertId: "expert-id-1" });
    const res = await createSession(req);
    const json = await res.json();

    expect(res.status).toBe(403);
  });

  // 4. POST /chat/sessions - returns 401 unauthenticated
  it("POST /chat/sessions - returns 401 unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createPOST("/api/chat/sessions", { expertId: "expert-id-1" });
    const res = await createSession(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toMatch(/unauthorized/i);
  });

  // 5. GET /chat/sessions/:id - returns session with messages
  it("GET /chat/sessions/:id - returns session with messages", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const sessionWithMessages = {
      ...mockChatSession,
      subscriberId: "subscriber-id-1",
      expertProfile: {
        displayName: "Expert User",
        twinGreeting: "Hello!",
        user: { id: "expert-id-1", name: "Expert User", image: null },
      },
      messages: [
        { id: "msg-1", role: "assistant", content: "Hello!", createdAt: new Date(), sender: null },
        { id: "msg-2", role: "user", content: "Hi!", createdAt: new Date(), sender: { id: "subscriber-id-1", name: "Subscriber User", image: null } },
      ],
    };
    mockPrisma.chatSession.findUnique.mockResolvedValue(sessionWithMessages);

    const req = createGET("/api/chat/sessions/session-id-1");
    const res = await getSession(req, sessionParams("session-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.messages).toHaveLength(2);
    expect(json.expertProfile.displayName).toBe("Expert User");
  });

  // 6. GET /chat/sessions/:id - non-owner gets 403
  it("GET /chat/sessions/:id - non-owner gets 403", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.chatSession.findUnique.mockResolvedValue({
      ...mockChatSession,
      subscriberId: "other-user-id",
    });

    const req = createGET("/api/chat/sessions/session-id-1");
    const res = await getSession(req, sessionParams("session-id-1"));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Forbidden");
  });

  // 7. DELETE /chat/sessions/:id - subscriber deletes their session
  it("DELETE /chat/sessions/:id - subscriber deletes their session", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.chatSession.findUnique.mockResolvedValue({
      ...mockChatSession,
      subscriberId: "subscriber-id-1",
    });
    mockPrisma.chatSession.delete.mockResolvedValue(mockChatSession);

    const req = createGET("/api/chat/sessions/session-id-1");
    const res = await deleteSession(req, sessionParams("session-id-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toMatch(/deleted/i);
    expect(mockPrisma.chatSession.delete).toHaveBeenCalledWith({
      where: { id: "session-id-1" },
    });
  });

  // 8. DELETE /chat/sessions/:id - non-owner gets 403
  it("DELETE /chat/sessions/:id - non-owner gets 403", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.chatSession.findUnique.mockResolvedValue({
      ...mockChatSession,
      subscriberId: "other-user-id",
    });

    const req = createGET("/api/chat/sessions/session-id-1");
    const res = await deleteSession(req, sessionParams("session-id-1"));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Forbidden");
  });

  // 9. POST /chat/sessions/:id/messages - sends message (request validation + user message creation)
  it("POST /chat/sessions/:id/messages - validates and creates user message", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    const sessionWithProfile = {
      ...mockChatSession,
      subscriberId: "subscriber-id-1",
      expertProfile: {
        userId: "expert-id-1",
        vectorNamespace: "expert_expert_user",
      },
      messages: [
        { role: "assistant", content: "Hello!" },
      ],
    };
    mockPrisma.chatSession.findUnique.mockResolvedValue(sessionWithProfile);
    mockPrisma.chatMessage.create.mockResolvedValue({
      id: "msg-new",
      chatSessionId: "session-id-1",
      senderId: "subscriber-id-1",
      role: "user",
      content: "Tell me about AI",
    });

    // Mock the streaming response from runChatEngine
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Sure"}}]}\n\n'));
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    (runChatEngine as jest.Mock).mockResolvedValue({
      stream: mockStream,
      sources: [],
      thinkingSteps: [],
    });

    // Also mock the post-stream saves
    mockPrisma.chatSession.update.mockResolvedValue({});

    const req = createPOST("/api/chat/sessions/session-id-1/messages", {
      content: "Tell me about AI",
    });
    const res = await sendMessage(req, sessionParams("session-id-1"));

    // Should return a streaming response
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const body = await res.text();
    expect(body).toContain('"done":true');

    // Verify user message was saved
    expect(mockPrisma.chatMessage.create).toHaveBeenCalledWith({
      data: {
        chatSessionId: "session-id-1",
        senderId: "subscriber-id-1",
        role: "user",
        content: "Tell me about AI",
      },
    });

    // Verify chat engine was called with correct params
    expect(runChatEngine).toHaveBeenCalledWith({
      expertId: "expert-id-1",
      subscriberId: "subscriber-id-1",
      query: "Tell me about AI",
      chatHistory: [{ role: "assistant", content: "Hello!", sources: undefined }],
      enableWebSearch: false,
      signal: expect.any(AbortSignal),
    });
  });
});
