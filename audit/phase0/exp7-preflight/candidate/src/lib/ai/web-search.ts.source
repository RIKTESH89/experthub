export async function searchWeb(query: string): Promise<string[]> {
  try {
    if (!process.env.TAVILY_API_KEY) return [];

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: 3,
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.results?.map((r: { title: string; content: string }) => `${r.title}: ${r.content}`) || [];
  } catch {
    return [];
  }
}
