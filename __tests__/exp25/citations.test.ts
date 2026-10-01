import { toMessageSources } from "@/lib/ai/citations";
import { createSSEDecoder } from "@/lib/ai/sse";
import { isPublicRoute, isWithin, pageRoles } from "@/lib/route-access";
test("citation transport retains exact authorized revision/span and attribution without arbitrary metadata", () => {
  const result = toMessageSources([{ content: "I prefer reversible trials.", score: 0.8, metadata: {
    title: "Decision", expertProfileId: "expert", vectorId: "v1", secret: "must-not-ship",
    evidenceTrace: [{ revisionId: "rev1", spanId: "span1", start: 0, end: 26, text: "I prefer reversible trials.", speakerRole: "author", endorsedByOwner: true, kind: "explicit", secret: "hidden" }],
    temporalTrace: { mode: "as-of", validAt: "2025-01-01", coverage: "selected", stances: [{ revisionId: "rev1", spanId: "span1", origin: "expert-authored", validFrom: "2024-01-01", documentedReasons: null }], relations: [] },
  } }]);
  expect(result[0]).toMatchObject({ title: "Decision", snippet: "I prefer reversible trials.", metadata: {
    evidenceTrace: [{ revisionId: "rev1", spanId: "span1", speakerRole: "author", endorsedByOwner: true, text: "I prefer reversible trials." }],
    temporalTrace: { mode: "as-of", stances: [{ origin: "expert-authored", documentedReasons: null }] },
  } });
  expect(JSON.stringify(result)).not.toContain("secret");
  expect(toMessageSources(JSON.parse(JSON.stringify(result)))).toEqual(result);
});
test("SSE survives every byte boundary including multibyte text, CRLF and a final unterminated line", () => {
  const text = 'data: {"content":"नमस्ते"}\r\n\r\ndata: {"done":true,"sources":[{"revisionId":"r1","spanId":"s1"}]}';
  const bytes = new TextEncoder().encode(text);
  for (let split = 1; split < bytes.length; split++) {
    const decoder = createSSEDecoder();
    const events = [...decoder.push(bytes.slice(0, split)), ...decoder.push(bytes.slice(split)), ...decoder.push(undefined, true)].map(value => JSON.parse(value));
    expect(events).toEqual([{ content: "नमस्ते" }, { done: true, sources: [{ revisionId: "r1", spanId: "s1" }] }]);
  }
});
test("public route boundaries do not authorize similarly prefixed or dotted protected paths", () => {
  expect(isPublicRoute("/api/payments/webhook")).toBe(true);
  expect(isPublicRoute("/api/expert-applications")).toBe(true);
  for (const path of ["/api/payments/webhook/extra", "/api/authz", "/api/admin/users/a.b", "/api/expert-applications/admin", "/api/expert/pricing"]) expect(isPublicRoute(path)).toBe(false);
  expect(isWithin("/api/experts", "/api/expert")).toBe(false);
  expect(pageRoles("/experts")).toBeNull();
  expect(pageRoles("/expert/settings")).toEqual(["EXPERT", "ADMIN"]);
});
