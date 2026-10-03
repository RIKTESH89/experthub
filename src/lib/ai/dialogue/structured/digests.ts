import { createHash } from "crypto";
import type { EvidenceBundle } from "@/lib/retrieval/bundle";
export const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
/** Pins semantics, attribution, permission-visible citations, temporal invalidations and gaps.
 * Timing/score diagnostics are excluded; changed source text/version/authority is not. */
export function evidenceDigest(bundle: EvidenceBundle): string {
    return digest({ version: bundle.version, plan: bundle.plan, rows: bundle.evidenceTrace, temporal: { ...bundle.temporalTrace, validAt: bundle.temporalTrace.mode === "current" ? "current-check" : bundle.temporalTrace.validAt }, sources: bundle.sources.map(s => ({ content: s.content, metadata: s.metadata })), gaps: bundle.gaps, failures: bundle.trace.failures });
}
