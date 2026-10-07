import { writeFileSync } from "fs";
import type { KnowledgeItem, Prisma } from "@prisma/client";
import fixture from "./fixtures/negative-projection.json";
import { extractTemporal, temporalIdentity, TEMPORAL_EXTRACTOR_VERSION as V1, TEMPORAL_PROJECTION_CANDIDATE_VERSION as V2, type TemporalProjectionVersion } from "@/lib/graph/temporal/extractor";
import { hashEvidence } from "@/lib/graph/evidence-extractor";
import { publishTemporal } from "@/lib/graph/temporal/publisher";
import type { TemporalStanceTrace } from "@/lib/graph/temporal/retriever";
import { resolveTimeline } from "@/lib/graph/temporal/timeline";
import { assembleBundle } from "@/lib/retrieval/bundle";
import { planQuestion, RETRIEVAL_BUDGET } from "@/lib/retrieval/intent";

// Capture actual parameterized INSERTs. This is a row adapter, not a SQL engine or live DB proof.
type Row = Record<string, unknown>;
function projectedStore() {
 const tables = new Map<string, Map<string, Row>>();
 const calls: string[] = [];
 const tx = { $executeRaw: jest.fn(async (parts: TemplateStringsArray, ...values: unknown[]) => {
  const sql = parts.join("?"); calls.push(sql);
  const match = sql.match(/INSERT INTO "(\w+)" \(([\s\S]*?)\) VALUES/)!;
  const columns = Array.from(match[2].matchAll(/"(\w+)"/g), m => m[1]);
  expect(columns).toHaveLength(values.length);
  expect(sql).toContain('ON CONFLICT ("id") DO NOTHING');
  const row = Object.fromEntries(columns.map((c, i) => [c, values[i]]));
  const table = tables.get(match[1]) || new Map<string, Row>();
  if (!table.has(row.id as string)) table.set(row.id as string, row);
  tables.set(match[1], table); return 1;
 }) } as unknown as Prisma.TransactionClient;
 const rows = (table: string) => Array.from(tables.get(table)?.values() || []);
 // Mirror the reader's span/stance join; nullable case fields are copied only from emitted case rows.
 const traces = (version: TemporalProjectionVersion): TemporalStanceTrace[] => rows("TemporalStance").filter(s => s.extractorVersion === version).map(s => {
  const span = rows("EvidenceSpan").find(p => p.id === s.spanId && p.revisionId === s.revisionId)!;
  const d = rows("EvidenceDecisionCase").find(d => d.stanceId === s.id && d.spanId === s.spanId);
  const fields = Object.fromEntries(["situation", "constraints", "chosenAction", "documentedReasons", "alternatives", "tradeoffs", "exceptions", "decisionType"].map(f => [f, d?.[f] ?? null]));
  return { ...span, ...s, ...fields, spanId: span.id, itemId: (span.chunkIds as string[])[0].split(":")[1], contentHash: hashEvidence(span.text), sourceVersion: 1, authorId: span.speakerId, uploaderId: "owner", audience: "public", publishedAt: null, publicationTimeBasis: "unavailable", sourceUpdatedAt: new Date("2026-01-01"), ingestedAt: new Date("2026-01-01"), recordedAt: new Date("2026-01-01") } as unknown as TemporalStanceTrace;
 });
 return {tx, rows, traces, calls};
}
async function project(store: ReturnType<typeof projectedStore>, text: string, id: string, version: TemporalProjectionVersion = V1, author: string | null = "owner") {
 const item = {id, expertProfileId: "tenant-a", sourceVersion: 1} as KnowledgeItem;
 await publishTemporal(store.tx, "r-" + id, item, "owner", text, author, version);
}
const scope = {expertProfileId: "tenant-a", namespace: "a", isOwner: false, allowedVectorIds: ["tenant-a:p:v1:chunk_0", "tenant-a:n:v1:chunk_0"]};
function bundle(rows: TemporalStanceTrace[], question = "Should I choose JetStream?", allowed = scope.allowedVectorIds) {
 const plan = planQuestion(question), chunks = scope.allowedVectorIds.map(vectorId => ({content: "", score: 1, metadata: {expertProfileId: scope.expertProfileId, vectorId}}));
 if (plan.temporal.mode === "current") plan.temporal.now = new Date("2026-10-07T00:00:00Z");
 return assembleBundle({...scope, allowedVectorIds: allowed}, plan, chunks, [], resolveTimeline(rows, plan.temporal));
}

