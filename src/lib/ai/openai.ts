/**
 * Shared OpenAI helper for non-streaming JSON extraction calls.
 * Used by personality-analyzer, memory-extractor, entity-extractor.
 */

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CallOpenAIOptions {
  messages: OpenAIMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export async function callOpenAI(options: CallOpenAIOptions): Promise<string> {
  const {
    messages,
    temperature = 0.3,
    maxTokens = 2048,
    model = process.env.OPENAI_MODEL || "gpt-4o-mini",
  } = options;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "{}";
}

/**
 * Parse JSON from LLM response with fallback.
 */
export function safeParseJSON<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}
