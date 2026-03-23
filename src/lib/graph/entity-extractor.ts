import { callOpenAI, safeParseJSON } from "@/lib/ai/openai";

interface ExtractedEntities {
  nodes: { concept: string; description: string }[];
  edges: { source: string; target: string; relationship: string }[];
}

export async function extractEntities(content: string): Promise<ExtractedEntities> {
  const truncated = content.slice(0, 3000);

  const response = await callOpenAI({
    messages: [
      {
        role: "system",
        content:
          "You are a knowledge graph entity extractor. Analyze the text and extract key concepts/entities and their relationships. Return a JSON object with 'nodes' (array of {concept: string, description: string}) and 'edges' (array of {source: string, target: string, relationship: string}). Extract 3-8 concepts and their relationships. Keep concepts concise (1-3 words). Relationships should be short verb phrases.",
      },
      {
        role: "user",
        content: truncated,
      },
    ],
  });

  return safeParseJSON<ExtractedEntities>(response, { nodes: [], edges: [] });
}
