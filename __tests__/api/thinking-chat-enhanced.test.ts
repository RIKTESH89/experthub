jest.mock("@/lib/persona/persistence", () => ({ authorizeChatPersistence: jest.fn(async () => {}) }));
import { syntheticPaidPeriod } from "../helpers/paid-period";
import { toMessageSources } from "@/lib/ai/citations";
import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import { mockExpertProfile, mockChatSession } from "../mocks/data";
import { createPOST } from "../helpers/request";

jest.mock("@/lib/prisma", () => ({ __esModule: true, default: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: mockAuth }));

// Mock the entire chat engine to test the messages route independently
const mockRunChatEngine = jest.fn();
jest.mock("@/lib/ai/chat-engine", () => ({
  runChatEngine: mockRunChatEngine,
}));

const mockCheckTrialAccess = jest.fn().mockResolvedValue({ allowed: true, used: 0, limit: 3 });
const mockIncrementTrialUsage = jest.fn();
jest.mock("@/lib/trial", () => ({
  checkTrialAccess: mockCheckTrialAccess,
  incrementTrialUsage: mockIncrementTrialUsage,
}));

const mockExtractMemories = jest.fn().mockResolvedValue([]);
jest.mock("@/lib/ai/memory-extractor", () => ({
  extractMemories: mockExtractMemories,
}));

const mockSaveMemories = jest.fn();
jest.mock("@/lib/ai/memory-manager", () => ({
  saveMemories: mockSaveMemories,
}));

import { POST as sendMessage } from "@/app/api/chat/sessions/[sessionId]/messages/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sessionParams(sessionId: string) {
  return { params: Promise.resolve({ sessionId }) };
}

