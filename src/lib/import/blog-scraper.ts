import { parse } from "node-html-parser";

export async function scrapeBlogContent(url: string): Promise<{ title: string; content: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KnowledgeBot/1.0)",
        "Accept": "text/html",
      },
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

    const html = await res.text();
    const root = parse(html);

    // Remove unwanted elements
    root.querySelectorAll("script, style, nav, footer, header, aside, iframe, noscript").forEach((el) => el.remove());

    // Extract title
    const title = root.querySelector("title")?.text?.trim()
      || root.querySelector("h1")?.text?.trim()
      || new URL(url).pathname.split("/").pop()
      || "Imported Article";

    // Extract main content
    const article = root.querySelector("article")
      || root.querySelector("main")
      || root.querySelector("[role='main']")
      || root.querySelector(".post-content, .entry-content, .article-body, .content")
      || root.querySelector("body");

    const content = article?.text?.replace(/\s+/g, " ").trim() || "";

    if (content.length < 50) {
      throw new Error("Could not extract meaningful content from this page");
    }

    return { title, content };
  } finally {
    clearTimeout(timeout);
  }
}
