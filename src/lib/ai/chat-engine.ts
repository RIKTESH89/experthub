import { retrieveContext, type RetrievalResult } from "@/lib/vector/retriever";
import { searchWeb } from "@/lib/ai/web-search";
import {
  getDigitalTwinSystemPrompt,
  getContextPrompt,
  getMemoryPrompt,
  type PersonalityProfile,
} from "@/lib/ai/prompts";
import { getMemories } from "@/lib/ai/memory-manager";
import { graphEnhancedRetrieval } from "@/lib/graph/graph-retriever";
import prisma from "@/lib/prisma";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
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

  const expertName = expert?.displayName || expert?.user?.name || "Expert";
  const personality = expert?.twinPersonality || undefined;
  const personalityProfile = expert?.personalityProfile
    ? (expert.personalityProfile as unknown as PersonalityProfile)
    : null;
  const ragEnabled = expert?.ragEnabled ?? true;

  // Step 1: Retrieve context from vector store (only if RAG is enabled)
  let retrievalResults: RetrievalResult[] = [];
  let contextTexts: string[] = [];

  if (ragEnabled) {
    thinkingSteps.push("Searching knowledge base...");
    const namespace = `expert_${expertId}`;
    retrievalResults = await retrieveContext(namespace, query, 5);
    contextTexts = retrievalResults.map((r) => r.content);
  } else {
    thinkingSteps.push("Knowledge base search disabled by expert");
  }

  if (retrievalResults.length > 0) {
    thinkingSteps.push(`Found ${retrievalResults.length} relevant sources`);
    // Show top 3 sources in thinking
    for (const result of retrievalResults.slice(0, 3)) {
      if (result.score > 0.3) {
        const title =
          (result.metadata?.title as string) ||
          result.content.slice(0, 60).replace(/\n/g, " ") + "...";
        thinkingSteps.push(`Considering: "${title}"`);
      }
    }
  } else {
    thinkingSteps.push("No direct matches found in knowledge base");
  }

  // Step 2: Graph-enhanced retrieval (only if RAG is enabled)
  let graphContext: string[] = [];
  if (ragEnabled && expert?.id && retrievalResults.length > 0) {
    thinkingSteps.push("Exploring knowledge graph connections...");
    try {
      graphContext = await graphEnhancedRetrieval(expert.id, retrievalResults);
      if (graphContext.length > 0) {
        thinkingSteps.push(`Found ${graphContext.length} related concepts`);
      }
    } catch {
      // Graph retrieval is non-critical
    }
  }

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
    getDigitalTwinSystemPrompt(expertName, personality, personalityProfile) +
    getMemoryPrompt(memories) +
    getContextPrompt(contextTexts, webResults, graphContext);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...chatHistory.slice(-20),
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
      temperature: 0.7,
      max_tokens: 1024,
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
