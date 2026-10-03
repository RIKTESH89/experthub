import { assertExternalServiceAllowed } from "@/lib/preview-isolation";
import type { RetrievalResult } from "@/lib/vector/retriever";
import { retrieveIntentEvidence } from "@/lib/retrieval/retrieve";
import type { EvidenceBundle } from "@/lib/retrieval/bundle";
import { searchWeb } from "@/lib/ai/web-search";
import {
  getDigitalTwinSystemPrompt,
  getContextPrompt,
  getMemoryPrompt,
  type PersonalityProfile,
  type TwinEnhancements,
} from "@/lib/ai/prompts";
import {type TemporalRetrievalResult} from "@/lib/graph/temporal/retriever";
import {temporalQueryFromQuestion,type TemporalQuery} from "@/lib/graph/temporal/timeline";
import { authorizedHistory } from "@/lib/ai/history";
import { getMemories } from "@/lib/ai/memory-manager";
import { resolveRetrievalScope } from "@/lib/knowledge/access";
import prisma from "@/lib/prisma";
import { type EvidenceTrace } from "@/lib/graph/evidence-store";

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
  temporalQuery?: TemporalQuery;
}

interface ChatEngineResult {
  stream: ReadableStream;
  sources: RetrievalResult[];
  thinkingSteps: string[];
  evidenceTrace: EvidenceTrace[];
  temporalTrace: TemporalRetrievalResult;
  evidenceBundle: EvidenceBundle;
}

export async function runChatEngine(options: ChatEngineOptions): Promise<ChatEngineResult> {
  assertExternalServiceAllowed();
  const { expertId, subscriberId, query, chatHistory, enableWebSearch = false } = options;

  const thinkingSteps: string[] = [];
  const temporalQuery = options.temporalQuery || temporalQueryFromQuestion(query);

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

  const evidenceBundle = await retrieveIntentEvidence(ragEnabled ? scope : {...scope, allowedVectorIds: []}, query, temporalQuery);
  if (ragEnabled) {
    thinkingSteps.push("Searching knowledge base (hybrid search)...");
    retrievalResults = evidenceBundle.sources.map(result => ({...result,metadata:{...result.metadata,generationAudience:scope.isOwner ? "owner" : "viewer"}}));
    // The bounded bundle is the sole source evidence prompt; avoid duplicate chunk context.
    contextTexts = [];
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

  const evidenceTrace = evidenceBundle.evidenceTrace;
  const temporalTrace = evidenceBundle.temporalTrace;
  const graphContext = [evidenceBundle.prompt, ...evidenceBundle.gaps.map(gap => `Evidence gap: ${gap}`)];

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
  assertExternalServiceAllowed();
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
    evidenceTrace,
    temporalTrace,
    evidenceBundle,
  };
}
