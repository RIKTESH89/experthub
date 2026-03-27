// Persistent vector store using PostgreSQL + pgvector
// Replaces the old in-memory implementation

import prisma from "@/lib/prisma";

interface VectorEntry {
  id: string;
  values: number[];
  metadata: Record<string, unknown>;
  content: string;
}

interface QueryResult {
  id: string;
  score: number;
  content: string;
  metadata: Record<string, unknown>;
}

class PgVectorStore {
  async upsert(namespace: string, entries: VectorEntry[]) {
    for (const entry of entries) {
      const embeddingStr = `[${entry.values.join(",")}]`;

      // Use raw SQL for the vector column since Prisma doesn't natively support it
      await prisma.$executeRawUnsafe(
        `INSERT INTO "VectorChunk" ("id", "vectorId", "namespace", "content", "metadata", "embedding", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, $5::vector, NOW())
         ON CONFLICT ("vectorId") DO UPDATE SET
           "content" = EXCLUDED."content",
           "metadata" = EXCLUDED."metadata",
           "embedding" = EXCLUDED."embedding"`,
        entry.id,
        namespace,
        entry.content,
        JSON.stringify(entry.metadata),
        embeddingStr
      );
    }
  }

  async query(
    namespace: string,
    queryVector: number[],
    topK: number = 5
  ): Promise<QueryResult[]> {
    const embeddingStr = `[${queryVector.join(",")}]`;

    // Use cosine distance operator (<=>). Score = 1 - distance (higher is better).
    const results = await prisma.$queryRawUnsafe<
      { vectorId: string; content: string; metadata: string | null; score: number }[]
    >(
      `SELECT "vectorId", "content", "metadata",
              1 - ("embedding" <=> $1::vector) AS score
       FROM "VectorChunk"
       WHERE "namespace" = $2 AND "embedding" IS NOT NULL
       ORDER BY "embedding" <=> $1::vector
       LIMIT $3`,
      embeddingStr,
      namespace,
      topK
    );

    return results.map((r) => ({
      id: r.vectorId,
      score: r.score,
      content: r.content,
      metadata: r.metadata ? (typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata) : {},
    }));
  }

  async keywordSearch(
    namespace: string,
    query: string,
    topK: number = 15
  ): Promise<QueryResult[]> {
    const words = query
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);

    if (words.length === 0) return [];

    const allResults: QueryResult[] = [];
    const seenIds = new Set<string>();

    // Method 1: Full-text search using plainto_tsquery (handles plain text naturally)
    try {
      const plainQuery = words.join(" ");
      const tsResults = await prisma.$queryRawUnsafe<
        { vectorId: string; content: string; metadata: string | null; rank: number }[]
      >(
        `SELECT "vectorId", "content", "metadata",
                ts_rank_cd(to_tsvector('simple', "content"), plainto_tsquery('simple', $1)) AS rank
         FROM "VectorChunk"
         WHERE "namespace" = $2
           AND to_tsvector('simple', "content") @@ plainto_tsquery('simple', $1)
         ORDER BY rank DESC
         LIMIT $3`,
        plainQuery,
        namespace,
        topK
      );

      for (const r of tsResults) {
        if (!seenIds.has(r.vectorId)) {
          seenIds.add(r.vectorId);
          allResults.push({
            id: r.vectorId,
            score: Math.min(r.rank + 0.5, 1),
            content: r.content,
            metadata: r.metadata ? (typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata) : {},
          });
        }
      }
    } catch {
      // Full-text search failed — continue to ILIKE fallback
    }

    // Method 2: ILIKE substring search (catches exact terms like "MemGPT" that full-text misses)
    for (const word of words) {
      if (allResults.length >= topK) break;
      try {
        const likeResults = await prisma.$queryRawUnsafe<
          { vectorId: string; content: string; metadata: string | null }[]
        >(
          `SELECT "vectorId", "content", "metadata"
           FROM "VectorChunk"
           WHERE "namespace" = $1 AND "content" ILIKE $2
           LIMIT $3`,
          namespace,
          `%${word}%`,
          5
        );

        for (const r of likeResults) {
          if (!seenIds.has(r.vectorId)) {
            seenIds.add(r.vectorId);
            allResults.push({
              id: r.vectorId,
              score: 0.6,
              content: r.content,
              metadata: r.metadata ? (typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata) : {},
            });
          }
        }
      } catch {
        // Individual word search failed — continue
      }
    }

    return allResults.slice(0, topK);
  }

  async deleteByIds(namespace: string, ids: string[]) {
    if (ids.length === 0) return;

    await prisma.$executeRawUnsafe(
      `DELETE FROM "VectorChunk" WHERE "namespace" = $1 AND "vectorId" = ANY($2)`,
      namespace,
      ids
    );
  }

  async deleteNamespace(namespace: string) {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "VectorChunk" WHERE "namespace" = $1`,
      namespace
    );
  }

  async count(namespace: string): Promise<number> {
    const result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*) as count FROM "VectorChunk" WHERE "namespace" = $1`,
      namespace
    );
    return Number(result[0]?.count ?? 0);
  }
}

export const vectorStore = new PgVectorStore();
