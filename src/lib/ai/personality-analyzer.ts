import prisma from "@/lib/prisma";
import { callOpenAI, safeParseJSON } from "@/lib/ai/openai";

export interface PersonalityProfile {
  tone: string;
  catchphrases: string[];
  writingStyle: string;
  communicationGuidelines: string[];
  topicExpertise: string[];
  sentencePatterns: string;
}

export class NoContentError extends Error {
  constructor() {
    super("No content available to analyze. Please add knowledge items or posts first.");
    this.name = "NoContentError";
  }
}

export async function analyzePersonality(
  expertProfileId: string
): Promise<PersonalityProfile> {
  // Fetch all knowledge items and posts for this expert
  const [knowledgeItems, expertProfile] = await Promise.all([
    prisma.knowledgeItem.findMany({
      where: { expertProfileId },
      select: { content: true },
    }),
    prisma.expertProfile.findUnique({
      where: { id: expertProfileId },
      select: {
        userId: true,
        displayName: true,
      },
    }),
  ]);

  let posts: { content: string | null; title: string | null }[] = [];
  if (expertProfile) {
    posts = await prisma.post.findMany({
      where: { authorId: expertProfile.userId },
      select: { content: true, title: true },
    });
  }

  // Concatenate all content
  const parts: string[] = [];

  for (const item of knowledgeItems) {
    if (item.content) {
      parts.push(item.content);
    }
  }

  for (const post of posts) {
    if (post.title) {
      parts.push(post.title);
    }
    if (post.content) {
      parts.push(post.content);
    }
  }

  // Truncate to ~6000 chars to fit in context
  let combinedContent = parts.join("\n\n");
  if (combinedContent.length > 6000) {
    combinedContent = combinedContent.slice(0, 6000);
  }

  if (combinedContent.trim().length === 0) {
    throw new NoContentError();
  }

  const raw = await callOpenAI({
    messages: [
      {
        role: "system",
        content: `You are a writing style and personality analyzer. Analyze the provided writing samples and return a JSON object with the following fields:
- "tone": A single word or short phrase describing the overall tone (e.g., "Conversational", "Academic", "Witty and casual")
- "catchphrases": An array of 3-5 recurring phrases or expressions the writer frequently uses
- "writingStyle": A 1-2 sentence description of how the person writes (sentence length, vocabulary level, use of examples, etc.)
- "communicationGuidelines": An array of 3-5 guidelines for mimicking this person's communication style
- "topicExpertise": An array of 3-7 topic areas the person writes about most
- "sentencePatterns": A short description of typical sentence structures (e.g., "Favors short punchy sentences with rhetorical questions")

Return ONLY valid JSON matching this structure. No extra text.`,
      },
      {
        role: "user",
        content: `Analyze the following writing samples and extract the personality profile:\n\n${combinedContent}`,
      },
    ],
    temperature: 0.4,
    maxTokens: 1024,
  });

  const fallback: PersonalityProfile = {
    tone: "Professional",
    catchphrases: [],
    writingStyle: "Clear and informative",
    communicationGuidelines: [],
    topicExpertise: [],
    sentencePatterns: "Standard sentences",
  };
  return safeParseJSON<PersonalityProfile>(raw, fallback);
}
