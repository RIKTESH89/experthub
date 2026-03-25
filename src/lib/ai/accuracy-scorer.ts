import prisma from "@/lib/prisma";

export interface ScoreComponents {
  knowledgeCoverage: number;
  personalityCompleteness: number;
  graphDensity: number;
  subscriberRatings: number;
  responseQuality: number;
}

function getKnowledgeCoverageBase(itemCount: number): number {
  if (itemCount >= 50) return 100;
  if (itemCount >= 20) return 80;
  if (itemCount >= 10) return 60;
  if (itemCount >= 5) return 40;
  if (itemCount >= 3) return 25;
  if (itemCount >= 1) return 10;
  return 0;
}

export async function calculateTwinScore(
  expertProfileId: string
): Promise<{ overallScore: number; components: ScoreComponents }> {
  // --- Knowledge Coverage ---
  const totalItems = await prisma.knowledgeItem.count({
    where: { expertProfileId },
  });
  const indexedItems = await prisma.knowledgeItem.count({
    where: { expertProfileId, isIndexed: true },
  });
  const baseKnowledge = getKnowledgeCoverageBase(totalItems);
  const indexedRatio = totalItems > 0 ? indexedItems / totalItems : 0;
  const knowledgeCoverage = Math.round(baseKnowledge * indexedRatio);

  // --- Personality Completeness ---
  const expertProfile = await prisma.expertProfile.findUnique({
    where: { id: expertProfileId },
    select: { personalityProfile: true, twinPersonality: true },
  });

  let personalityCompleteness = 0;
  if (expertProfile) {
    if (!expertProfile.personalityProfile && !expertProfile.twinPersonality) {
      personalityCompleteness = 0;
    } else if (!expertProfile.personalityProfile && expertProfile.twinPersonality) {
      personalityCompleteness = 30;
    } else if (expertProfile.personalityProfile) {
      const profile = expertProfile.personalityProfile as Record<string, unknown>;
      personalityCompleteness = 20;
      if (profile.tone) personalityCompleteness += 16;
      if (profile.writingStyle) personalityCompleteness += 16;
      if (Array.isArray(profile.catchphrases) && profile.catchphrases.length > 0)
        personalityCompleteness += 16;
      if (
        Array.isArray(profile.communicationGuidelines) &&
        profile.communicationGuidelines.length > 0
      )
        personalityCompleteness += 16;
      if (Array.isArray(profile.topicExpertise) && profile.topicExpertise.length > 0)
        personalityCompleteness += 16;
    }
  }

  // --- Graph Density ---
  const nodeCount = await prisma.knowledgeNode.count({
    where: { expertProfileId },
  });
  const edgeCount = await prisma.knowledgeEdge.count({
    where: {
      sourceNode: { expertProfileId },
    },
  });
  let graphDensity = 0;
  if (nodeCount > 0) {
    graphDensity = Math.min(100, nodeCount * 5 + edgeCount * 3);
  }

  // --- Subscriber Ratings ---
  const ratedMessages = await prisma.chatMessage.findMany({
    where: {
      chatSession: { expertProfileId },
      rating: { not: null },
    },
    select: { rating: true },
  });
  let subscriberRatings = 0;
  if (ratedMessages.length > 0) {
    const positiveCount = ratedMessages.filter((m) => m.rating === 1).length;
    subscriberRatings = Math.round((positiveCount / ratedMessages.length) * 100);
  }

  // --- Response Quality ---
  const interactions = await prisma.twinInteraction.findMany({
    where: {
      expertProfileId,
      answerQuality: { not: null },
    },
    select: { answerQuality: true },
  });
  let responseQuality = 0;
  if (interactions.length > 0) {
    const avg =
      interactions.reduce((sum, i) => sum + (i.answerQuality ?? 0), 0) /
      interactions.length;
    responseQuality = Math.round(avg * 100);
  }

  // --- Overall Score ---
  const overallScore = Math.round(
    knowledgeCoverage * 0.3 +
      personalityCompleteness * 0.2 +
      graphDensity * 0.15 +
      subscriberRatings * 0.2 +
      responseQuality * 0.15
  );

  const components: ScoreComponents = {
    knowledgeCoverage,
    personalityCompleteness,
    graphDensity,
    subscriberRatings,
    responseQuality,
  };

  // Upsert the score record
  await prisma.twinAccuracyScore.upsert({
    where: { expertProfileId },
    create: {
      expertProfileId,
      overallScore,
      components: JSON.parse(JSON.stringify(components)),
      calculatedAt: new Date(),
    },
    update: {
      overallScore,
      components: JSON.parse(JSON.stringify(components)),
      calculatedAt: new Date(),
    },
  });

  return { overallScore, components };
}
