import { extractTemporal, temporalIdentity, TEMPORAL_EXTRACTOR_VERSION, TEMPORAL_PROJECTION_CANDIDATE_VERSION } from "./extractor";
import type { TemporalStanceTrace } from "./retriever";

/** Deterministic projection replay over an exact, freshly authorized span, never prose inference.
 * Require the retained v1 extraction/identity to agree before adding only v2 literal case fields.
 * No DB writes, new spans, changed validity/recorded time, or inferred owner endorsement.
 */
export function replayNegativePreference(row: TemporalStanceTrace): TemporalStanceTrace {
 if (row.extractorVersion !== TEMPORAL_EXTRACTOR_VERSION || row.category !== "preference" || row.polarity !== "negative" || row.decisionType !== null) return row;
 // A v1 negative preference has no decision case. Unexpected joined fields must not be overwritten.
 if ([row.situation,row.constraints,row.chosenAction,row.documentedReasons,row.alternatives,row.tradeoffs,row.exceptions].some(v => v !== null)) return row;
 const ownerId = row.endorsedByOwner ? row.authorId || "" : (row.authorId || "") + "\u0000";
 const old = extractTemporal(row.text,row.authorId,ownerId,TEMPORAL_EXTRACTOR_VERSION);
 if (old.length !== 1) return row;
 const value = old[0];
 if (value.start !== 0 || value.end !== row.text.length || row.end - row.start !== row.text.length || value.speakerId !== row.speakerId || value.speakerRole !== row.speakerRole) return row;
 const speaker = value.speakerRole === "author" ? value.speakerId : `${row.itemId}:${value.speakerId || "unknown-speaker"}`;
 if (speaker !== row.speaker) return row;
 for (const key of ["origin","domain","context","category","polarity","action","certainty","kind","endorsedByOwner","supersedes"] as const) if (value[key] !== row[key]) return row;
 if (value.validFrom !== (row.validFrom?.toISOString() || null) || value.validUntil !== (row.validUntil?.toISOString() || null)) return row;
 const original = {...value,start:row.start,end:row.end};
 if (temporalIdentity(row.revisionId,row.spanId,original,TEMPORAL_EXTRACTOR_VERSION) !== row.id) return row;
 const next = extractTemporal(row.text,row.authorId,ownerId,TEMPORAL_PROJECTION_CANDIDATE_VERSION)[0];
 if (next.decisionType !== "recommendation") return row;
 return {...row,id:temporalIdentity(row.revisionId,row.spanId,{...next,start:row.start,end:row.end},TEMPORAL_PROJECTION_CANDIDATE_VERSION),
  extractorVersion:TEMPORAL_PROJECTION_CANDIDATE_VERSION,storedStanceId:row.id,storedExtractorVersion:row.extractorVersion,projectionBasis:"authorized-span-replay",
  situation:next.context,constraints:next.constraints,chosenAction:next.action,documentedReasons:next.reasons,alternatives:next.alternatives,tradeoffs:next.tradeoffs,exceptions:next.exceptions,decisionType:next.decisionType};
}
