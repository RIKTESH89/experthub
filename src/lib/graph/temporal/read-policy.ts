import { TEMPORAL_EXTRACTOR_VERSION } from "./extractor";
// A read adapter policy, not a claim of persisted v2 coverage or computation-time history.
export const TEMPORAL_READ_VERSION = "literal-temporal-authorized-replay-v2";
export type TemporalReadVersion = typeof TEMPORAL_EXTRACTOR_VERSION | typeof TEMPORAL_READ_VERSION;
export const ACTIVE_TEMPORAL_READ_VERSION: TemporalReadVersion = TEMPORAL_READ_VERSION;
export function supportedTemporalReadVersion(version: string): version is TemporalReadVersion {
 return version === TEMPORAL_EXTRACTOR_VERSION || version === TEMPORAL_READ_VERSION;
}
