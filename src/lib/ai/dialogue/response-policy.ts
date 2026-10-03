import type { DialogueState } from "./state";
import type { GroundedStyle } from "./style";
export type ConversationId = "greeting" | "thanks" | "clarify";
export function conversationalText(id: ConversationId, state: DialogueState): string | null {
  const query = state.userTurns[state.userTurns.length - 1] || "";
  if (id === "greeting" && /^(hi|hello|hey)[!.\s]*$/i.test(query.trim())) return "Hello. What would you like to explore?";
  if (id === "thanks" && /^(thanks|thank you)[!.\s]*$/i.test(query.trim())) return "You’re welcome. We can explore another question whenever you’re ready.";
  if (id === "clarify") return state.intent === "decision" ? "What options are you considering, and what constraints matter in your situation?" : "Which aspect would you like to explore, and do you have a source we can examine?";
  return null;
}
/** Observable formatting, not a personality inference. Exact quotations remain unchanged. */
export function formatResponse(parts: string[], style?: GroundedStyle): string {
  const compact = !!style?.samples.length && style.samples.every(s => s.text.length <= 100 && !s.text.includes("\n"));
  return compact ? parts.join("\n\n") : parts.map(p => `• ${p}`).join("\n\n");
}
