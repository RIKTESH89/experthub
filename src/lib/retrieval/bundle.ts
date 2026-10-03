import type { RetrievalScope } from "@/lib/knowledge/access";
import type { RetrievalResult } from "@/lib/vector/retriever";
import type { EvidenceTrace } from "@/lib/graph/evidence-store";
import type { TemporalRetrievalResult, TemporalStanceTrace } from "@/lib/graph/temporal/retriever";
import { READ_CONTRACT_VERSION, RETRIEVAL_BUDGET, terms, type RetrievalPlan } from "./intent";
export interface EvidenceBundle {
  version: typeof READ_CONTRACT_VERSION; plan: RetrievalPlan; sources: RetrievalResult[];
  evidenceTrace: EvidenceTrace[]; temporalTrace: TemporalRetrievalResult;
  prompt: string; gaps: string[]; trace: { candidates: number; selected: number; tokenUpperBound: number; hops: number; truncated: boolean; retrievalMs: number; failures: string[] };
}
// UTF-8 bytes conservatively bound byte-level tokenizer tokens, including non-English text.
export const tokenUpperBound = (text: string) => Buffer.byteLength(text, "utf8");
const overlap = (query: string[], text: string) => query.filter(t => terms(text).includes(t)).length;
/** Pure selection over live-authorized store output; never accepts a legacy graph description. */
export function assembleBundle(scope: RetrievalScope, plan: RetrievalPlan, chunks: RetrievalResult[], assertions: EvidenceTrace[], timeline: TemporalRetrievalResult): EvidenceBundle {
  const allowed = new Set(scope.allowedVectorIds);
  const safeChunks = chunks.filter(c => c.metadata.expertProfileId === scope.expertProfileId && typeof c.metadata.vectorId === "string" && allowed.has(c.metadata.vectorId)).slice(0, RETRIEVAL_BUDGET.candidates);
  const eligible = new Set(safeChunks.map(c => c.metadata.vectorId as string));
  const visible = (row: { chunkIds: string[] }) => row.chunkIds.some(id => eligible.has(id));
  const rows = [...timeline.stances, ...timeline.supersededStances].filter(visible).slice(0, RETRIEVAL_BUDGET.candidates);
  const supportScore = (row: {chunkIds: string[]}) => Math.max(0, ...safeChunks.filter(c=>row.chunkIds.includes(c.metadata.vectorId as string)).map(c=>Number.isFinite(c.score)?Math.max(0,Math.min(1,c.score)):0));
  const lexical = (s: TemporalStanceTrace) => overlap(plan.terms, [s.domain,s.context,s.action,s.situation,s.constraints,s.exceptions].filter(Boolean).join(" "));
  const seedIds = new Set(rows.filter(s => lexical(s) > 0).map(s => s.id));
  const related = new Set<string>();
  for (const relation of timeline.relations) {
    if (seedIds.has(relation.from) || seedIds.has(relation.to)) { related.add(relation.from); related.add(relation.to); }
  }
  // One hop to same source-declared domain for documented decision constraints/exceptions.
  if (plan.intent === "decision") for (const row of rows) {
    if (row.domain && rows.some(seed => seedIds.has(seed.id) && seed.domain === row.domain && seed.speaker === row.speaker && seed.origin === row.origin)) related.add(row.id);
  }
  type Candidate = { key: string; row: TemporalStanceTrace | EvidenceTrace; type: "stance" | "assertion"; score: number };
  const candidates: Candidate[] = rows.filter(s => seedIds.has(s.id) || related.has(s.id)).map(s => ({ key:s.id,row:s,type:"stance",score:lexical(s)*10 + supportScore(s) + (related.has(s.id)?5:0) + (plan.intent === "decision" && (s.constraints || s.exceptions)?4:0) }));
  for (const a of assertions.filter(visible).filter(a=>plan.temporal.mode!=="as-of" || !plan.temporal.knownAt || a.ingestedAt<=plan.temporal.knownAt).slice(0, RETRIEVAL_BUDGET.candidates)) {
    const score = overlap(plan.terms,a.text);
    if (score) candidates.push({key:a.assertionId+":"+a.spanId,row:a,type:"assertion",score:score*10 + supportScore(a) + Math.min(3,Math.max(0,a.weight))});
  }
  candidates.sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key));
  const candidateTruncated = candidates.length > RETRIEVAL_BUDGET.candidates;
  candidates.length = Math.min(candidates.length, RETRIEVAL_BUDGET.candidates);
  const selected: Candidate[] = [], seen = new Set<string>();
  const header = `Evidence contract ${READ_CONTRACT_VERSION}. Only currently authorized sources. Recorded time is not validity. Preserve attribution/endorsement and uncertainty; quotes/uploads are not owner views. Apply constraints/exceptions in their documented context. Missing evidence is UNKNOWN. Coverage is bounded, not exhaustive.\n`;
  let prompt = header, truncated = candidateTruncated;
  const record = (c: Candidate) => JSON.stringify({type:c.type,...c.row})+"\n";
  for (const c of candidates) {
    const identity = JSON.stringify([c.type,c.row.text.trim().toLowerCase(),c.row.speakerId,c.row.speakerRole,"polarity" in c.row ? [c.row.polarity,c.row.origin,c.row.context,c.row.constraints,c.row.validFrom,c.row.validUntil] : c.row.kind]);
    if (seen.has(identity)) continue;
    const addition = record(c);
    if (selected.length >= RETRIEVAL_BUDGET.evidence || tokenUpperBound(prompt+addition) > RETRIEVAL_BUDGET.tokens - 1024) { truncated = true; continue; }
    selected.push(c); seen.add(identity); prompt += addition;
  }
  const stanceIds = new Set(selected.filter(c=>c.type==="stance").map(c=>c.key));
  const relations = timeline.relations.filter(r=>stanceIds.has(r.from)&&stanceIds.has(r.to));
  for (const relation of relations) {
    const addition = JSON.stringify({recordType:"relation",...relation})+"\n";
    if (tokenUpperBound(prompt+addition)<=RETRIEVAL_BUDGET.tokens - 1024) prompt+=addition; else truncated=true;
  }
  const selectedSpans = new Set(selected.map(c=>c.row.spanId));
  const evidenceTrace = selected.filter(c=>c.type==="assertion").map(c=>c.row as EvidenceTrace);
  const temporalTrace = {...timeline,stances:timeline.stances.filter(s=>stanceIds.has(s.id)),supersededStances:timeline.supersededStances.filter(s=>stanceIds.has(s.id)),relations};
  const sources = safeChunks.filter(c=>selected.some(s=>s.row.chunkIds.includes(c.metadata.vectorId as string))).map(c=>({...c,content:selected.filter(s=>s.row.chunkIds.includes(c.metadata.vectorId as string)).map(s=>s.row.text).join("\n"),metadata:{...c.metadata,evidenceTrace:evidenceTrace.filter(s=>s.chunkIds.includes(c.metadata.vectorId as string)),temporalTrace:{...temporalTrace,stances:temporalTrace.stances.filter(s=>s.chunkIds.includes(c.metadata.vectorId as string)),supersededStances:temporalTrace.supersededStances.filter(s=>s.chunkIds.includes(c.metadata.vectorId as string)),relations:relations.filter(r=>r.evidenceSpanIds.every(id=>selectedSpans.has(id)))}}}));
  const gaps = !selected.length ? [plan.intent === "conversation" ? "No evidence needed for this conversational query" : "No relevant source-backed evidence within the authorized candidate budget"] : [];
  if (plan.temporal.mode === "as-of" && evidenceTrace.length) gaps.push("Assertion valid-time is unavailable; do not infer historical validity from ingestion or publication");
  if (plan.intent === "decision" && !temporalTrace.stances.some(s=>s.constraints)) gaps.push("Documented constraints unavailable in selected evidence");
  if (plan.intent === "decision" && !temporalTrace.stances.some(s=>s.exceptions)) gaps.push("Documented exceptions unavailable in selected evidence");
  if (plan.intent === "decision" && !temporalTrace.stances.some(s=>s.documentedReasons)) gaps.push("Documented reasons unavailable in selected evidence");
  if (plan.intent === "decision" && !temporalTrace.stances.some(s=>s.situation)) gaps.push("Documented situation unavailable in selected evidence");
  if (plan.intent === "comparison" && selected.length) {
    const missing = plan.terms.filter(term=>!selected.some(s=>terms(s.row.text).includes(term)));
    if (missing.length) gaps.push(`Comparison terms absent from selected evidence: ${missing.join(", ").slice(0,100)}`);
  }
  return {version:READ_CONTRACT_VERSION,plan,sources,evidenceTrace,temporalTrace,prompt,gaps,trace:{candidates:candidates.length,selected:selected.length,tokenUpperBound:tokenUpperBound([prompt,...gaps.map(gap=>`Evidence gap: ${gap}`)].join("\n")),hops:related.size?1:0,truncated,retrievalMs:0,failures:[]}};
}
