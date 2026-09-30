import { createHash } from "crypto";
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
    await prisma.subscriberMemory.upsert({
      where: { memoryKey },
      create: { subscriberId, expertProfileId, fact, category, memoryKey },
      update: {}, // Duplicate extraction/retry does not manufacture recency.
    });
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
