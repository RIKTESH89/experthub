import { vectorStore } from "./client";
import { EMBEDDING_MODEL, generateEmbedding } from "./embeddings";

export async function indexDocument(
  namespace: string,
  id: string,
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<string[]> {
  const { expertProfileId, knowledgeItemId, sourceVersion } = metadata;
  if (typeof expertProfileId !== "string" || knowledgeItemId !== id || !Number.isInteger(sourceVersion) || Number(sourceVersion) < 1) {
    throw new Error("Indexing requires expert, source and revision identity");
  }
  const chunks = chunkText(content, 1000, 200);
  const vectorIds: string[] = [];

  const entries = [];
  for (let i = 0; i < chunks.length; i++) {
    const vectorId = `${expertProfileId}:${id}:v${sourceVersion}:chunk_${i}`;
    const embedding = await generateEmbedding(chunks[i]);
    entries.push({ id: vectorId, values: embedding,
      metadata: { ...metadata, embeddingModel: EMBEDDING_MODEL, chunkIndex: i }, content: chunks[i] });
    vectorIds.push(vectorId);
  }
  // Provider failure cannot leave a partially embedded document in persistent storage.
  await vectorStore.upsert(namespace, entries);

  // Legacy graph projections are not audience-safe. Their manual rebuild remains
  // available to owners, but they cannot contribute to chat until provenance exists.
  return vectorIds;
}

export async function removeDocument(namespace: string, vectorIds: string[]) {
  await vectorStore.deleteByIds(namespace, vectorIds);
}

export function plannedVectorIds(expertProfileId: string, id: string, sourceVersion: number, content: string) {
  return chunkText(content, 1000, 200).map((_, i) => `${expertProfileId}:${id}:v${sourceVersion}:chunk_${i}`);
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }

  return chunks;
}
