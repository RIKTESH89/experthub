import { retrieveLocalEvaluationEvidence } from "./dialogue/structured/local-retrieval";
import { runStructuredDialogue } from "./dialogue/structured/pipeline";
import type { GeneratorAdapter,VerifierAdapter,TurnResult } from "./dialogue/structured/contracts";
import { runFrozenChatEngine } from "./chat-engine-baseline";
import { localDialogueEvaluationEnabled } from "./dialogue/local-evaluation";
import { revalidateDialogueEvidence } from "./dialogue/revalidate";
import { acceptedEvidence } from "./dialogue/citations";
import { buildDialogueState, dialoguePrompt, type DialogueState } from "./dialogue/state";
import { groundedStyle, stylePrompt, type GroundedStyle } from "./dialogue/style";
import { verifyPersonResponse, verificationPrompt, type VerificationResult } from "./dialogue/verify";
import { createSSEDecoder } from "./sse";
import { assertExternalServiceAllowed } from "@/lib/preview-isolation";
import type { RetrievalResult } from "@/lib/vector/retriever";
import { retrieveIntentEvidence } from "@/lib/retrieval/retrieve";
import type { EvidenceBundle } from "@/lib/retrieval/bundle";
import { searchWeb } from "@/lib/ai/web-search";
import {
  getDigitalTwinSystemPrompt,
  getContextPrompt,
  getMemoryPrompt,
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
  /** Server-injected local test adapters; never accepted from request JSON. */
  structuredEvaluationAdapters?: {generator:GeneratorAdapter;verifier:VerifierAdapter};
}

interface ChatEngineResult {
  stream: ReadableStream;
  sources: RetrievalResult[];
  thinkingSteps: string[];
  evidenceTrace: EvidenceTrace[];
  temporalTrace: TemporalRetrievalResult;
  evidenceBundle: EvidenceBundle;
  dialogueState: DialogueState;
  groundedStyle: GroundedStyle;
  verification?: VerificationResult;
  structuredEvaluation?: TurnResult;
}

