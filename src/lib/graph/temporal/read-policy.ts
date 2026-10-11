import { TEMPORAL_EXTRACTOR_VERSION } from "./extractor";
// A read adapter policy, not a claim of persisted v2 coverage or computation-time history.
export const TEMPORAL_READ_VERSION = "literal-temporal-authorized-replay-v2";
// A separately pinned selector keeps existing v2 release replay deterministic.
export const TEMPORAL_SELECTION_VERSION = "literal-temporal-authorized-selection-v3";
export type TemporalReadVersion = typeof TEMPORAL_EXTRACTOR_VERSION | typeof TEMPORAL_READ_VERSION | typeof TEMPORAL_SELECTION_VERSION;
export const ACTIVE_TEMPORAL_READ_VERSION: TemporalReadVersion = TEMPORAL_SELECTION_VERSION;
export function supportedTemporalReadVersion(version: string): version is TemporalReadVersion {
 return version === TEMPORAL_EXTRACTOR_VERSION || version === TEMPORAL_READ_VERSION || version === TEMPORAL_SELECTION_VERSION;
}
