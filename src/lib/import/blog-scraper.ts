import { assertExternalServiceAllowed } from "@/lib/preview-isolation";
import { parse } from "node-html-parser";
import { fetchPublicHtml } from "./safe-fetch";

// Direct fetching lets us enforce DNS pinning and every redirect locally.
export async function scrapeBlogContent(url: string): Promise<{ title: string; content: string }> {
  assertExternalServiceAllowed();
  const html = await fetchPublicHtml(url);
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
}
