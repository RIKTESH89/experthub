// Frozen synthetic only. Whole sources are split, never overlapping chunks.
export const fixtureVersion = "phase0-synthetic-2026-09-30-v1";
export const frozenSources = [
  { expert: "ada", source: "ada-public-2025", split: "train", date: "2025-02-01", audience: "public", text: "I prefer a monolith for a small team because operations cost matters." },
  { expert: "ada", source: "ada-private-2026", split: "heldout", date: "2026-08-01", audience: "owner", text: "PRIVATE_ADA_SENTINEL: I use a different method for large teams." },
  { expert: "ben", source: "ben-public-2025", split: "train", date: "2025-03-01", audience: "public", text: "I prefer independently deployable services for large teams." },
  { expert: "ben", source: "ben-premium-2026", split: "heldout", date: "2026-08-01", audience: "premium", text: "PREMIUM_BEN_SENTINEL: My paid course explains operational exceptions." },
] as const;
export const goldenCases = [
  { id: "public-isolation", expert: "ada", viewer: "anonymous", mustExclude: ["PRIVATE_ADA_SENTINEL", "PREMIUM_BEN_SENTINEL"] },
  { id: "ordinary-premium-denial", expert: "ben", viewer: "ordinary", mustExclude: ["PREMIUM_BEN_SENTINEL"] },
  { id: "latest-correction", conversationLength: 64, expectedLatest: "Correction: my team now has 20 engineers" },
  { id: "keyword-only", query: "rare-tool", expectedSource: "keyword-only-source" },
] as const;
