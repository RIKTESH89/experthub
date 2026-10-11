import { temporalQueryFromQuestion, type TemporalQuery } from "@/lib/graph/temporal/timeline";
import { TEMPORAL_QUERY_NEEDS_VERSION } from "@/lib/graph/temporal/read-policy";
export const READ_CONTRACT_VERSION = "intent-evidence-v1";
export const RETRIEVAL_BUDGET = Object.freeze({ candidates: 100, chunks: 30, evidence: 12, tokens: 4096, hops: 1 });
export type Intent = "factual" | "stance" | "decision" | "biography" | "comparison" | "conversation";
const stop = new Set("as of what when where which who why how is are was were does do did a an the to in on for and or about me you your their they currently now should would could recommend prefer choose decision stance opinion current think believe view advice compare versus vs tell please with have has from it this that".split(" "));
export function terms(text: string, limit = 24): string[] {
  return Array.from(new Set(text.toLowerCase().split(/[^a-z0-9\u0080-\uffff]+/).filter(t => t.length > 1 && !stop.has(t) && !/^\d+$/.test(t)))).slice(0, limit);
}
/** Unlabelled planner calls retain v3 grammar. Serving passes the pinned read
 * policy explicitly, so old releases do not acquire new query-facet semantics. */
export function planQuestion(question: string, temporal?: TemporalQuery, temporalReadVersion?: string) {
  if (!question.trim() || question.length > 8000) throw new Error("Invalid retrieval question");
  const text = question.replace(/^\s*As of \d{4}-\d{2}-\d{2}\b[,\s]*/i, "");
  const intent: Intent = /\b(should|advice|recommend|choose|decision|constraints?|tradeoffs?)\b/i.test(text) ? "decision"
    : /\b(compare|versus|vs|difference)\b/i.test(text) ? "comparison"
    : /\b(think|believe|stance|prefer|opinion|view)\b/i.test(text) ? "stance"
    : /\b(born|biography|career|worked|education)\b/i.test(text) ? "biography"
    : /^(hello|hi|thanks|thank you|bye)[!.\s]*$/i.test(text.trim()) ? "conversation" : "factual";
  const needs = intent === "decision" ? ["position", "situation", "constraints", "reasons", "exceptions", "counterevidence"] : intent === "stance" || intent === "comparison" ? ["position", "counterevidence"] : ["source-facts"];
  // These explicit field names are source requests, not semantic paraphrase or
  // inferred decision intent. Do not expand bare "why" or manufacture reasons.
  if (temporalReadVersion === TEMPORAL_QUERY_NEEDS_VERSION) {
    if (/\bexceptions?\b/i.test(text) && !needs.includes("exceptions")) needs.push("exceptions");
    if (/\b(?:reasons?|rationale)\b/i.test(text) && !needs.includes("reasons")) needs.push("reasons");
  }
  return { version: READ_CONTRACT_VERSION, intent, terms: terms(text), temporal: temporal || temporalQueryFromQuestion(question) || { mode: "current" as const }, needs };
}
export type RetrievalPlan = ReturnType<typeof planQuestion>;
