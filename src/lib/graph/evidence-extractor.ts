import { createHash } from "crypto";

export const EXTRACTOR_VERSION = "literal-preference-v1";
export const hashEvidence = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export interface ExtractedAssertion {
  start: number; end: number; text: string; speakerId: string | null;
  speakerRole: "author" | "quoted" | "unknown"; subject: string;
  predicate: string; object: string; kind: "explicit" | "inferred" | "unknown";
  endorsedByOwner: boolean;
}

/** Deliberately narrow, deterministic English extractor. Unsupported syntax abstains.
 * No model calls, inference or name-to-person resolution. Quotes never imply endorsement.
 * Offsets are JavaScript UTF-16 offsets in the immutable title + body snapshot.
 */
export function extractLiteralAssertions(content: string, authorId: string | null, ownerId: string): ExtractedAssertion[] {
  const output: ExtractedAssertion[] = [];
  // A whole line is the support span. Multi-line/ambiguous quotes fail closed.
  const line = /[^\r\n]+/g;
  for (const match of Array.from(content.matchAll(line))) {
    const text = match[0];
    if (text.length > 2000) continue;
    const quote = text.match(/^\s*([^:"“”]{1,80})\s+(?:said|wrote):\s*["“]([^"“”]+)["”]\s*[.!]?\s*$/i);
    const hasQuote = /["“”]/.test(text);
    if (hasQuote && !quote) continue;
    const statement = (quote ? quote[2] : text).trim();
    const preference = statement.match(/^I\s+(prefer|recommend)\s+(.+?)[.!]?$/i);
    if (!preference) continue;
    const speakerId = quote ? `quoted:${quote[1].trim()}` : authorId;
    const speakerRole = quote ? "quoted" : authorId ? "author" : "unknown";
    output.push({ start: match.index!, end: match.index! + text.length, text,
      speakerId, speakerRole, subject: speakerId || "unknown-speaker",
      predicate: preference[1].toLowerCase(), object: preference[2].trim(),
      kind: speakerId ? "explicit" : "unknown",
      endorsedByOwner: !quote && authorId === ownerId });
  }
  return output;
}

export function overlappingChunks(expert: string, item: string, version: number, start: number, end: number, length: number): string[] {
  const ids: string[] = [];
  for (let offset = 0, index = 0; offset < length; offset += 800, index++) {
    if (start < Math.min(offset + 1000, length) && end > offset) ids.push(`${expert}:${item}:v${version}:chunk_${index}`);
  }
  return ids;
}
