import { z } from "zod";
import type { EvidenceBundle } from "@/lib/retrieval/bundle";
import type { GroundedStyle } from "../style";
import type { DialogueState } from "../state";
import type { HistoryMessage } from "@/lib/ai/history";
export const STRUCTURED_VERSION = "dialogue-claims-v1" as const;
export const LIMITS = Object.freeze({ draftBytes: 24000, claims: 32, references: 8, attempts: 2, providerCalls: 4, deadlineMs: 30000 });
export const categorySchema = z.enum(["person-belief", "person-biography", "general-explanation", "source-explanation", "new-application", "conversation", "evidence-gap", "high-stakes-advice"]);
export const referenceSchema = z.strictObject({ spanId: z.string().min(1).max(160), revisionId: z.string().min(1).max(160), contentHash: z.string().min(1).max(160), sourceVersion: z.number().int().positive() });
export const frameSchema = z.strictObject({ mode: z.enum(["recorded", "current", "as-of"]), at: z.string().datetime().optional() }).superRefine((frame, ctx) => { if ((frame.mode === "as-of") !== !!frame.at)
    ctx.addIssue({ code: "custom", message: "Only as-of frames require an instant" }); });
export const claimSchema = z.strictObject({ id: z.string().min(1).max(80), start: z.number().int().nonnegative(), end: z.number().int().positive(), category: categorySchema, presentation: z.enum(["assertion", "uncertainty", "question"]), personId: z.string().min(1).max(160).optional(), evidence: z.array(referenceSchema).max(LIMITS.references), frame: frameSchema, gapIndex: z.number().int().nonnegative().optional() });
export const draftSchema = z.strictObject({ version: z.literal(STRUCTURED_VERSION), text: z.string().min(1), claims: z.array(claimSchema).min(1).max(LIMITS.claims) });
export const claimJudgmentSchema = z.strictObject({ id: z.string(), start: z.number().int().nonnegative(), end: z.number().int().positive(), observedCategory: categorySchema, observedPresentation: z.enum(["assertion", "uncertainty", "question"]), observedPersonId: z.string().optional(), verdict: z.enum(["supported", "general-information", "unknown", "contradicted", "unsupported", "unsafe"]), supportedEvidence: z.array(referenceSchema).max(LIMITS.references), reason: z.string().max(1000) });
export const judgmentSchema = z.strictObject({ version: z.literal(STRUCTURED_VERSION), draftDigest: z.string(), evidenceDigest: z.string(), stateDigest: z.string(), completeClaimCoverage: z.boolean(), relevant: z.boolean(), constraintsSatisfied: z.boolean(), identity: z.enum(["safe-ai", "impersonating", "uncertain"]), calibration: z.enum(["appropriate", "overconfident"]), highStakes: z.enum(["informational", "personalized-medical", "personalized-investment", "unsupported-expertise", "not-applicable"]), claims: z.array(claimJudgmentSchema).max(LIMITS.claims) });
export type ClaimCategory = z.infer<typeof categorySchema>;
export type EvidenceReference = z.infer<typeof referenceSchema>;
export type StructuredDraft = z.infer<typeof draftSchema>;
export type SemanticJudgment = z.infer<typeof judgmentSchema>;
export interface DialogueContext {
    state: DialogueState;
    bundle: EvidenceBundle;
    style: GroundedStyle;
    history: HistoryMessage[];
}
export interface GenerationRequest {
    version: typeof STRUCTURED_VERSION;
    instructions: string;
    context: DialogueContext;
    feedback: string[];
    attempt: number;
    signal: AbortSignal;
}
export interface VerificationRequest {
    version: typeof STRUCTURED_VERSION;
    instructions: string;
    draft: StructuredDraft;
    context: DialogueContext;
    draftDigest: string;
    evidenceDigest: string;
    stateDigest: string;
    signal: AbortSignal;
}
/** No network/credential implementation is included. Adapters must be independently supplied. */
export interface GeneratorAdapter {
    id: string;
    kind: "synthetic" | "real-model";
    generate(request: GenerationRequest): Promise<unknown>;
}
export interface VerifierAdapter {
    id: string;
    kind: "synthetic" | "real-model";
    verify(request: VerificationRequest): Promise<unknown>;
}
export interface LiveEvidenceAdapter {
    revalidate(original: EvidenceBundle, signal: AbortSignal): Promise<EvidenceBundle>;
}
export interface StructuredAdapters {
    generator: GeneratorAdapter;
    verifier: VerifierAdapter;
    evidence: LiveEvidenceAdapter;
}
export interface GateDecision {
    allowed: boolean;
    reasons: string[];
    acceptedSpanIds: string[];
    unknownClaimIds: string[];
}
export interface TurnResult {
    version: typeof STRUCTURED_VERSION;
    outcome: "released-synthetic-evaluation" | "blocked";
    text: string;
    decision: GateDecision;
    attempts: number;
    providerCalls: number;
    semanticEvidence: "synthetic-fixture-only";
    draft?: StructuredDraft;
    judgment?: SemanticJudgment;
    releaseBundle?: EvidenceBundle;
    elapsedMs: number;
}
