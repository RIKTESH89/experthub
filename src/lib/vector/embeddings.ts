export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_MODEL = "text-embedding-3-small";

export function validateEmbedding(values: unknown): asserts values is number[] {
  if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS ||
      values.some((value) => typeof value !== "number" || !Number.isFinite(value)) ||
      !values.some((value) => value !== 0)) {
    throw new Error("Embedding dimension/value mismatch");
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) throw new Error("Embedding provider is not configured");
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ input: text, model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Embedding provider failed: ${response.status}`);
  const data = await response.json();
  if (data.model !== EMBEDDING_MODEL) throw new Error("Embedding model mismatch");
  const values: unknown = data.data?.[0]?.embedding;
  validateEmbedding(values);
  return values;
}
