import type { RetrievalResult } from "@/lib/vector/retriever";
import type { EvidenceBundle } from "@/lib/retrieval/bundle";
/** Response provenance is strictly the accepted evidence subset, including chunk text and nested traces. */
export function acceptedEvidence(bundle: EvidenceBundle, spanIds: string[], audience: "owner" | "viewer") {
  const accepted = new Set(spanIds);
  const evidenceTrace = bundle.evidenceTrace.filter(r => accepted.has(r.spanId));
  const stances = bundle.temporalTrace.stances.filter(r => accepted.has(r.spanId));
  const rows = [...evidenceTrace,...stances];
  const temporalTrace = {...bundle.temporalTrace,stances,supersededStances:[],relations:bundle.temporalTrace.relations.filter(r => r.evidenceSpanIds.every(id => accepted.has(id)))};
  const sources: RetrievalResult[] = bundle.sources.filter(s => rows.some(r => r.chunkIds.includes(s.metadata.vectorId as string))).map(s => ({...s,
    content:rows.filter(r => r.chunkIds.includes(s.metadata.vectorId as string)).map(r => r.text).join("\n"),
    metadata:{...s.metadata,generationAudience:audience,
      evidenceTrace:evidenceTrace.filter(r => r.chunkIds.includes(s.metadata.vectorId as string)),
      temporalTrace:{...temporalTrace,stances:stances.filter(r => r.chunkIds.includes(s.metadata.vectorId as string))}},
  }));
  return {sources,evidenceTrace,temporalTrace};
}
