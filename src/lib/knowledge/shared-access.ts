import { resolveRetrievalScope } from "./access";
import { sourcesAllowed } from "@/lib/ai/history";

/** Sharing an answer cannot grant access to its original restricted evidence. */
export async function canPublishConversation(chat: { expertProfile: { id: string; userId: string; vectorNamespace: string }; messages: { role: string; sources?: unknown }[] }): Promise<boolean> {
  const expert = chat.expertProfile;
  const scope = await resolveRetrievalScope(expert.id, expert.vectorNamespace, expert.userId);
  const answers = chat.messages.filter((message) => message.role === "assistant");
  return answers.length > 0 && answers.every((answer) => sourcesAllowed(answer.sources, scope));
}
