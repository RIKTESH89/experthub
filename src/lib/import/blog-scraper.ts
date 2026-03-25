import { parse } from "node-html-parser";

/**
 * Scrapes blog content from a URL.
 *
 * Strategy:
 * 1. Try Jina Reader API (handles JS-rendered pages, bot detection, paywalls)
 * 2. Fallback to direct fetch + HTML parsing (for simple server-rendered pages)
 */
export async function scrapeBlogContent(url: string): Promise<{ title: string; content: string }> {
  // Strategy 1: Jina Reader (free, handles Medium/Substack/JS-rendered sites)
  try {
    const jinaResult = await scrapeViaJina(url);
    if (jinaResult.content.length >= 50) {
      return jinaResult;
    }
  } catch {
    // Jina failed — fall through to direct scraping
  }

  // Strategy 2: Direct fetch + HTML parsing (for simple blogs, personal sites)
  return scrapeDirectly(url);
}

async function scrapeViaJina(url: string): Promise<{ title: string; content: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        "Accept": "text/plain",
        "X-No-Cache": "true",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Jina Reader failed: ${res.status}`);
    }

    const text = await res.text();

    // Jina returns markdown with title on the first line as "# Title"
    const lines = text.split("\n");
    let title = "";
    let contentStart = 0;

    // Extract title from first markdown heading
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      if (line.startsWith("# ")) {
        title = line.slice(2).trim();
        contentStart = i + 1;
        break;
      }
      if (line.startsWith("Title:")) {
        title = line.slice(6).trim();
        contentStart = i + 1;
        break;
      }
    }

    // If no title found in heading, use first non-empty line
    if (!title) {
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i].trim();
        if (line.length > 0 && !line.startsWith("http") && !line.startsWith("URL:")) {
          title = line.replace(/^#+\s*/, "").slice(0, 200);
          contentStart = i + 1;
          break;
        }
      }
    }

    if (!title) {
      title = new URL(url).pathname.split("/").filter(Boolean).pop() || "Imported Article";
    }

    // Get content — strip markdown image links and clean up
    const content = lines
      .slice(contentStart)
      .join("\n")
      .replace(/!\[.*?\]\(.*?\)/g, "") // Remove markdown images
      .replace(/\[([^\]]+)\]\(.*?\)/g, "$1") // Convert markdown links to text
      .replace(/\n{3,}/g, "\n\n") // Collapse multiple newlines
      .trim();

    return { title, content };
  } finally {
    clearTimeout(timeout);
  }
}

async function scrapeDirectly(url: string): Promise<{ title: string; content: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
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
      throw new Error("Could not extract meaningful content from this page. The page may require JavaScript to render or may be behind a login wall.");
    }

    return { title, content };
  } finally {
    clearTimeout(timeout);
  }
}
