import prisma from "@/lib/prisma";

export async function checkTrialAccess(userId: string, expertProfileId: string) {
  const expert = await prisma.expertProfile.findUnique({
    where: { id: expertProfileId },
    select: { freeTrialQuestions: true },
  });
  const limit = expert?.freeTrialQuestions ?? 3;

  const usage = await prisma.freeTrialUsage.findUnique({
    where: { userId_expertProfileId: { userId, expertProfileId } },
  });
  const used = usage?.questionCount ?? 0;

  return { allowed: used < limit, used, limit };
}

export async function incrementTrialUsage(userId: string, expertProfileId: string) {
  await prisma.freeTrialUsage.upsert({
    where: { userId_expertProfileId: { userId, expertProfileId } },
    create: { userId, expertProfileId, questionCount: 1, lastQuestionAt: new Date() },
    update: { questionCount: { increment: 1 }, lastQuestionAt: new Date() },
  });
}
