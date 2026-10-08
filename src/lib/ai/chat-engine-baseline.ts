import { revalidatedStream } from "./revalidated-stream";
import { currentRuntimePolicy } from "@/lib/persona/runtime";
import { resolveServingPersona } from "@/lib/persona/serving";
import { checkSignal } from "./request-lifecycle";
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
  signal?: AbortSignal;
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

export async function runFrozenChatEngine(options: ChatEngineOptions): Promise<ChatEngineResult> {
  checkSignal(options.signal);
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

  const servingPersona = await resolveServingPersona(scope, expert.ragEnabled ?? true);
  const runtime=servingPersona.runtime ?? currentRuntimePolicy();
  const expertName = servingPersona.displayName ?? (expert?.displayName || expert?.user?.name || "Expert");
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

  const retrievalScope = servingPersona.scope;
  const evidenceBundle = options.signal
    ? await retrieveIntentEvidence(retrievalScope, query, temporalQuery, options.signal)
    : await retrieveIntentEvidence(retrievalScope, query, temporalQuery);
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
      memories = await getMemories(subscriberId, expert.id, runtime.memory.limit);
      if (memories.length > 0) {
        thinkingSteps.push(`Recalling ${memories.length} things about you...`);
      }
    } catch {
      // Memory retrieval is non-critical
    }
  }

  // Step 4: Optional web search
  let webResults: string[] = [];
  if (enableWebSearch && runtime.web.allowed) {
    thinkingSteps.push("Searching the web for additional context...");
    webResults = await searchWeb(`${expertName} ${query}`, options.signal);
  }

  thinkingSteps.push("Formulating response...");

  // Build system prompt with all context
  const systemPrompt =
    (servingPersona.systemPrompt ?? getDigitalTwinSystemPrompt(expertName, personality, personalityProfile, enhancements)) +
    getMemoryPrompt(memories) +
    getContextPrompt(contextTexts, webResults, graphContext);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...authorizedHistory(chatHistory, retrievalScope),
    { role: "user", content: query },
  ];

  // Stream response from OpenAI
  checkSignal(options.signal);
  assertExternalServiceAllowed();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: options.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: runtime.generation.model,
      messages,
      stream: true,
      temperature: runtime.generation.temperature,
      max_tokens: runtime.generation.maxTokens,
    }),
  });

  if (options.signal?.aborted) { await response.body?.cancel().catch(() => {}); checkSignal(options.signal); }
  if (!response.ok || !response.body) {
    await response.body?.cancel().catch(() => {});
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  // Recheck nullable heads at handoff and every demand-driven chunk/EOF boundary.
  const authorize=async()=>{
    const current = await prisma.expertProfile.findUnique({where:{userId:expertId}});
    if (!current || current.id !== expert.id || current.userId !== expert.userId || current.vectorNamespace !== expert.vectorNamespace) throw new Error("Expert identity changed");
    const currentScope = await resolveRetrievalScope(current.id,current.vectorNamespace,current.userId,subscriberId);
    const currentPersona = await resolveServingPersona(currentScope,current.ragEnabled ?? true);
    checkSignal(options.signal);
    if (currentPersona.releaseId !== servingPersona.releaseId || currentScope.isOwner !== scope.isOwner || (current.ragEnabled ?? true) !== ragEnabled ||
        retrievalScope.allowedVectorIds.some(id => !currentPersona.scope.allowedVectorIds.includes(id))) {
      throw new Error("Persona release or access changed during generation");
    }
  };
  try {await authorize();}catch(error){await response.body.cancel().catch(()=>{});throw error;}

  return {
    stream: revalidatedStream(response.body,authorize,options.signal),
    sources: retrievalResults,
    thinkingSteps,
    evidenceTrace,
    temporalTrace,
    evidenceBundle,
  };
}
