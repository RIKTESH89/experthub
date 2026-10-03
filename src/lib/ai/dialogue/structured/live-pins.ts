import type { EvidenceBundle } from "@/lib/retrieval/bundle";
/** Live adapter output cannot introduce evidence absent from the original EXP14 bundle.
 * Invalidations remain independent: newly found conflicts/supersession only restrict release. */
export function constrainLiveEvidence(original: EvidenceBundle, fresh: EvidenceBundle): EvidenceBundle {
    const prior = [...original.evidenceTrace, ...original.temporalTrace.stances];
    const eligible = (row: typeof prior[number]) => prior.some(old => old.spanId === row.spanId && old.revisionId === row.revisionId && old.contentHash === row.contentHash && old.sourceVersion === row.sourceVersion && old.text === row.text && old.authorId === row.authorId && old.speakerId === row.speakerId && old.speakerRole === row.speakerRole && old.endorsedByOwner === row.endorsedByOwner && old.kind === row.kind);
    const evidenceTrace = fresh.evidenceTrace.filter(eligible), stances = fresh.temporalTrace.stances.filter(eligible);
    const sources = fresh.sources.filter(source => original.sources.some(old => old.metadata.vectorId === source.metadata.vectorId && old.metadata.expertProfileId === source.metadata.expertProfileId));
    return { ...fresh, evidenceTrace, temporalTrace: { ...fresh.temporalTrace, stances }, sources };
}
