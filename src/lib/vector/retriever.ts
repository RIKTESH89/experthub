import { assertExternalServiceAllowed } from "@/lib/preview-isolation";
import { vectorStore } from "./client";
import type { RetrievalScope } from "@/lib/knowledge/access";
import { generateEmbedding } from "./embeddings";

export interface RetrievalResult {
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

/**
 * Three-stage retrieval pipeline:
 * 1. Hybrid search (vector + PostgreSQL full-text/substring keyword) — broad retrieval
 * 2. LLM re-ranking — accurate relevance scoring
 * 3. Top-K selection — best results to generation
 */
export async function retrieveContext(
  namespace: string,
  query: string,
  topK: number = 5,
  scope?: RetrievalScope,
  diagnostics?: (value: { vectorAvailable: boolean; vectorCandidates: number; keywordCandidates: number; eligibleCandidates: number; retrievalMs: number }) => void
): Promise<RetrievalResult[]> {
  assertExternalServiceAllowed();
  const started = Date.now();
  if (!scope || scope.namespace !== namespace) throw new Error("Retrieval requires an authorized scope");
  const allowed = new Set(scope.allowedVectorIds);
  let vectorAvailable = true;
  const vectorPromise = generateEmbedding(query)
    .then((embedding) => vectorStore.query(namespace, embedding, 15, scope))
    .catch(() => { vectorAvailable = false; return []; });
  const [vectorResults, keywordResults] = await Promise.all([
    vectorPromise, vectorStore.keywordSearch(namespace, query, 15, scope),
  ]);
  // Interleave channels before the reranking budget. IDs break ties deterministically.
  const candidates: RetrievalResult[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < Math.max(vectorResults.length, keywordResults.length); i++) {
    for (const [channel, result] of [["vector", vectorResults[i]], ["keyword", keywordResults[i]]] as const) {
      if (!result || seen.has(result.id) || !allowed.has(result.id) || result.metadata.expertProfileId !== scope.expertProfileId) continue;
      seen.add(result.id);
      candidates.push({ content: result.content, score: result.score, metadata: { ...result.metadata, vectorId: result.id, source: channel } });
    }
  }
  const filtered = candidates.filter((r) => r.score > 0.05);
  diagnostics?.({ vectorAvailable, vectorCandidates: vectorResults.length, keywordCandidates: keywordResults.length, eligibleCandidates: filtered.length, retrievalMs: Date.now() - started });

  // If few candidates, skip re-ranking
  if (filtered.length <= topK) {
    return filtered.sort((a, b) => b.score - a.score);
  }

  // Stage 2: LLM re-ranking — ask the model to rank candidates by relevance
  try {
    const reranked = await rerankWithLLM(query, filtered, topK);
    return reranked;
  } catch {
    // Fallback: return top results by original score
    return filtered
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}

/**
 * Uses the LLM to re-rank retrieved chunks by relevance to the query.
 * Much cheaper than a dedicated re-ranker service, good enough for our scale.
 */
async function rerankWithLLM(
  query: string,
  candidates: RetrievalResult[],
  topK: number
): Promise<RetrievalResult[]> {
  if (!process.env.OPENAI_API_KEY) {
    return candidates.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  // Prepare numbered chunk previews (truncate to save tokens)
  const toRerank = candidates.slice(0, 15); // Max 15 candidates
  const chunkPreviews = toRerank
    .map((c, i) => `[${i + 1}] ${c.content.slice(0, 500)}`)
    .join("\n\n");

  assertExternalServiceAllowed();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a relevance ranking system. Given a query and numbered text chunks, return ONLY the numbers of the most relevant chunks in order of relevance (most relevant first). Return numbers separated by commas. No explanation.",
        },
        {
          role: "user",
          content: `Query: "${query}"\n\nChunks:\n${chunkPreviews}\n\nReturn the ${topK} most relevant chunk numbers, comma-separated:`,
        },
      ],
      temperature: 0,
      max_tokens: 100,
    }),
  });

  if (!response.ok) {
    throw new Error("Reranking failed");
  }

  const data = await response.json();
  const rankingText = data.choices?.[0]?.message?.content || "";
  // Parse the ranked numbers
  const rankedIndices = rankingText
    .split(/[,\s]+/)
    .map((s: string) => parseInt(s.trim(), 10) - 1) // Convert 1-indexed to 0-indexed
    .filter((i: number) => !isNaN(i) && i >= 0 && i < toRerank.length);

  // Build re-ranked results
  const reranked: RetrievalResult[] = [];
  const usedIndices = new Set<number>();

  for (const idx of rankedIndices) {
    if (!usedIndices.has(idx) && reranked.length < topK) {
      usedIndices.add(idx);
      reranked.push({
        ...toRerank[idx],
        score: 1 - reranked.length * 0.1,
      });
    }
  }

  // If LLM returned fewer than topK, fill with highest original scores
  if (reranked.length < topK) {
    const remaining = toRerank
      .filter((_, i) => !usedIndices.has(i))
      .sort((a, b) => b.score - a.score);
    for (const r of remaining) {
      if (reranked.length >= topK) break;
      reranked.push(r);
    }
  }

  return reranked;
}
