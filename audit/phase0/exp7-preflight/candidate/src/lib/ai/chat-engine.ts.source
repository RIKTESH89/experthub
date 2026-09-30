import { retrieveContext, type RetrievalResult } from "@/lib/vector/retriever";
import { searchWeb } from "@/lib/ai/web-search";
import {
  getDigitalTwinSystemPrompt,
  getContextPrompt,
  getMemoryPrompt,
  type PersonalityProfile,
  type TwinEnhancements,
} from "@/lib/ai/prompts";
import { authorizedHistory } from "@/lib/ai/history";
import { getMemories } from "@/lib/ai/memory-manager";
import { resolveRetrievalScope } from "@/lib/knowledge/access";
import prisma from "@/lib/prisma";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  sources?: unknown;
}

interface ChatEngineOptions {
  expertId: string;
  subscriberId?: string;
  query: string;
  chatHistory: ChatMessage[];
  enableWebSearch?: boolean;
}

interface ChatEngineResult {
  stream: ReadableStream;
  sources: RetrievalResult[];
  thinkingSteps: string[];
}

export async function runChatEngine(options: ChatEngineOptions): Promise<ChatEngineResult> {
  const { expertId, subscriberId, query, chatHistory, enableWebSearch = false } = options;

  const thinkingSteps: string[] = [];

  // Fetch expert profile with personality data
  const expert = await prisma.expertProfile.findUnique({
    where: { userId: expertId },
    include: { user: { select: { name: true } } },
  });

  if (!expert) throw new Error("Expert profile not found");
  const scope = await resolveRetrievalScope(expert.id, expert.vectorNamespace, expert.userId, subscriberId);

  const expertName = expert?.displayName || expert?.user?.name || "Expert";
  const personality = expert?.twinPersonality || undefined;
  const personalityProfile = scope.isOwner && expert?.personalityProfile
    ? (expert.personalityProfile as unknown as PersonalityProfile)
    : null;
  const ragEnabled = expert?.ragEnabled ?? true;
  const enhancements: TwinEnhancements = {
    opinions: (expert as unknown as { twinOpinions?: string })?.twinOpinions || null,
    framework: (expert as unknown as { twinFramework?: string })?.twinFramework || null,
    boundaries: (expert as unknown as { twinBoundaries?: string })?.twinBoundaries || null,
  };

  // Step 1: Retrieve context from vector store (only if RAG is enabled)
  let retrievalResults: RetrievalResult[] = [];
  let contextTexts: string[] = [];

  if (ragEnabled) {
    thinkingSteps.push("Searching knowledge base (hybrid search)...");
    const namespace = expert?.vectorNamespace || `expert_${expertId}`;
    retrievalResults = (await retrieveContext(namespace, query, 5, scope)).map((result) => ({ ...result, metadata: { ...result.metadata, generationAudience: scope.isOwner ? "owner" : "viewer" } }));
    // Truncate each chunk to limit total prompt size
    contextTexts = retrievalResults.map((r) => r.content.slice(0, 1500));
  } else {
    thinkingSteps.push("Knowledge base search disabled by expert");
  }

  if (retrievalResults.length > 0) {
    thinkingSteps.push(`Found ${retrievalResults.length} relevant sources (re-ranked)`);
    for (const result of retrievalResults.slice(0, 3)) {
      const title =
        (result.metadata?.title as string) ||
        result.content.slice(0, 60).replace(/\n/g, " ") + "...";
      thinkingSteps.push(`Considering: "${title}"`);
    }
  } else {
    thinkingSteps.push("No direct matches found in knowledge base");
  }

  // Legacy graph descriptions have no source/audience provenance. Quarantine them
  // until a later provenance phase can authorize every contributing source.
  const graphContext: string[] = [];

  // Step 3: Retrieve subscriber memories
  let memories: { fact: string; category: string }[] = [];
  if (expert?.id && subscriberId) {
    try {
      memories = await getMemories(subscriberId, expert.id, 15);
      if (memories.length > 0) {
        thinkingSteps.push(`Recalling ${memories.length} things about you...`);
      }
    } catch {
      // Memory retrieval is non-critical
    }
  }

  // Step 4: Optional web search
  let webResults: string[] = [];
  if (enableWebSearch) {
    thinkingSteps.push("Searching the web for additional context...");
    webResults = await searchWeb(`${expertName} ${query}`);
  }

  thinkingSteps.push("Formulating response...");

  // Build system prompt with all context
  const systemPrompt =
    getDigitalTwinSystemPrompt(expertName, personality, personalityProfile, enhancements) +
    getMemoryPrompt(memories) +
    getContextPrompt(contextTexts, webResults, graphContext);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...authorizedHistory(chatHistory, scope),
    { role: "user", content: query },
  ];

  // Stream response from OpenAI
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      stream: true,
      temperature: 0.5,
      max_tokens: 2048,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  return {
    stream: response.body,
    sources: retrievalResults,
    thinkingSteps,
  };
}
