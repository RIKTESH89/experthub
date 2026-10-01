import type { RetrievalScope } from "@/lib/knowledge/access";

export interface HistoryMessage {
  role: string;
  content: string;
  sources?: unknown;
}

export function sourcesAllowed(sources: unknown, scope: RetrievalScope): boolean {
  if (!Array.isArray(sources) || !sources.length) return false;
  const allowed = new Set(scope.allowedVectorIds);
  return sources.every((source) => source && typeof source === "object" &&
    source.metadata?.expertProfileId === scope.expertProfileId &&
    source.metadata?.generationAudience !== "owner" &&
    typeof source.metadata?.vectorId === "string" && allowed.has(source.metadata.vectorId));
}

/** DB supplies newest first with an ID tie-break; generation needs chronological order. */
export function chronologicalHistory<T>(newestFirst: T[]): T[] {
  return [...newestFirst].reverse();
}

export function authorizedHistory(messages: HistoryMessage[], scope: RetrievalScope): { role: "user" | "assistant"; content: string }[] {
  return messages.filter((message) => message.role === "user" ||
    (message.role === "assistant" && (scope.isOwner || sourcesAllowed(message.sources, scope))))
    .slice(-20).map((message) => ({ role: message.role as "user" | "assistant", content: message.content }));
}
