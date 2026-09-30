// Embedding dimension must match the vector(1536) column in VectorChunk
export const EMBEDDING_DIMENSIONS = 1536;

export async function generateEmbedding(text: string): Promise<number[]> {
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          input: text,
          model: "text-embedding-3-small",
        }),
      });
      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error("OpenAI embedding failed, using fallback:", error);
    }
  }

  // Simple fallback for development (produces 1536-dim vector to match pgvector column)
  return simpleEmbedding(text);
}

function simpleEmbedding(text: string): number[] {
  const embedding = new Array(EMBEDDING_DIMENSIONS).fill(0);
  const words = text.toLowerCase().split(/\s+/);

  for (const word of words) {
    for (let i = 0; i < word.length; i++) {
      const idx = (word.charCodeAt(i) * (i + 1)) % EMBEDDING_DIMENSIONS;
      embedding[idx] += 1;
    }
  }

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum: number, val: number) => sum + val * val, 0));
  return embedding.map((val: number) => magnitude > 0 ? val / magnitude : 0);
}
