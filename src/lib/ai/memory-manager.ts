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
    const prefix = memory.fact.substring(0, 20);

    const existing = await prisma.subscriberMemory.findFirst({
      where: {
        subscriberId,
        expertProfileId,
        category: memory.category,
        fact: { startsWith: prefix },
      },
    });

    if (existing) {
      await prisma.subscriberMemory.update({
        where: { id: existing.id },
        data: { updatedAt: new Date() },
      });
    } else {
      await prisma.subscriberMemory.create({
        data: {
          subscriberId,
          expertProfileId,
          fact: memory.fact,
          category: memory.category,
        },
      });
    }
  }
}

export async function getMemories(
  subscriberId: string,
  expertProfileId: string,
  limit: number = 20
): Promise<MemoryItem[]> {
  const memories = await prisma.subscriberMemory.findMany({
    where: { subscriberId, expertProfileId },
    orderBy: { updatedAt: "desc" },
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
