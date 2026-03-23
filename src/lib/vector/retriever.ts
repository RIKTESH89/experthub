import { vectorStore } from "./client";
import { generateEmbedding } from "./embeddings";

export interface RetrievalResult {
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export async function retrieveContext(
  namespace: string,
  query: string,
  topK: number = 5
): Promise<RetrievalResult[]> {
  const queryEmbedding = await generateEmbedding(query);
  const results = await vectorStore.query(namespace, queryEmbedding, topK);

  return results
    .filter((r) => r.score > 0.1)
    .map((r) => ({
      content: r.content,
      score: r.score,
      metadata: r.metadata,
    }));
}
