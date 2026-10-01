import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
const mockEmbed = jest.fn();

jest.mock("@/lib/vector/embeddings", () => ({ ...jest.requireActual("@/lib/vector/embeddings"), generateEmbedding: mockEmbed }));
jest.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "synthetic-citation-viewer", role: "SUBSCRIBER" } }) }));
import { syncPostSource } from "@/lib/knowledge/lifecycle";
import { POST as send } from "@/app/api/chat/sessions/[sessionId]/messages/route";
import { POST as rate } from "@/app/api/chat/sessions/[sessionId]/messages/[messageId]/rate/route";
import { GET as load } from "@/app/api/chat/sessions/[sessionId]/route";
const params = { params: Promise.resolve({ sessionId: "synthetic-citation-session" }) };
const request = (body?: object) => new NextRequest("http://localhost/api/chat/sessions/synthetic-citation-session", { method: body ? "POST" : "GET", ...(body ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } } : {}) });
beforeEach(async () => {
 const db = await prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`; if (db[0]?.name !== "experthub_phase0_test") throw new Error("Unsafe DB");
 await prisma.$executeRawUnsafe('TRUNCATE "PaymentEvent", "KnowledgeLifecycleJob", "VectorChunk", "User" CASCADE');
 await prisma.user.create({ data: { id: "synthetic-citation-owner", email: "citation-owner@example.invalid", role: "EXPERT", expertProfile: { create: { id: "synthetic-citation-expert", displayName: "Citation Expert", specialty: [], vectorNamespace: "synthetic-citations" } } } });
 await prisma.user.create({ data: { id: "synthetic-citation-viewer", email: "citation-viewer@example.invalid" } });
 await prisma.expertSubscription.create({ data: { subscriberId: "synthetic-citation-viewer", expertProfileId: "synthetic-citation-expert", tier: "PREMIUM", ...syntheticPaidPeriod, price: 10, status: "ACTIVE" } });
 await prisma.chatSession.create({ data: { id: "synthetic-citation-session", subscriberId: "synthetic-citation-viewer", expertProfileId: "synthetic-citation-expert" } });
 mockEmbed.mockResolvedValue(Array.from({ length: 1536 }, (_, index) => index === 0 ? 1 : 0));
 for (const [id, action, premium] of [["public", "monolith", false], ["premium", "services", true]] as const) {
   await prisma.post.create({ data: { id: `synthetic-citation-${id}`, authorId: "synthetic-citation-owner", title: `Architecture ${id}`, content: `I prefer ${action}.\nFrom 2025-01-01, In software architecture, For small teams, I prefer ${action} because capacity is limited.`, status: "PUBLISHED", isRagEnabled: true, isPremiumOnly: premium } });
   await syncPostSource(`synthetic-citation-${id}`);
 }
 global.fetch = jest.fn(async (_url, options) => {
   const body = JSON.parse(String(options?.body));
   if (!body.stream) return new Response(JSON.stringify({ choices: [{ message: { content: "1,2" } }] }), { headers: { "Content-Type": "application/json" } });
   const bytes = new TextEncoder().encode('data: '+JSON.stringify({ choices: [{ delta: { content: "नमस्ते synthetic response" } }] })+'\n\ndata: [DONE]\n\n');
   return new Response(new ReadableStream<Uint8Array>({ start(controller) { for (const byte of Array.from(bytes)) controller.enqueue(Uint8Array.of(byte)); controller.close(); } }), { headers: { "Content-Type": "text/event-stream" } });
 });
});
afterAll(async () => { await prisma.$disconnect(); });
test("actual chat engine/route retains PostgreSQL revision/span/attribution through fragmented stream and reload", async () => {
 const response = await send(request({ content: "As of 2025-06-01, what architecture is preferred?" }), params);
 expect(response.status).toBe(200);
 const wire = await response.text();
 expect(wire).toContain("नमस्ते synthetic response");
 const events = wire.split("\n").filter(line => line.startsWith("data: ")).map(line => JSON.parse(line.slice(6)));
 const done = events.find(event => event.done);
 const sources = done?.sources;
 expect(typeof done?.messageId).toBe("string");
 expect(sources).toHaveLength(2);
 const trace = sources[0].metadata.evidenceTrace[0];
 expect(trace).toMatchObject({ speakerRole: "author", endorsedByOwner: true, kind: "explicit" });
 const span = await prisma.evidenceSpan.findUniqueOrThrow({ where: { id: trace.spanId } });
 expect(trace.revisionId).toBe(span.revisionId); expect(trace.text).toBe(span.text); expect(trace.start).toBe(span.start); expect(trace.end).toBe(span.end);
 expect(sources[0].metadata.temporalTrace).toMatchObject({ mode: "as-of", validAt: "2025-06-01T00:00:00.000Z" });
 const session = await (await load(request(), params)).json();
 const saved = session.messages.find((message: { role: string }) => message.role === "assistant");
 expect(saved.id).toBe(done.messageId);
 const rated = await rate(request({ rating: 1 }), { params: Promise.resolve({ sessionId: "synthetic-citation-session", messageId: done.messageId }) });
 expect(rated.status).toBe(200); expect((await prisma.chatMessage.findUniqueOrThrow({ where: { id: done.messageId } })).rating).toBe(1);
 expect(saved.content).toBe("नमस्ते synthetic response"); expect(saved.sources).toEqual(sources);
 const { writeFileSync } = await import("fs"); writeFileSync("audit/exp25-26/citation-wire.json", JSON.stringify({ synthetic: true, model: "in-process fake, every-byte fragmentation", sources, reloadedSources: saved.sources }, null, 2));
});
test("reload removes restricted, edited and unpublished citation metadata immediately", async () => {
 await (await send(request({ content: "architecture" }), params)).text();
 await prisma.expertSubscription.updateMany({ data: { tier: "FREE" } });
 let session = await (await load(request(), params)).json();
 let sources = session.messages.find((message: { role: string }) => message.role === "assistant").sources;
 expect(sources).toHaveLength(1); expect(sources[0].title).toBe("Architecture public");
 expect(JSON.stringify(sources)).not.toContain("Architecture premium");
 await prisma.post.update({ where: { id: "synthetic-citation-public" }, data: { content: "Edited current content" } });
 session = await (await load(request(), params)).json(); expect(session.messages.find((message: { role: string }) => message.role === "assistant").sources).toEqual([]);
 await syncPostSource("synthetic-citation-public");
 await prisma.post.update({ where: { id: "synthetic-citation-public" }, data: { status: "DRAFT" } });
 session = await (await load(request(), params)).json(); expect(session.messages.find((message: { role: string }) => message.role === "assistant").sources).toEqual([]);
});

import { syntheticPaidPeriod } from "../../__tests__/helpers/paid-period";
