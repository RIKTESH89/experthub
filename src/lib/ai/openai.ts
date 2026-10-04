import { assertExternalServiceAllowed } from "@/lib/preview-isolation";
import { checkSignal } from "./request-lifecycle";
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
  signal?: AbortSignal;
}

export async function callOpenAI(options: CallOpenAIOptions): Promise<string> {
  checkSignal(options.signal);
  const {
    messages,
    temperature = 0.3,
    maxTokens = 2048,
    model = process.env.OPENAI_MODEL || "gpt-4o-mini",
  } = options;

  assertExternalServiceAllowed();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: options.signal,
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
    await response.body?.cancel().catch(() => {});
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  let data;
  try { data = await response.json(); }
  catch (error) {
    await response.body?.cancel().catch(() => {});
    checkSignal(options.signal);
    throw error;
  }
  checkSignal(options.signal);
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
