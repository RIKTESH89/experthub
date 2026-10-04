/** Fail closed before persistence on malformed or post-terminal provider data. */
export function createProviderStreamState() {
  let terminal = false;
  return {
    get done() { return terminal; },
    accept(data: string): string | undefined {
      if (terminal) throw new Error("Provider data after DONE");
      if (data === "[DONE]") { terminal = true; return; }
      let frame: unknown;
      try { frame = JSON.parse(data); } catch { throw new Error("Malformed provider JSON"); }
      if (!frame || typeof frame !== "object" || Array.isArray(frame)) throw new Error("Malformed provider frame");
      const event = frame as { choices?: { delta?: { content?: unknown } }[]; usage?: unknown };
      const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
      // Streaming providers may send usage:null until the final usage record.
      // A non-null record must contain valid token counts, even alongside choices.
      if (event.usage !== undefined && event.usage !== null) {
        if (!record(event.usage)) throw new Error("Malformed provider usage");
        const counts = ["prompt_tokens", "completion_tokens", "total_tokens"];
        if (!counts.some(key => key in (event.usage as Record<string, unknown>)) ||
            counts.some(key => key in (event.usage as Record<string, unknown>) &&
              (!Number.isSafeInteger((event.usage as Record<string, unknown>)[key]) || Number((event.usage as Record<string, unknown>)[key]) < 0))) throw new Error("Malformed provider usage");
      }
      // OpenAI role/finish/empty choices and valid usage records carry no content.
      if (event.choices === undefined && record(event.usage)) return;
      if (!Array.isArray(event.choices)) throw new Error("Malformed provider choices");
      for (const choice of event.choices) {
        if (!record(choice)) throw new Error("Malformed provider choice");
        if (choice.delta !== undefined && !record(choice.delta)) throw new Error("Malformed provider delta");
        const value = choice.delta?.content;
        if (value !== undefined && value !== null && typeof value !== "string") throw new Error("Malformed provider content");
      }
      const content = event.choices[0]?.delta?.content;
      return typeof content === "string" ? content : undefined;
    },
  };
}
