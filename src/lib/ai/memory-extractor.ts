import { callOpenAI, safeParseJSON } from "@/lib/ai/openai";

interface ExtractedMemory {
  fact: string;
  category: string;
}

export async function extractMemories(
  userMessage: string,
  assistantResponse: string
): Promise<ExtractedMemory[]> {
  const systemPrompt =
    'You are a memory extraction system. Analyze this conversation exchange and extract any facts the user revealed about themselves. Return a JSON object with a \'memories\' array where each item has \'fact\' (string) and \'category\' (one of: preference, background, goal, context, opinion). Only extract clear, specific facts. If no facts are revealed, return {"memories": []}.';

  const raw = await callOpenAI({
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `User: ${userMessage}\nAssistant: ${assistantResponse}`,
      },
    ],
  });

  const parsed = safeParseJSON<{ memories: ExtractedMemory[] }>(raw, {
    memories: [],
  });

  return parsed.memories;
}