test("default v1 retains the original projection gap and identity; v2 is opt-in", async () => {
 const store = projectedStore(); await project(store, fixture.negative, "n");
 const v1 = extractTemporal(fixture.negative, "owner", "owner")[0];
 expect(v1.decisionType).toBeNull(); expect(v1.constraints).toBe("two engineers");
 expect(temporalIdentity("r-n", "span", v1)).toBe(hashEvidence(["r-n", "span", "literal-temporal-decision-v1", v1]));
 expect(store.rows("EvidenceDecisionCase")).toEqual([]);
 expect(store.traces(V1)[0]).toMatchObject({polarity: "negative", constraints: null, documentedReasons: null, exceptions: null});
 await project(store, fixture.negative, "n", V2);
 expect(store.rows("TemporalStance")).toHaveLength(2); expect(store.rows("EvidenceSpan")).toHaveLength(1);
 expect(store.traces(V1)[0].constraints).toBeNull(); expect(store.traces(V2)[0].constraints).toBe("two engineers");
});

test("raw opposite preferences persist exact v2 fields, links, negative polarity and contextual counterevidence", async () => {
 const store = projectedStore(); await project(store, fixture.positive, "p", V2); await project(store, fixture.negative, "n", V2);
 const traces = store.traces(V2), negative = traces.find(s => s.polarity === "negative")!;
 expect(negative).toMatchObject({text: fixture.negative, category: "preference", polarity: "negative", action: "JetStream", chosenAction: "JetStream", situation: "small teams", constraints: "two engineers", documentedReasons: "maintenance", exceptions: "audited workloads", alternatives: null, tradeoffs: null, decisionType: "recommendation", origin: "expert-authored", endorsedByOwner: true, extractorVersion: V2});
 for (const d of store.rows("EvidenceDecisionCase")) {
  const stance = store.rows("TemporalStance").find(s => s.id === d.stanceId)!;
  expect(d.spanId).toBe(stance.spanId); expect(d.extractorVersion).toBe(stance.extractorVersion);
 }
 const result = bundle(traces);
 expect(result.temporalTrace.stances).toHaveLength(2);
 expect(result.temporalTrace.relations[0]).toMatchObject({type: "contradiction", kind: "inferred", uncertainty: "valid-time-unknown; do not resolve by recorded recency"});
 expect(result.prompt).toContain('"polarity":"negative"'); expect(result.prompt).toContain('"documentedReasons":"maintenance"'); expect(result.prompt).toContain("audited workloads");
 expect(result.trace.tokenUpperBound).toBeLessThanOrEqual(4096); expect(result.trace.hops).toBeLessThanOrEqual(1);
 expect(result.trace.selected).toBeLessThanOrEqual(12); expect(result.trace.candidates).toBeLessThanOrEqual(100);
 expect(RETRIEVAL_BUDGET).toMatchObject({candidates:100,evidence:12,tokens:4096,hops:1});
});

test("v2 replay is idempotent and leaves v1 rows unchanged", async () => {
 const store = projectedStore(); await project(store, fixture.negative, "n");
 const retained = JSON.stringify(store.rows("TemporalStance"));
 await project(store, fixture.negative, "n", V2); const before = JSON.stringify([...store.rows("EvidenceSpan"), ...store.rows("TemporalStance"), ...store.rows("EvidenceDecisionCase")]);
 await project(store, fixture.negative, "n", V2);
 expect(JSON.stringify([...store.rows("EvidenceSpan"), ...store.rows("TemporalStance"), ...store.rows("EvidenceDecisionCase")])).toBe(before);
 expect(JSON.stringify(store.rows("TemporalStance").filter(s => s.extractorVersion === V1))).toBe(retained);
});

test("only negative preference case assignment changes; absent fields, boundaries and unsupported grammar remain unknown", async () => {
 for (const text of Object.values(fixture)) {
  const old = extractTemporal(text, "owner", "owner", V1), next = extractTemporal(text, "owner", "owner", V2);
  expect(next).toEqual(old.map(s => ({...s, decisionType: s.category === "preference" && s.polarity === "negative" ? "recommendation" : s.decisionType})));
 }
 expect(extractTemporal(fixture.unsupported, "owner", "owner", V2)).toEqual([]);
 const store = projectedStore(); await project(store, fixture.missing, "missing", V2); await project(store, fixture.boundary, "boundary", V2);
 expect(store.traces(V2).find(s => s.itemId === "missing")).toMatchObject({constraints:null, documentedReasons:null, exceptions:null, situation:null});
 expect(store.rows("EvidenceDecisionCase")).toHaveLength(1);
 expect(() => extractTemporal(fixture.negative, "owner", "owner", "unknown" as TemporalProjectionVersion)).toThrow("Unsupported");
});

