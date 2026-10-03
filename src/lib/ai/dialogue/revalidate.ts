import type { EvidenceBundle } from "@/lib/retrieval/bundle";
import { RETRIEVAL_BUDGET } from "@/lib/retrieval/intent";
import type { RetrievalScope } from "@/lib/knowledge/access";
import { retrieveEvidenceTrace, authorizedEvidenceSpans } from "@/lib/graph/evidence-store";
import { retrieveTemporalEvidence } from "@/lib/graph/temporal/retriever";
import prisma from "@/lib/prisma";
/** Revalidation is a security decision, not prompt selection: no lexical ranking or
 * token budget may discard invalidations. Reads are bounded and permission-gated.
 * Corpus-wide temporal completeness is unavailable above the existing store budget. */
export async function revalidateDialogueEvidence(scope: RetrievalScope, original: EvidenceBundle): Promise<EvidenceBundle> {
  const oldRows = [...original.evidenceTrace,...original.temporalTrace.stances];
  if (!oldRows.length) return {...original,sources:[],evidenceTrace:[],temporalTrace:{...original.temporalTrace,stances:[],supersededStances:[],relations:[]}};
  const oldSpans = new Set(oldRows.map(r => r.spanId));
  const allowed = new Set(scope.allowedVectorIds);
  const selectedIds = Array.from(new Set(oldRows.flatMap(r => r.chunkIds))).filter(id => allowed.has(id));
  const candidate = (vectorId: string) => ({content:"",score:0,metadata:{vectorId,expertProfileId:scope.expertProfileId}});
  const corpusCovered = allowed.size <= RETRIEVAL_BUDGET.candidates;
  const exactCovered = selectedIds.length <= RETRIEVAL_BUDGET.chunks;
  const exact = exactCovered ? selectedIds.map(candidate) : [];
  const temporalCandidates = corpusCovered ? Array.from(allowed).sort().map(candidate) : exact;
  const [assertions,timeline,coverageSpans] = await Promise.all([
    retrieveEvidenceTrace(scope,exact), retrieveTemporalEvidence(scope,temporalCandidates,original.plan.temporal),
    authorizedEvidenceSpans(scope,temporalCandidates),
  ]);
  const unchanged = (row: typeof oldRows[number]) => oldRows.some(old => old.spanId === row.spanId && old.revisionId === row.revisionId && old.contentHash === row.contentHash && old.sourceVersion === row.sourceVersion && old.text === row.text);
  const failures = [...original.trace.failures];
  if (!corpusCovered || !exactCovered || coverageSpans.length >= 100) failures.push("release-temporal-coverage-unavailable");
  const evidenceTrace = assertions.filter(unchanged);
  const temporalTrace = {...timeline,
    stances:timeline.stances.filter(unchanged),
    // Independent invalidation channel: retain original-span supersession and conflicts
    // even when the invalidating statement is irrelevant or too large for a prompt.
    supersededStances:timeline.supersededStances.filter(r => oldSpans.has(r.spanId)),
    relations:timeline.relations.filter(r => r.evidenceSpanIds.some(id => oldSpans.has(id))),
  };
  const rows = [...evidenceTrace,...temporalTrace.stances];
  const items = rows.length ? await prisma.knowledgeItem.findMany({
    where:{expertProfileId:scope.expertProfileId,isIndexed:true,OR:rows.map(r=>({id:r.itemId,sourceVersion:r.sourceVersion}))},
    select:{id:true,expertProfileId:true,title:true,sourceType:true,sourceId:true,sourceVersion:true,indexedVersion:true,vectorIds:true},
  }) : [];
  const sources = original.sources.flatMap(source => {
    const vectorId = source.metadata.vectorId;
    if (typeof vectorId !== "string" || !allowed.has(vectorId)) return [];
    const supported = rows.filter(r => r.chunkIds.includes(vectorId));
    const item = items.find(i => i.expertProfileId === scope.expertProfileId && i.sourceVersion === i.indexedVersion && i.vectorIds.includes(vectorId) && supported.some(r=>r.itemId === i.id && r.sourceVersion === i.sourceVersion));
    if (!item) return [];
    return [{...source,content:supported.map(r=>r.text).join("\n"),metadata:{vectorId,expertProfileId:scope.expertProfileId,title:item.title,knowledgeItemId:item.id,sourceType:item.sourceType,sourceId:item.sourceId,sourceVersion:item.sourceVersion}}];
  });
  return {...original,sources,evidenceTrace,temporalTrace,trace:{...original.trace,failures:Array.from(new Set(failures))}};
}
