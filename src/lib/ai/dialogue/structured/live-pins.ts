import { isSnapshotDate } from "./snapshots";
import type { EvidenceBundle } from "@/lib/retrieval/bundle";
import { digest } from "./digests";
/** Stable ordering and all immutable row fields, including validity, context, polarity,
 * decisions and attribution. Only derived visible support weight/uncertainty may vary. */
function immutableRow(row: unknown): unknown {
    const normalize = (value: unknown): unknown => {
        if (isSnapshotDate(value))
            return value.toISOString();
        if (Array.isArray(value))
            return value.map(normalize);
        if (value && typeof value === "object")
            return Object.fromEntries(Object.keys(value).sort().map(k => [k, normalize((value as Record<string, unknown>)[k])]));
        return value;
    };
    const record = row as Record<string, unknown>;
    return normalize(Object.fromEntries(Object.entries(record).filter(([key]) => key !== "weight" && key !== "temporalUncertainty")));
}
/** Assertions and stances have separate immutable pins: an assertion cannot be promoted
 * into a newly invented stance/validity record. Fresh invalidations may only restrict. */
export function constrainLiveEvidence(original: EvidenceBundle, fresh: EvidenceBundle): EvidenceBundle {
    const eligible = (prior: unknown[], row: unknown) => prior.some(old => digest(immutableRow(old)) === digest(immutableRow(row)));
    const evidenceTrace = fresh.evidenceTrace.filter(row => eligible(original.evidenceTrace, row));
    const stances = fresh.temporalTrace.stances.filter(row => eligible(original.temporalTrace.stances, row));
    const sources = fresh.sources.filter(source => original.sources.some(old => old.metadata.vectorId === source.metadata.vectorId && old.metadata.expertProfileId === source.metadata.expertProfileId));
    return { ...fresh, evidenceTrace, temporalTrace: { ...fresh.temporalTrace, stances }, sources };
}
