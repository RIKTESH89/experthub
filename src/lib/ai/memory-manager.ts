import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

interface MemoryItem {
  fact: string;
  category: string;
}

export async function saveMemories(
  subscriberId: string,
  expertProfileId: string,
  memories: MemoryItem[]
): Promise<void> {
  for (const memory of memories) {
    const fact = memory.fact.trim().replace(/\s+/g, " ");
    const category = memory.category.trim();
    if (!fact || !category) continue;
    const memoryKey = createHash("sha256").update(JSON.stringify([subscriberId, expertProfileId, category, fact.toLowerCase()])).digest("hex");
    try { await prisma.subscriberMemory.upsert({
      where: { memoryKey },
      create: { subscriberId, expertProfileId, fact, category, memoryKey },
      update: {}, // Duplicate extraction/retry does not manufacture recency.
    }); } catch (error) {
      // Prisma may emulate an empty-update upsert. Another extractor can win
      // the insert; acknowledge only the exact existing identity, without updating recency.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      const existing = await prisma.subscriberMemory.findUnique({where:{memoryKey}});
      if (!existing || existing.subscriberId !== subscriberId || existing.expertProfileId !== expertProfileId) throw error;
    }
  }
}

export async function getMemories(
  subscriberId: string,
  expertProfileId: string,
  limit: number = 20
): Promise<MemoryItem[]> {
  const memories = await prisma.subscriberMemory.findMany({
    where: { subscriberId, expertProfileId, memoryKey: { not: null } },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit,
    select: { fact: true, category: true },
  });

  return memories;
}

export async function getMemoryCount(
  subscriberId: string,
  expertProfileId: string
): Promise<number> {
  return prisma.subscriberMemory.count({
    where: { subscriberId, expertProfileId },
  });
}
