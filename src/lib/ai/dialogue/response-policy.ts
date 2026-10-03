import type { DialogueState } from "./state";
import type { GroundedStyle } from "./style";
/** Reviewed local informational content. The model selects IDs, never supplies factual prose. */
export const INFORMATION = {
  "research-design": { trigger: /\b(research|study|experiment|methods?)\b/i, text: "A useful research discussion separates the question, study design, observations and interpretation. Consider comparison groups, measurement error, sample selection and alternative explanations. An association alone does not establish causation; the design and assumptions determine what conclusions are supported." },
  "research-uncertainty": { trigger: /\b(uncertainty|confidence interval|limitations?|replication)\b/i, text: "Uncertainty can arise from sampling, measurement, modelling assumptions and study design. A confidence interval describes uncertainty under a specified statistical procedure; it does not capture every possible source of bias. Replication and sensitivity analyses can help assess how dependent a finding is on particular assumptions." },
  "investment-risk": { trigger: /\b(invest\w*|diversification|portfolio|stocks?|risk)\b/i, text: "Diversification spreads exposure across investments, but cannot eliminate loss. Time horizon, liquidity needs, fees and concentration affect how an investment may fit a situation. This is general information, not a personalised recommendation or a promise of returns." },
  "medical-source-reading": { trigger: /\b(medical|clinical|health|treatment|symptoms?|medication)\b/i, text: "When reading medical information, distinguish the population studied, the comparison, benefits, harms and uncertainty. A study result may not apply to an individual. A qualified clinician can assess symptoms and treatment decisions; urgent symptoms need urgent local care." },
} as const;
export type InformationId = keyof typeof INFORMATION;
export type ConversationId = "greeting" | "thanks" | "clarify";
export function conversationalText(id: ConversationId, state: DialogueState): string | null {
  const query = state.userTurns[state.userTurns.length - 1] || "";
  if (id === "greeting" && /^(hi|hello|hey)[!.\s]*$/i.test(query.trim())) return "Hello. What would you like to explore?";
  if (id === "thanks" && /^(thanks|thank you)[!.\s]*$/i.test(query.trim())) return "You’re welcome. We can explore another question whenever you’re ready.";
  if (id === "clarify") return state.intent === "decision" ? "What options are you considering, and what constraints matter in your situation?" : "Which aspect would you like to explore, and do you have a source we can examine?";
  return null;
}
export function informationText(id: string, state: DialogueState): string | null {
  if (!Object.prototype.hasOwnProperty.call(INFORMATION,id)) return null;
  const entry = INFORMATION[id as InformationId];
  const query = state.userTurns[state.userTurns.length - 1] || "";
  if (!entry.trigger.test(query)) return null;
  // No cross-domain glossary selection may override a high-stakes context.
  if (state.risk === "medical" && id !== "medical-source-reading") return null;
  if (state.risk === "investment" && id !== "investment-risk") return null;
  return entry.text;
}
/** Observable formatting, not a personality inference. Exact quotations remain unchanged. */
export function formatResponse(parts: string[], style?: GroundedStyle): string {
  const compact = !!style?.samples.length && style.samples.every(s => s.text.length <= 100 && !s.text.includes("\n"));
  return compact ? parts.join("\n\n") : parts.map(p => `• ${p}`).join("\n\n");
}
