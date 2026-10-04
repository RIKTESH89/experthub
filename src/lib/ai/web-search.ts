import { isPreviewIsolated } from "@/lib/preview-isolation";
import { checkSignal } from "./request-lifecycle";
export async function searchWeb(query: string, signal?: AbortSignal): Promise<string[]> {
  checkSignal(signal);
  if (isPreviewIsolated()) return [];
  try {
    if (!process.env.TAVILY_API_KEY) return [];

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: 3,
      }),
    });

    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      checkSignal(signal);
      return [];
    }

    let data;
  try { data = await response.json(); }
  catch (error) {
    await response.body?.cancel().catch(() => {});
    checkSignal(signal);
    throw error;
  }
    checkSignal(signal);
    return data.results?.map((r: { title: string; content: string }) => `${r.title}: ${r.content}`) || [];
  } catch {
    checkSignal(signal);
    return [];
  }
}