function createMockSSEStream(content: string): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      const words = content.split(" ");
      for (const word of words) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ choices: [{ delta: { content: word + " " } }] })}\n\n`
          )
        );
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

async function readSSEStream(
  response: Response
): Promise<Array<Record<string, unknown>>> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const events: Array<Record<string, unknown>> = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    const lines = text.split("\n").filter((l) => l.startsWith("data: "));
    for (const line of lines) {
      try {
        events.push(JSON.parse(line.slice(6)));
      } catch {
        /* skip unparseable */
      }
    }
  }
  return events;
}

/**
 * Standard setup: authenticate as subscriber, return a valid chat session
 * with expertProfile included (matching the prisma include from the route).
 */
function setupAuthenticatedSession(overrides: Record<string, unknown> = {}) {
  mockAuth.mockResolvedValue(mockSession.subscriber);
  mockPrisma.expertSubscription.findUnique.mockResolvedValue({ status: "ACTIVE", tier: "PREMIUM", ...syntheticPaidPeriod });

  const defaultSession = {
    ...mockChatSession,
    isTrial: false,
    expertProfile: {
      userId: "expert-id-1",
      vectorNamespace: "expert_expert_user",
    },
    messages: [],
    ...overrides,
  };

  mockPrisma.chatSession.findUnique.mockResolvedValue(defaultSession);
  return defaultSession;
}

function setupDefaultChatEngine(
  content = "Hello world response",
  sources: Array<Record<string, unknown>> = [],
  thinkingSteps: string[] = []
) {
  mockRunChatEngine.mockResolvedValue({
    stream: createMockSSEStream(content),
    sources,
    thinkingSteps,
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

let consoleSpy: jest.SpyInstance;

beforeEach(() => {
  resetAllMocks();
  mockAuth.mockReset();
  mockRunChatEngine.mockReset();
  mockCheckTrialAccess.mockReset().mockResolvedValue({ allowed: true, used: 0, limit: 3 });
  mockIncrementTrialUsage.mockReset();
  mockExtractMemories.mockReset().mockResolvedValue([]);
  mockSaveMemories.mockReset();
  consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleSpy.mockRestore();
});

// ===========================================================================
// Enhanced Message Route with Thinking Steps
// ===========================================================================

describe("Enhanced Message Route - Thinking Steps in SSE Stream", () => {
  it("emits thinking steps before content events", async () => {
    setupAuthenticatedSession();
    setupDefaultChatEngine("This is an AI answer", [], [
      "Searching knowledge base...",
      "Found 3 relevant sources",
      "Formulating response...",
    ]);

    // Save user message mock
    mockPrisma.chatMessage.create.mockResolvedValue({ id: "msg-1" });

    const req = createPOST("/api/chat/sessions/session-id-1/messages", {
      content: "test question",
    });
    const res = await sendMessage(req, sessionParams("session-id-1"));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const events = await readSSEStream(res);

    // First 3 events should be thinking steps
    expect(events[0]).toEqual({ thinking: "Searching knowledge base..." });
    expect(events[1]).toEqual({ thinking: "Found 3 relevant sources" });
    expect(events[2]).toEqual({ thinking: "Formulating response..." });

    // Content events come after thinking events
    const contentEvents = events.filter((e) => "content" in e);
    expect(contentEvents.length).toBeGreaterThan(0);

    // All thinking events should appear before any content event
    const firstContentIndex = events.findIndex((e) => "content" in e);
    const lastThinkingIndex = events
      .map((e, i) => ("thinking" in e ? i : -1))
      .filter((i) => i >= 0)
      .pop()!;
    expect(lastThinkingIndex).toBeLessThan(firstContentIndex);

    // Final event should be done with sources
    const lastEvent = events[events.length - 1];
    expect(lastEvent).toHaveProperty("done", true);
    expect(lastEvent).toHaveProperty("sources");
  });

  it("goes straight to content when thinking steps are empty", async () => {
    setupAuthenticatedSession();
    setupDefaultChatEngine("Direct answer", [], []);

    mockPrisma.chatMessage.create.mockResolvedValue({ id: "msg-1" });

    const req = createPOST("/api/chat/sessions/session-id-1/messages", {
      content: "test question",
    });
    const res = await sendMessage(req, sessionParams("session-id-1"));
    const events = await readSSEStream(res);

    // No thinking events
    const thinkingEvents = events.filter((e) => "thinking" in e);
    expect(thinkingEvents).toHaveLength(0);

    // Content should be present
    const contentEvents = events.filter((e) => "content" in e);
    expect(contentEvents.length).toBeGreaterThan(0);

    // Done event at the end
    const lastEvent = events[events.length - 1];
    expect(lastEvent).toHaveProperty("done", true);
  });

  it("emits multiple thinking steps in correct order", async () => {
    setupAuthenticatedSession();
    const fiveSteps = [
      "Step 1: Analyzing query...",
      "Step 2: Searching vector store...",
      "Step 3: Found 5 matches",
      "Step 4: Exploring knowledge graph...",
      "Step 5: Formulating response...",
    ];
    setupDefaultChatEngine("Answer text", [], fiveSteps);

    mockPrisma.chatMessage.create.mockResolvedValue({ id: "msg-1" });

    const req = createPOST("/api/chat/sessions/session-id-1/messages", {
      content: "complex question",
    });
    const res = await sendMessage(req, sessionParams("session-id-1"));
    const events = await readSSEStream(res);

    const thinkingEvents = events.filter((e) => "thinking" in e);
    expect(thinkingEvents).toHaveLength(5);

    // Verify order
    expect(thinkingEvents[0]).toEqual({ thinking: "Step 1: Analyzing query..." });
    expect(thinkingEvents[1]).toEqual({ thinking: "Step 2: Searching vector store..." });
    expect(thinkingEvents[2]).toEqual({ thinking: "Step 3: Found 5 matches" });
    expect(thinkingEvents[3]).toEqual({ thinking: "Step 4: Exploring knowledge graph..." });
    expect(thinkingEvents[4]).toEqual({ thinking: "Step 5: Formulating response..." });

    // Each has the { thinking: "..." } format
    for (const evt of thinkingEvents) {
      expect(evt).toHaveProperty("thinking");
      expect(typeof evt.thinking).toBe("string");
    }
  });
});

// ===========================================================================
// Memory Extraction Integration
// ===========================================================================

describe("Enhanced Message Route - Memory Extraction", () => {
  it("fires memory extraction after response completes", async () => {
    setupAuthenticatedSession();
    setupDefaultChatEngine("I remember you like AI", [], []);

    mockPrisma.chatMessage.create.mockResolvedValue({ id: "msg-1" });
    mockPrisma.chatSession.update.mockResolvedValue({});
    mockPrisma.twinInteraction.create.mockResolvedValue({});
    mockExtractMemories.mockResolvedValue([
      { fact: "User is interested in AI", category: "preference" },
    ]);
    mockSaveMemories.mockResolvedValue(undefined);

    const req = createPOST("/api/chat/sessions/session-id-1/messages", {
      content: "I love studying AI",
    });
    const res = await sendMessage(req, sessionParams("session-id-1"));

    // Consume the entire stream so flush() fires
    await readSSEStream(res);

    // Wait briefly for fire-and-forget promises to resolve
    await new Promise((r) => setTimeout(r, 100));

    expect(mockExtractMemories).toHaveBeenCalledWith(
      "I love studying AI",
      expect.any(String),
      expect.any(AbortSignal)
    );
  });

  it("passes subscriberId to chat engine", async () => {
    setupAuthenticatedSession();
    setupDefaultChatEngine("response", [], []);

    mockPrisma.chatMessage.create.mockResolvedValue({ id: "msg-1" });

    const req = createPOST("/api/chat/sessions/session-id-1/messages", {
      content: "hello",
    });
    const res = await sendMessage(req, sessionParams("session-id-1"));
    await readSSEStream(res);

    expect(mockRunChatEngine).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriberId: "subscriber-id-1",
      })
    );
  });
});

// ===========================================================================
// Auth & Validation
// ===========================================================================

describe("Enhanced Message Route - Auth & Validation", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = createPOST("/api/chat/sessions/session-id-1/messages", {
      content: "hello",
    });
    const res = await sendMessage(req, sessionParams("session-id-1"));

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 404 when session not found", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);
    mockPrisma.chatSession.findUnique.mockResolvedValue(null);

    const req = createPOST("/api/chat/sessions/nonexistent/messages", {
      content: "hello",
    });
    const res = await sendMessage(req, sessionParams("nonexistent"));

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Chat session not found");
  });

  it("returns 403 when session belongs to a different user", async () => {
    mockAuth.mockResolvedValue(mockSession.subscriber);

    mockPrisma.chatSession.findUnique.mockResolvedValue({
      ...mockChatSession,
      subscriberId: "different-user-id",
      isTrial: false,
      expertProfile: {
        userId: "expert-id-1",
        vectorNamespace: "expert_expert_user",
      },
      messages: [],
    });

    const req = createPOST("/api/chat/sessions/session-id-1/messages", {
      content: "hello",
    });
    const res = await sendMessage(req, sessionParams("session-id-1"));

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Forbidden");
  });

  it("returns 400 for empty message content", async () => {
    setupAuthenticatedSession();

    const req = createPOST("/api/chat/sessions/session-id-1/messages", {
      content: "",
    });
    const res = await sendMessage(req, sessionParams("session-id-1"));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Validation failed");
  });

  it("returns 403 when trial is exhausted", async () => {
    setupAuthenticatedSession({ isTrial: true });
    mockCheckTrialAccess.mockResolvedValue({ allowed: false, used: 3, limit: 3 });

    const req = createPOST("/api/chat/sessions/session-id-1/messages", {
      content: "one more question",
    });
    const res = await sendMessage(req, sessionParams("session-id-1"));

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Free trial exhausted");
    expect(json.code).toBe("TRIAL_EXHAUSTED");
    expect(json.questionsUsed).toBe(3);
    expect(json.questionsAllowed).toBe(3);
  });
});

// ===========================================================================
// Response Saving
// ===========================================================================

describe("Enhanced Message Route - Response Saving", () => {
  it("saves assistant response to database after stream completes", async () => {
    setupAuthenticatedSession();
    setupDefaultChatEngine("Saved response text", [], []);

    mockPrisma.chatMessage.create.mockResolvedValue({ id: "msg-1" });
    mockPrisma.chatSession.update.mockResolvedValue({});
    mockPrisma.twinInteraction.create.mockResolvedValue({});

    const req = createPOST("/api/chat/sessions/session-id-1/messages", {
      content: "save this",
    });
    const res = await sendMessage(req, sessionParams("session-id-1"));

    // Must consume entire stream so the TransformStream flush() fires
    await readSSEStream(res);

    // Wait for flush to complete
    await new Promise((r) => setTimeout(r, 100));

    // Should have been called twice: once for user message, once for assistant
    expect(mockPrisma.chatMessage.create).toHaveBeenCalledTimes(2);

    // First call: user message
    expect(mockPrisma.chatMessage.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          chatSessionId: "session-id-1",
          role: "user",
          content: "save this",
          senderId: "subscriber-id-1",
        }),
      })
    );

    // Second call: assistant message
    expect(mockPrisma.chatMessage.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          chatSessionId: "session-id-1",
          role: "assistant",
          content: expect.stringContaining("Saved"),
        }),
      })
    );
  });

  it("records TwinInteraction analytics after stream completes", async () => {
    const mockSources = [
      { content: "source 1", score: 0.9, metadata: {} },
      { content: "source 2", score: 0.8, metadata: {} },
    ];
    setupAuthenticatedSession();
    setupDefaultChatEngine("analytics response", mockSources, []);

    mockPrisma.chatMessage.create.mockResolvedValue({ id: "msg-1" });
    mockPrisma.chatSession.update.mockResolvedValue({});
    mockPrisma.twinInteraction.create.mockResolvedValue({});

    const req = createPOST("/api/chat/sessions/session-id-1/messages", {
      content: "analytics question",
    });
    const res = await sendMessage(req, sessionParams("session-id-1"));

    // Consume the stream
    await readSSEStream(res);

    // Wait for fire-and-forget to complete
    await new Promise((r) => setTimeout(r, 100));

    expect(mockPrisma.twinInteraction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          expertProfileId: "profile-id-1",
          chatSessionId: "session-id-1",
          question: "analytics question",
          sourcesUsed: 2,
          isFromWidget: false,
        }),
      })
    );
  });
});

// ===========================================================================
// Chat Engine call verification
// ===========================================================================

describe("Enhanced Message Route - Chat Engine Integration", () => {
  it("passes correct parameters to runChatEngine", async () => {
    setupAuthenticatedSession();
    setupDefaultChatEngine("response", [], []);

    mockPrisma.chatMessage.create.mockResolvedValue({ id: "msg-1" });

    const req = createPOST("/api/chat/sessions/session-id-1/messages", {
      content: "What is machine learning?",
      enableWebSearch: true,
    });
    const res = await sendMessage(req, sessionParams("session-id-1"));
    await readSSEStream(res);

    expect(mockRunChatEngine).toHaveBeenCalledWith({
      expertId: "expert-id-1",
      subscriberId: "subscriber-id-1",
      query: "What is machine learning?",
      chatHistory: [],
      enableWebSearch: true,
      signal: expect.any(AbortSignal),
    });
  });

  it("passes chat history from existing messages", async () => {
    setupAuthenticatedSession({
      messages: [
        { role: "assistant", content: "Hello!", createdAt: new Date() },
        { role: "user", content: "Hi there", createdAt: new Date() },
      ],
    });
    setupDefaultChatEngine("follow-up response", [], []);

    mockPrisma.chatMessage.create.mockResolvedValue({ id: "msg-1" });

    const req = createPOST("/api/chat/sessions/session-id-1/messages", {
      content: "follow up question",
    });
    const res = await sendMessage(req, sessionParams("session-id-1"));
    await readSSEStream(res);

    expect(mockRunChatEngine).toHaveBeenCalledWith(
      expect.objectContaining({
        chatHistory: [
          { role: "user", content: "Hi there", sources: undefined },
          { role: "assistant", content: "Hello!", sources: undefined },
        ],
      })
    );
  });

  it("increments trial usage for trial sessions", async () => {
    setupAuthenticatedSession({ isTrial: true });
    setupDefaultChatEngine("trial response", [], []);

    mockPrisma.chatMessage.create.mockResolvedValue({ id: "msg-1" });

    const req = createPOST("/api/chat/sessions/session-id-1/messages", {
      content: "trial question",
    });
    const res = await sendMessage(req, sessionParams("session-id-1"));
    await readSSEStream(res);

    expect(mockCheckTrialAccess).toHaveBeenCalledWith(
      "subscriber-id-1",
      "profile-id-1"
    );
    expect(mockIncrementTrialUsage).toHaveBeenCalledWith(
      "subscriber-id-1",
      "profile-id-1"
    );
  });

  it("does not check trial access for non-trial sessions", async () => {
    setupAuthenticatedSession({ isTrial: false });
    setupDefaultChatEngine("paid response", [], []);

    mockPrisma.chatMessage.create.mockResolvedValue({ id: "msg-1" });

    const req = createPOST("/api/chat/sessions/session-id-1/messages", {
      content: "paid question",
    });
    const res = await sendMessage(req, sessionParams("session-id-1"));
    await readSSEStream(res);

    expect(mockCheckTrialAccess).not.toHaveBeenCalled();
    expect(mockIncrementTrialUsage).not.toHaveBeenCalled();
  });

  it("returns 500 when chat engine throws an error", async () => {
    setupAuthenticatedSession();
    mockRunChatEngine.mockRejectedValue(new Error("OpenAI API error"));

    mockPrisma.chatMessage.create.mockResolvedValue({ id: "msg-1" });

    const req = createPOST("/api/chat/sessions/session-id-1/messages", {
      content: "question",
    });
    const res = await sendMessage(req, sessionParams("session-id-1"));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Internal server error");
  });

  it("streams sources in the done event", async () => {
    const mockSources = [
      { content: "doc about AI", score: 0.95, metadata: { title: "AI Intro" } },
      { content: "ML basics", score: 0.88, metadata: { title: "ML Guide" } },
    ];
    setupAuthenticatedSession();
    setupDefaultChatEngine("answer with sources", mockSources, []);

    mockPrisma.chatMessage.create.mockResolvedValue({ id: "msg-1" });

    const req = createPOST("/api/chat/sessions/session-id-1/messages", {
      content: "question with sources",
    });
    const res = await sendMessage(req, sessionParams("session-id-1"));
    const events = await readSSEStream(res);

    const doneEvent = events.find((e) => e.done === true);
    expect(doneEvent).toBeDefined();
    expect(doneEvent!.sources).toEqual(toMessageSources(mockSources));
  });

  it("updates session timestamp after stream completes", async () => {
    setupAuthenticatedSession();
    setupDefaultChatEngine("timestamp response", [], []);

    mockPrisma.chatMessage.create.mockResolvedValue({ id: "msg-1" });
    mockPrisma.chatSession.update.mockResolvedValue({});
    mockPrisma.twinInteraction.create.mockResolvedValue({});

    const req = createPOST("/api/chat/sessions/session-id-1/messages", {
      content: "update timestamp",
    });
    const res = await sendMessage(req, sessionParams("session-id-1"));
    await readSSEStream(res);

    // Wait for flush to complete
    await new Promise((r) => setTimeout(r, 100));

    expect(mockPrisma.chatSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "session-id-1" },
        data: { updatedAt: expect.any(Date) },
      })
    );
  });
});
