import prisma from "@/lib/prisma";
import type { RetrievalResult } from "@/lib/vector/retriever";

interface GraphNode {
  id: string;
  concept: string;
  description: string | null;
  depth: number;
  path: string;
}

/**
 * Graph-enhanced retrieval using PostgreSQL recursive CTEs.
 * Traverses the knowledge graph up to `maxDepth` hops from matched nodes,
 * returning connected concept descriptions as additional context.
 */
export async function graphEnhancedRetrieval(
  expertProfileId: string,
  vectorResults: RetrievalResult[],
  maxDepth: number = 2
): Promise<string[]> {
  // Extract keywords from vector result content
  const keywords = Array.from(
    new Set(
      vectorResults
        .map((r) => r.content.slice(0, 150))
        .join(" ")
        .split(/\s+/)
        .filter((w) => w.length > 4)
        .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""))
        .filter((w) => w.length > 4)
    )
  );

  if (keywords.length === 0) {
    return [];
  }

  // Find seed nodes that match keywords
  const matchedNodes = await prisma.knowledgeNode.findMany({
    where: {
      expertProfileId,
      OR: keywords.map((keyword) => ({
        concept: {
          contains: keyword,
          mode: "insensitive" as const,
        },
      })),
    },
    take: 5,
  });

  if (matchedNodes.length === 0) {
    return [];
  }

  const seedIds = matchedNodes.map((n) => n.id);
  const seedIdSet = new Set(seedIds);

  // Recursive CTE: traverse edges up to maxDepth hops in both directions
  // This finds all nodes reachable within maxDepth hops from any seed node
  const connectedNodes = await prisma.$queryRawUnsafe<GraphNode[]>(
    `WITH RECURSIVE graph_traverse AS (
      -- Base case: seed nodes at depth 0
      SELECT
        n."id",
        n."concept",
        n."description",
        0 AS depth,
        n."id"::text AS path
      FROM "KnowledgeNode" n
      WHERE n."id" = ANY($1)

      UNION

      -- Recursive step: follow edges in both directions
      SELECT
        next_node."id",
        next_node."concept",
        next_node."description",
        gt.depth + 1 AS depth,
        gt.path || ',' || next_node."id" AS path
      FROM graph_traverse gt
      JOIN "KnowledgeEdge" e
        ON e."sourceNodeId" = gt."id" OR e."targetNodeId" = gt."id"
      JOIN "KnowledgeNode" next_node
        ON next_node."id" = CASE
          WHEN e."sourceNodeId" = gt."id" THEN e."targetNodeId"
          ELSE e."sourceNodeId"
        END
      WHERE gt.depth < $2
        AND next_node."expertProfileId" = $3
        -- Prevent cycles: don't revisit nodes already in the path
        AND gt.path NOT LIKE '%' || next_node."id" || '%'
    )
    SELECT DISTINCT ON (id) id, concept, description, depth, path
    FROM graph_traverse
    WHERE depth > 0
      AND description IS NOT NULL
    ORDER BY id, depth ASC
    LIMIT 8`,
    seedIds,
    maxDepth,
    expertProfileId
  );

  // Filter out seed nodes and return formatted results
  // Prioritize closer nodes (lower depth) and deduplicate
  const results: string[] = [];
  const seen = new Set<string>();

  for (const node of connectedNodes) {
    if (seedIdSet.has(node.id) || seen.has(node.id)) continue;
    seen.add(node.id);

    const depthLabel = node.depth === 1 ? "directly related" : `${node.depth} hops away`;
    results.push(`${node.concept} (${depthLabel}): ${node.description}`);

    if (results.length >= 5) break;
  }

  return results;
}
