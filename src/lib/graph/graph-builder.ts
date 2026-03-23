import prisma from "@/lib/prisma";
import { extractEntities } from "./entity-extractor";

export async function buildGraphFromContent(
  expertProfileId: string
): Promise<{ nodesCreated: number; edgesCreated: number }> {
  const knowledgeItems = await prisma.knowledgeItem.findMany({
    where: { expertProfileId },
  });

  let nodesCreated = 0;
  let edgesCreated = 0;

  for (const item of knowledgeItems) {
    const entities = await extractEntities(item.content);

    for (const node of entities.nodes) {
      await prisma.knowledgeNode.upsert({
        where: {
          expertProfileId_concept: {
            expertProfileId,
            concept: node.concept.toLowerCase(),
          },
        },
        create: {
          expertProfileId,
          concept: node.concept.toLowerCase(),
          description: node.description,
        },
        update: {
          description: node.description,
        },
      });
      nodesCreated++;
    }

    for (const edge of entities.edges) {
      const sourceNode = await prisma.knowledgeNode.findUnique({
        where: {
          expertProfileId_concept: {
            expertProfileId,
            concept: edge.source.toLowerCase(),
          },
        },
      });

      const targetNode = await prisma.knowledgeNode.findUnique({
        where: {
          expertProfileId_concept: {
            expertProfileId,
            concept: edge.target.toLowerCase(),
          },
        },
      });

      if (sourceNode && targetNode) {
        await prisma.knowledgeEdge.upsert({
          where: {
            sourceNodeId_targetNodeId_relationship: {
              sourceNodeId: sourceNode.id,
              targetNodeId: targetNode.id,
              relationship: edge.relationship,
            },
          },
          create: {
            sourceNodeId: sourceNode.id,
            targetNodeId: targetNode.id,
            relationship: edge.relationship,
            weight: 1.0,
          },
          update: {
            weight: { increment: 1 },
          },
        });
        edgesCreated++;
      }
    }
  }

  return { nodesCreated, edgesCreated };
}

export async function addToGraph(
  expertProfileId: string,
  content: string
): Promise<void> {
  try {
    const entities = await extractEntities(content);

    for (const node of entities.nodes) {
      await prisma.knowledgeNode.upsert({
        where: {
          expertProfileId_concept: {
            expertProfileId,
            concept: node.concept.toLowerCase(),
          },
        },
        create: {
          expertProfileId,
          concept: node.concept.toLowerCase(),
          description: node.description,
        },
        update: {
          description: node.description,
        },
      });
    }

    for (const edge of entities.edges) {
      const sourceNode = await prisma.knowledgeNode.findUnique({
        where: {
          expertProfileId_concept: {
            expertProfileId,
            concept: edge.source.toLowerCase(),
          },
        },
      });

      const targetNode = await prisma.knowledgeNode.findUnique({
        where: {
          expertProfileId_concept: {
            expertProfileId,
            concept: edge.target.toLowerCase(),
          },
        },
      });

      if (sourceNode && targetNode) {
        await prisma.knowledgeEdge.upsert({
          where: {
            sourceNodeId_targetNodeId_relationship: {
              sourceNodeId: sourceNode.id,
              targetNodeId: targetNode.id,
              relationship: edge.relationship,
            },
          },
          create: {
            sourceNodeId: sourceNode.id,
            targetNodeId: targetNode.id,
            relationship: edge.relationship,
            weight: 1.0,
          },
          update: {
            weight: { increment: 1 },
          },
        });
      }
    }
  } catch {
    // Silent failure - this is called fire-and-forget
  }
}