test.each([[null, "unattributed-upload"], ["visitor", "third-party-description"]] as const)("negative fields preserve %s attribution", async (author, origin) => {
 const store = projectedStore(); await project(store, fixture.negative, "n", V2, author);
 expect(store.traces(V2)[0]).toMatchObject({origin, endorsedByOwner:false, documentedReasons:"maintenance", constraints:"two engineers"});
});

test("quoted visitor stays source-local and cannot create an expert contradiction", async () => {
 const store = projectedStore(); await project(store, fixture.positive, "p", V2);
 await project(store, `Visitor claimed: "${fixture.negative}"`, "n", V2);
 expect(store.traces(V2).find(s => s.itemId === "n")).toMatchObject({speaker:"n:quoted:Visitor",origin:"visitor-claim",endorsedByOwner:false,constraints:"two engineers"});
 expect(bundle(store.traces(V2)).temporalTrace.relations).toEqual([]);
});

test.each([ ["two engineers", "large teams"], ["ten engineers", "small teams"] ])("distinct constraint/context (%s, %s) does not create a contradiction", async (constraint, context) => {
 const store = projectedStore(); await project(store, fixture.positive, "p", V2);
 await project(store, fixture.negative.replace("two engineers", constraint).replace("small teams", context), "n", V2);
 expect(bundle(store.traces(V2)).temporalTrace.relations).toEqual([]);
});

test("projected negative fields retain current/as-of/known-at filtering and unknown topic gaps", async () => {
 const store = projectedStore();
 await project(store, "From 2024-01-01 until 2025-01-01, " + fixture.positive, "p", V2);
 await project(store, "From 2025-01-01, " + fixture.negative, "n", V2);
 expect(bundle(store.traces(V2), "As of 2024-06-01, should I choose JetStream?").temporalTrace.stances.map(s => s.polarity)).toEqual(["positive"]);
 expect(bundle(store.traces(V2)).temporalTrace.stances.map(s => s.polarity)).toEqual(["negative"]);
 expect(resolveTimeline(store.traces(V2), {mode:"as-of",validAt:new Date("2025-06-01"),knownAt:new Date("2025-12-31")}).stances).toEqual([]);
 const unknown = bundle(store.traces(V2), "Quantum orchids"); expect(unknown.sources).toEqual([]); expect(unknown.gaps[0]).toContain("No relevant");
});

test("revoked/unauthorized negative fields cannot enter bundle, relations, rank or citations", async () => {
 const store = projectedStore(); await project(store, fixture.positive, "p", V2); await project(store, fixture.negative, "n", V2);
 const result = bundle(store.traces(V2), "Should I choose JetStream?", [scope.allowedVectorIds[0]]);
 expect(result.temporalTrace.stances.map(s => s.polarity)).toEqual(["positive"]); expect(result.temporalTrace.relations).toEqual([]);
 expect(result.prompt).not.toContain("maintenance"); expect(result.sources).toHaveLength(1); expect(result.trace.candidates).toBe(1);
 expect(bundle(store.traces(V2), "As of 2026-01-01, JetStream", []).trace.selected).toBe(0);
});

import golden from "./fixtures/negative-projection-v1-golden.json";
test("v1 outputs and identities match immutable accepted-base fixtures byte for byte", () => {
 for (const sample of golden.cases) {
  const extraction = extractTemporal(sample.content, "owner", "owner");
  expect(JSON.stringify(extraction)).toBe(JSON.stringify(sample.extraction));
  expect(extraction.map(s => temporalIdentity("revision", "span", s))).toEqual(sample.identities);
 }
});


test("record raw-source to emitted projected rows and bounded bundle as local candidate evidence", async () => {
 const store = projectedStore();
 for (const version of [V1,V2] as const) {
  await project(store, fixture.positive, "p", version); await project(store, fixture.negative, "n", version);
 }
 const output = {method:"Offline capture of actual publisher parameterized INSERT values, adapter of exact span/stance/case join, real timeline and bundle. No native SQL, authorization-store, provider or model execution.", activeVersion:V1,candidateVersion:V2,rawSources:fixture,spans:store.rows("EvidenceSpan"),stances:store.rows("TemporalStance"),decisionCases:store.rows("EvidenceDecisionCase"),v1:bundle(store.traces(V1)),v2:bundle(store.traces(V2))};
 expect(output.v1.temporalTrace.relations).toEqual([]);
 expect(output.v2.temporalTrace.relations).toHaveLength(1);
 expect(output.v2.trace.tokenUpperBound).toBeLessThanOrEqual(4096);
 writeFileSync("audit/exp14/negative-projection-v2/row-fixture.json",JSON.stringify(output,null,2)+"\n");
});
