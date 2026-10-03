import type { EvidenceBundle } from "@/lib/retrieval/bundle";
import { assembleBundle } from "@/lib/retrieval/bundle";
import { RETRIEVAL_BUDGET } from "@/lib/retrieval/intent";
import type { RetrievalScope } from "@/lib/knowledge/access";
import { retrieveEvidenceTrace } from "@/lib/graph/evidence-store";
import { retrieveTemporalEvidence } from "@/lib/graph/temporal/retriever";
/** Read-only live gates, no embeddings or model call. Include bounded current manifest
 * neighbors so a new dated supersession can invalidate an earlier selected assertion. */
export async function revalidateDialogueEvidence(scope: RetrievalScope, original: EvidenceBundle): Promise<EvidenceBundle> {
  const ids = Array.from(new Set(scope.allowedVectorIds)).sort().slice(0, RETRIEVAL_BUDGET.candidates);
  const candidates = ids.map(vectorId => ({content:"",score:0,metadata:{vectorId,expertProfileId:scope.expertProfileId}}));
  const [assertions,timeline] = await Promise.all([
    retrieveEvidenceTrace(scope,candidates), retrieveTemporalEvidence(scope,candidates,original.plan.temporal),
  ]);
  const fresh = assembleBundle(scope,original.plan,candidates,assertions,timeline);
  fresh.trace.failures = [...original.trace.failures];
  if (scope.allowedVectorIds.length > RETRIEVAL_BUDGET.candidates) fresh.trace.failures.push("release-revalidation-budget-exceeded");
  // Revalidation cannot introduce unseen claims or accept a changed immutable snapshot.
  const oldRows = [...original.evidenceTrace,...original.temporalTrace.stances];
  const unchanged = (row: typeof oldRows[number]) => oldRows.some(old => old.spanId === row.spanId && old.revisionId === row.revisionId && old.contentHash === row.contentHash && old.sourceVersion === row.sourceVersion && old.text === row.text);
  fresh.evidenceTrace = fresh.evidenceTrace.filter(unchanged);
  fresh.temporalTrace.stances = fresh.temporalTrace.stances.filter(unchanged);
  return fresh;
}