type PublicChatResult = Omit<ChatEngineResult,"dialogueState" | "groundedStyle" | "verification"> & Partial<Pick<ChatEngineResult,"dialogueState" | "groundedStyle" | "verification">>;
export async function runChatEngine(options: ChatEngineOptions): Promise<PublicChatResult> {
  if (!localDialogueEvaluationEnabled()) return runFrozenChatEngine(options);
  return runExperimentalChatEngine(options);
}
async function runExperimentalChatEngine(options: ChatEngineOptions): Promise<ChatEngineResult> {
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
  const ragEnabled = expert?.ragEnabled ?? true;

  // Step 1: Retrieve context from vector store (only if RAG is enabled)
  let retrievalResults: RetrievalResult[] = [];
  let contextTexts: string[] = [];

  const effectiveScope=ragEnabled?scope:{...scope,allowedVectorIds:[]};
  const evidenceBundle = options.structuredEvaluationAdapters
    ? await retrieveLocalEvaluationEvidence(effectiveScope,query,temporalQuery)
    : await retrieveIntentEvidence(effectiveScope,query,temporalQuery);
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
  } else {
    thinkingSteps.push("No direct matches found in knowledge base");
  }

  const graphContext = [evidenceBundle.prompt, ...evidenceBundle.gaps.map(gap => `Evidence gap: ${gap}`)];

  if (options.structuredEvaluationAdapters) {
    let audience: "owner" | "viewer" = scope.isOwner ? "owner" : "viewer";
    const structuredEvaluation = await runStructuredDialogue({expertId:expert.userId,query,
      history:authorizedHistory(chatHistory,scope),bundle:evidenceBundle,
      adapters:{...options.structuredEvaluationAdapters,evidence:{revalidate:async(original,signal)=>{
        if(signal.aborted)throw new Error("evaluation aborted");
        const current=await prisma.expertProfile.findUnique({where:{userId:expertId}});
        if(!current||current.id!==expert.id||current.userId!==expert.userId||current.vectorNamespace!==expert.vectorNamespace)throw new Error("Expert identity changed");
        const currentScope=await resolveRetrievalScope(current.id,current.vectorNamespace,current.userId,subscriberId);
        audience=currentScope.isOwner?"owner":"viewer";
        return revalidateDialogueEvidence(current.ragEnabled===false?{...currentScope,allowedVectorIds:[]}:currentScope,original);
      }}},
    });
    const release=structuredEvaluation.releaseBundle||evidenceBundle;
    const {sources,evidenceTrace,temporalTrace}=acceptedEvidence(release,structuredEvaluation.decision.acceptedSpanIds,audience);
    const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({choices:[{delta:{content:structuredEvaluation.text}}]})}\n\ndata: [DONE]\n\n`));controller.close();}});
    return {stream,sources,thinkingSteps:[...thinkingSteps,"Structured synthetic evaluation; semantic behavior is unvalidated"],evidenceTrace,temporalTrace,
      evidenceBundle:{...release,sources,evidenceTrace,temporalTrace,prompt:JSON.stringify({evidenceTrace,temporalTrace})},
      dialogueState:buildDialogueState(expert.userId,query,authorizedHistory(chatHistory,scope),release),groundedStyle:groundedStyle(release,expert.userId),structuredEvaluation};
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
  const dialogueState = buildDialogueState(expert.userId, query, authorizedHistory(chatHistory, scope), evidenceBundle);
  const style = groundedStyle(evidenceBundle, expert.userId);
  const systemPrompt =
    getDigitalTwinSystemPrompt(expertName) + dialoguePrompt(dialogueState) + stylePrompt(style) +
    getMemoryPrompt(memories) +
    getContextPrompt(contextTexts, webResults, graphContext) + verificationPrompt;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...authorizedHistory(chatHistory, scope),
    { role: "user", content: query },
  ];

  // Stream response from OpenAI
  assertExternalServiceAllowed();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(30000),
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

  // Buffer provider SSE privately. No unverified bytes reach the caller.
  const reader = response.body.getReader();
  const decoder = createSSEDecoder();
  let draft = "", bytes = 0, malformed = false, completed = false;
  try {
    while (true) {
      const {value, done} = await reader.read();
      bytes += value?.byteLength || 0;
      if (bytes > 128000) { malformed = true; await reader.cancel(); break; }
      for (const data of decoder.push(value, done)) {
        if (data === "[DONE]") { completed = true; continue; }
        if (completed) { malformed = true; continue; }
        try { const event = JSON.parse(data); draft += event.choices?.[0]?.delta?.content || ""; }
        catch { malformed = true; }
      }
      if (done) break;
    }
  } catch { malformed = true; }
  finally { reader.releaseLock(); }
  let releaseBundle = evidenceBundle;
  let releaseAudience: "owner" | "viewer" = scope.isOwner ? "owner" : "viewer";
  try {
    const current = await prisma.expertProfile.findUnique({where:{userId:expertId}});
    if (!current || current.id !== expert.id || current.userId !== expert.userId || current.vectorNamespace !== expert.vectorNamespace) throw new Error("Expert identity changed");
    const currentScope = await resolveRetrievalScope(current.id,current.vectorNamespace,current.userId,subscriberId);
    releaseAudience = currentScope.isOwner ? "owner" : "viewer";
    releaseBundle = await revalidateDialogueEvidence(current.ragEnabled === false ? {...currentScope,allowedVectorIds:[]} : currentScope,evidenceBundle);
  } catch {
    malformed = true;
  }
  const releaseState = buildDialogueState(expert.userId,query,authorizedHistory(chatHistory,scope),releaseBundle);
  const releaseStyle = groundedStyle(releaseBundle,expert.userId);
  const verification = verifyPersonResponse(malformed || !completed ? "" : draft,releaseState,releaseBundle,releaseStyle);
  const {sources,evidenceTrace,temporalTrace} = acceptedEvidence(releaseBundle,verification.acceptedSpanIds,releaseAudience);
  const stream = new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({choices:[{delta:{content:verification.text}}]})}\n\ndata: [DONE]\n\n`));
    controller.close();
  }});
  return {
    stream,
    dialogueState: releaseState,
    groundedStyle: releaseStyle,
    verification,

    sources,
    thinkingSteps,
    evidenceTrace,
    temporalTrace,
    evidenceBundle: {...releaseBundle,sources,evidenceTrace,temporalTrace,prompt:JSON.stringify({evidenceTrace,temporalTrace})},
  };
}
