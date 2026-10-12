import { assertExternalServiceAllowed } from "@/lib/preview-isolation";
import { checkSignal } from "@/lib/ai/request-lifecycle";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "./embedding-policy";
import { sourceWorkerSignal } from "@/lib/knowledge/repair-fence";
export { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "./embedding-policy";

export function validateEmbedding(values: unknown): asserts values is number[] {
  if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS ||
      values.some((value) => typeof value !== "number" || !Number.isFinite(value)) ||
      !values.some((value) => value !== 0)) {
    throw new Error("Embedding dimension/value mismatch");
  }
}

export async function generateEmbedding(text: string, signal?: AbortSignal): Promise<number[]> {
  const holderSignal = sourceWorkerSignal();
  if (holderSignal) signal = signal ? AbortSignal.any([signal, holderSignal]) : holderSignal;
  checkSignal(signal);
  if (!process.env.OPENAI_API_KEY) throw new Error("Embedding provider is not configured");
  assertExternalServiceAllowed();
  const body = JSON.stringify({ input: text, model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS });
  sourceWorkerSignal()?.throwIfAborted();
  checkSignal(signal);
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body,
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new Error(`Embedding provider failed: ${response.status}`);
  }
  let data;
  try { data = await response.json(); }
  catch (error) {
    await response.body?.cancel().catch(() => {});
    checkSignal(signal);
    throw error;
  }
  checkSignal(signal);
  if (data.model !== EMBEDDING_MODEL) throw new Error("Embedding model mismatch");
  const values: unknown = data.data?.[0]?.embedding;
  validateEmbedding(values);
  return values;
}
