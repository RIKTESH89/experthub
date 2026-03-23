import { vectorStore } from "./client";
import { generateEmbedding } from "./embeddings";
import { addToGraph } from "@/lib/graph/graph-builder";

export async function indexDocument(
  namespace: string,
  id: string,
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<string[]> {
  const chunks = chunkText(content, 1000, 200);
  const vectorIds: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const vectorId = `${id}_chunk_${i}`;
    const embedding = await generateEmbedding(chunks[i]);

    await vectorStore.upsert(namespace, [{
      id: vectorId,
      values: embedding,
      metadata: { ...metadata, chunkIndex: i },
      content: chunks[i],
    }]);

    vectorIds.push(vectorId);
  }

  // Fire-and-forget: add to knowledge graph
  if (metadata.expertProfileId) {
    addToGraph(metadata.expertProfileId as string, content).catch(() => {});
  }

  return vectorIds;
}

export async function removeDocument(namespace: string, vectorIds: string[]) {
  await vectorStore.deleteByIds(namespace, vectorIds);
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
