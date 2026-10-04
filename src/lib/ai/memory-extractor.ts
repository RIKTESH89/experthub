import { callOpenAI, safeParseJSON } from "@/lib/ai/openai";

interface ExtractedMemory {
  fact: string;
  category: string;
}

export async function extractMemories(
  userMessage: string,
  _assistantResponse: string,
  signal?: AbortSignal,
): Promise<ExtractedMemory[]> {
  // Retained second argument for existing callers; generated text is never memory evidence.
  void _assistantResponse;
  const systemPrompt =
    'You are a memory extraction system. Analyze this conversation exchange and extract any facts the user revealed about themselves. Return a JSON object with a \'memories\' array where each item has \'fact\' (string) and \'category\' (one of: preference, background, goal, context, opinion). Only extract clear, explicit facts stated by this user. Do not treat quotations, hypothetical examples or another person’s preferences as the user’s own. If no facts are revealed, return {"memories": []}.';

  const raw = await callOpenAI({
    signal,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `User: ${userMessage}`,
      },
    ],
  });

  const parsed = safeParseJSON<{ memories: ExtractedMemory[] }>(raw, {
    memories: [],
  });

  return parsed.memories;
}
