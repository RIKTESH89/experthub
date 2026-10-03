import type { RetrievalScope } from "@/lib/knowledge/access";
import type { TemporalQuery } from "@/lib/graph/temporal/timeline";
import { retrieveEvidenceTrace } from "@/lib/graph/evidence-store";
import { retrieveTemporalEvidence } from "@/lib/graph/temporal/retriever";
import { planQuestion, RETRIEVAL_BUDGET } from "@/lib/retrieval/intent";
import { assembleBundle } from "@/lib/retrieval/bundle";
/** Local evaluation uses only existing live DB gates and deterministic EXP14 assembly.
 * It never invokes embedding, reranking, web search or generation providers. */
export async function retrieveLocalEvaluationEvidence(scope: RetrievalScope, query: string, temporal?: TemporalQuery) {
    if (!scope.expertProfileId || !scope.namespace)
        throw new Error("Local evaluation retrieval requires an authorized tenant scope");
    const plan = planQuestion(query, temporal);
    const candidates = plan.intent === "conversation" ? [] : Array.from(new Set(scope.allowedVectorIds)).sort().slice(0, RETRIEVAL_BUDGET.candidates).map(vectorId => ({ content: "", score: 0, metadata: { vectorId, expertProfileId: scope.expertProfileId, source: "local-evaluation-db-only" } }));
    const [assertions, timeline] = await Promise.all([retrieveEvidenceTrace(scope, candidates), retrieveTemporalEvidence(scope, candidates, plan.temporal)]);
    const bundle = assembleBundle(scope, plan, candidates, assertions, timeline);
    if (scope.allowedVectorIds.length > RETRIEVAL_BUDGET.candidates) {
        bundle.trace.truncated = true;
        bundle.gaps.push("Local evaluation candidate budget reached; coverage is bounded");
    }
    return bundle;
}
