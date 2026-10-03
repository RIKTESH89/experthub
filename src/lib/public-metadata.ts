import type { Metadata } from "next";

type LaunchEnvironment = { VERCEL_ENV?: string; NODE_ENV?: string; NEXT_PUBLIC_APP_URL?: string };

// Fail closed for Preview/local builds; a trusted production origin must be configured.
export function productionPublicOrigin(env: LaunchEnvironment = process.env): string | undefined {
  if (env.VERCEL_ENV !== "production") return;
  try {
    const url = new URL(env.NEXT_PUBLIC_APP_URL || "");
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return;
    if (url.port || /^\d+(\.\d+){3}$/.test(url.hostname) || url.hostname.startsWith("[") || url.hostname.endsWith(".local") || url.hostname.endsWith(".internal") || url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname.endsWith(".invalid") || url.hostname.endsWith(".vercel.app") || !url.hostname.includes(".")) return;
    return url.origin;
  } catch { return; }
}

export function publicRobotsMetadata(env: LaunchEnvironment = process.env): Metadata["robots"] {
  const indexable = Boolean(productionPublicOrigin(env));
  return { index: indexable, follow: indexable };
}

export function publicPageMetadata(path: "/" | "/about" | "/pricing", title: string, env: LaunchEnvironment = process.env): Metadata {
  const origin = productionPublicOrigin(env);
  const description = "Explore expert-provided content and AI-generated conversations. Digital Twins are AI representations; answers can be inaccurate and may differ from an expert’s views.";
  return {
    title, description,
    robots: publicRobotsMetadata(env),
    ...(origin ? { alternates: { canonical: new URL(path, origin).href }, openGraph: { title, description, url: new URL(path, origin).href, siteName: "ExpertHub", type: "website" } } : {}),
  };
}
