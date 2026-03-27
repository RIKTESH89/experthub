export interface PersonalityProfile {
  tone: string;
  catchphrases: string[];
  writingStyle: string;
  communicationGuidelines: string[];
  topicExpertise: string[];
  sentencePatterns?: string;
}

export interface TwinEnhancements {
  opinions?: string | null;
  framework?: string | null;
  boundaries?: string | null;
}

export function getDigitalTwinSystemPrompt(
  expertName: string,
  personality?: string,
  personalityProfile?: PersonalityProfile | null,
  enhancements?: TwinEnhancements
): string {
  const base = `You are the Digital Twin of ${expertName}. You represent their knowledge, expertise, and perspective. Answer questions as if you are ${expertName}, drawing from their published content and knowledge base. Be helpful, insightful, and true to their voice and expertise.`;

  let prompt = base;

  if (personalityProfile) {
    const sections: string[] = [];
    if (personalityProfile.tone) {
      sections.push(`Tone & Voice: ${personalityProfile.tone}`);
    }
    if (personalityProfile.writingStyle) {
      sections.push(`Writing Style: ${personalityProfile.writingStyle}`);
    }
    if (personalityProfile.catchphrases?.length > 0) {
      sections.push(`Catchphrases to use naturally: ${personalityProfile.catchphrases.join(", ")}`);
    }
    if (personalityProfile.communicationGuidelines?.length > 0) {
      sections.push(`Communication guidelines:\n${personalityProfile.communicationGuidelines.map(g => `- ${g}`).join("\n")}`);
    }
    if (personalityProfile.topicExpertise?.length > 0) {
      sections.push(`Areas of deep expertise: ${personalityProfile.topicExpertise.join(", ")}`);
    }
    if (personalityProfile.sentencePatterns) {
      sections.push(`Sentence patterns: ${personalityProfile.sentencePatterns}`);
    }
    if (sections.length > 0) {
      prompt += `\n\nPersonality Profile (mimic this style closely):\n${sections.join("\n\n")}`;
    }
  }

  if (personality) {
    prompt += `\n\nAdditional personality guidelines from the expert: ${personality}`;
  }

  if (enhancements?.opinions) {
    prompt += `\n\nMy Strong Opinions & Stances (express these confidently when relevant — do not give generic balanced answers on these topics, share my actual viewpoint):\n${enhancements.opinions}`;
  }

  if (enhancements?.framework) {
    prompt += `\n\nMy Thinking Framework (when answering complex questions, walk through this reasoning process step by step — this is how I actually think through problems):\n${enhancements.framework}`;
  }

  if (enhancements?.boundaries) {
    prompt += `\n\nBoundaries & Disclaimers (strictly follow these rules — they reflect my professional standards):\n${enhancements.boundaries}`;
  }

  return prompt;
}

export function getMemoryPrompt(memories: { fact: string; category: string }[]): string {
  if (memories.length === 0) return "";

  const grouped: Record<string, string[]> = {};
  for (const m of memories) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m.fact);
  }

  const sections = Object.entries(grouped).map(([category, facts]) =>
    `[${category}]\n${facts.map(f => `  - ${f}`).join("\n")}`
  );

  return `\n\nWhat you remember about this subscriber from previous conversations:\n${sections.join("\n")}\n\nIMPORTANT — Use these memories proactively:\n- Reference past conversations naturally: "Last time you mentioned X — how did that go?"\n- Build on previous discussions instead of starting from scratch\n- If they asked about a topic before, acknowledge their growing understanding\n- Adjust your depth based on what they already know (don't re-explain basics)\n- If you notice a pattern in their questions, point it out: "I notice you keep coming back to X — would you like me to go deeper on that?"`;
}

export function getContextPrompt(
  context: string[],
  webResults?: string[],
  graphContext?: string[]
): string {
  let prompt = "";
  if (context.length > 0) {
    prompt += `\n\nRelevant knowledge from the expert's content:\n${context.map((c, i) => `[${i + 1}] ${c}`).join("\n")}`;
  }
  if (graphContext && graphContext.length > 0) {
    prompt += `\n\nRelated concepts from knowledge graph:\n${graphContext.map((c, i) => `[Graph ${i + 1}] ${c}`).join("\n")}`;
  }
  if (webResults && webResults.length > 0) {
    prompt += `\n\nRelevant information from the web:\n${webResults.map((r, i) => `[Web ${i + 1}] ${r}`).join("\n")}`;
  }
  prompt += `\n\nImportant: Base your answers primarily on the expert's content. Use graph connections and web results to supplement. Always maintain the expert's voice and perspective. If you don't have enough information, say so honestly.`;
  return prompt;
}
