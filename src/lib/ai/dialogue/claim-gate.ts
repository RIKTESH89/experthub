import type { EvidenceBundle } from "@/lib/retrieval/bundle";
/** Free-form text is preserved as a proposal, never assumed to be safe because of its label.
 * This adapter is deliberately unreleased until independent semantic coverage, entailment,
 * relevance, person-attribution and high-stakes evaluations are available. */
export type ClaimCategory = "general-fact" | "source-explanation" | "person-view" | "application" | "conversation" | "high-stakes-advice";
export interface ProposedClaim { start: number; end: number; category: ClaimCategory; spanIds: string[] }
export interface StructuredProposal { text: string; claims: ProposedClaim[] }
export interface ClaimGateResult { decision: "blocked"; reason: "invalid-proposal" | "missing-evidence" | "semantic-verification-unreleased" }
const categories: ClaimCategory[] = ["general-fact","source-explanation","person-view","application","conversation","high-stakes-advice"];
export function gateStructuredClaims(proposal: StructuredProposal, bundle: EvidenceBundle): ClaimGateResult {
  if (!proposal || typeof proposal !== "object" || Object.keys(proposal).some(k=>k !== "text" && k !== "claims") || typeof proposal.text !== "string" || proposal.text.length > 24000 || !Array.isArray(proposal.claims) || proposal.claims.length > 32) return {decision:"blocked",reason:"invalid-proposal"};
  const spans = new Set([...bundle.evidenceTrace,...bundle.temporalTrace.stances].map(r=>r.spanId));
  for (const claim of proposal.claims) {
    if (!claim || Object.keys(claim).some(k=>!["start","end","category","spanIds"].includes(k)) || !Number.isInteger(claim.start) || !Number.isInteger(claim.end) || claim.start < 0 || claim.end <= claim.start || claim.end > proposal.text.length || !categories.includes(claim.category) || !Array.isArray(claim.spanIds) || claim.spanIds.some(id => typeof id !== "string")) return {decision:"blocked",reason:"invalid-proposal"};
    if ((claim.category === "person-view" || claim.category === "source-explanation") && (!claim.spanIds.length || claim.spanIds.some(id=>!spans.has(id)))) return {decision:"blocked",reason:"missing-evidence"};
  }
  // Provider annotations do not prove exhaustive claim coverage or entailment. No local
  // keyword classifier or environment toggle can grant semantic release authority.
  return {decision:"blocked",reason:"semantic-verification-unreleased"};
}
