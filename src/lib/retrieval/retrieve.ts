import type { RetrievalScope } from "@/lib/knowledge/access";
import type { TemporalQuery } from "@/lib/graph/temporal/timeline";
import { vectorStore } from "@/lib/vector/client";
import { generateEmbedding } from "@/lib/vector/embeddings";
import { retrieveEvidenceTrace } from "@/lib/graph/evidence-store";
import { retrieveTemporalEvidence } from "@/lib/graph/temporal/retriever";
import type { RetrievalResult } from "@/lib/vector/retriever";
import { assembleBundle, tokenUpperBound } from "./bundle";
import { planQuestion, RETRIEVAL_BUDGET } from "./intent";
import { checkSignal } from "@/lib/ai/request-lifecycle";
import { ACTIVE_TEMPORAL_READ_VERSION } from "@/lib/graph/temporal/read-policy";
/** v1 reads EXP12/13 only. Store authorization errors propagate; search failure is observable. */
export async function retrieveIntentEvidence(scope: RetrievalScope, question: string, temporal?: TemporalQuery, signal?: AbortSignal) {
  checkSignal(signal);
  if (!scope.namespace || !scope.expertProfileId) throw new Error("Retrieval requires tenant namespace");
  const started = performance.now(), plan = planQuestion(question,temporal,scope.temporalReadVersion ?? ACTIVE_TEMPORAL_READ_VERSION), failures: string[] = [];
  const search = plan.terms.join(" ");
  const [semantic,keyword] = plan.intent === "conversation" || !search || !scope.allowedVectorIds.length ? [[],[]] : await Promise.all([
    generateEmbedding(question, signal).then(v=>{checkSignal(signal);return vectorStore.query(scope.namespace,v,15,scope);}).catch(()=>{checkSignal(signal);failures.push("semantic-unavailable; lexical fallback");return [];}),
    vectorStore.keywordSearch(scope.namespace,search,15,scope).catch(()=>{failures.push("keyword-unavailable");return [];})
  ]);
  checkSignal(signal);
  const chunks: RetrievalResult[] = [], seen = new Set<string>(), allowed = new Set(scope.allowedVectorIds);
  for (let i=0;i<15;i++) for (const row of [keyword[i],semantic[i]]) {
    if (!row || seen.has(row.id) || !allowed.has(row.id) || row.metadata.expertProfileId!==scope.expertProfileId) continue;
    seen.add(row.id); chunks.push({content:row.content,score:row.score,metadata:{...row.metadata,vectorId:row.id}});
  }
  // Bounded source-backed graph candidates. Gate checks live source/revision/tenant/audience again.
  // Deterministic manifest order; candidate truncation is explicitly observable.
  if (plan.intent!=="conversation" && plan.terms.length) for (const id of Array.from(allowed).sort()) {
    if (chunks.length>=RETRIEVAL_BUDGET.candidates) break;
    if (!seen.has(id)) {seen.add(id);chunks.push({content:"",score:0,metadata:{vectorId:id,expertProfileId:scope.expertProfileId,source:"authorized-temporal-neighbor"}});}
  }
  const [assertions,timeline] = await Promise.all([retrieveEvidenceTrace(scope,chunks),retrieveTemporalEvidence(scope,chunks,plan.temporal)]);
  checkSignal(signal);
  const bundle = assembleBundle(scope,plan,chunks,assertions,timeline);
  bundle.trace.retrievalMs = performance.now()-started;
  bundle.trace.failures = failures.sort();
  bundle.trace.truncated ||= scope.allowedVectorIds.length>RETRIEVAL_BUDGET.candidates || assertions.length>=30 || timeline.stances.length+timeline.supersededStances.length>=100;
  if (bundle.trace.truncated) bundle.gaps.push("Candidate or context budget reached; further evidence may exist");
  bundle.trace.tokenUpperBound = tokenUpperBound([bundle.prompt,...bundle.gaps.map(gap=>`Evidence gap: ${gap}`)].join("\n"));
  return bundle;
}
