// Public transport contract shared by stream, reload and client. Raw source content is not a citation.
export interface MessageSource {
  title: string;
  snippet: string;
  score?: number;
  url?: string;
  metadata?: Record<string, unknown>;
}
const evidenceFields = ["assertionId", "revisionId", "spanId", "itemId", "contentHash", "sourceVersion", "subject", "predicate", "object", "kind", "endorsedByOwner", "authorId", "uploaderId", "speakerId", "speakerRole", "audience", "publishedAt", "publicationTimeBasis", "sourceUpdatedAt", "ingestedAt", "start", "end", "text", "chunkIds", "extractorVersion", "weight"];
const stanceFields = [...evidenceFields, "id", "speaker", "origin", "domain", "context", "category", "polarity", "action", "validFrom", "validUntil", "certainty", "supersedes", "recordedAt", "situation", "constraints", "chosenAction", "documentedReasons", "alternatives", "tradeoffs", "exceptions", "decisionType", "uncertainty"];
function record(value: unknown): Record<string, unknown> | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function pick(value: unknown, fields: string[]) {
  const input = record(value); if (!input) return {};
  return Object.fromEntries(fields.filter(key => Object.prototype.hasOwnProperty.call(input, key)).map(key => [key, input[key]]));
}
export function toMessageSources(value: unknown): MessageSource[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const source = record(item); if (!source) return [];
    const meta = record(source.metadata);
    const content = typeof source.content === "string" ? source.content : "";
    const title = typeof source.title === "string" ? source.title : typeof meta?.title === "string" ? meta.title : content.split("\n")[0]?.slice(0, 80) || "Source";
    const snippet = typeof source.snippet === "string" ? source.snippet.slice(0, 200) : content.slice(0, 200);
    const result: MessageSource = { title, snippet };
    if (typeof source.score === "number" && Number.isFinite(source.score)) result.score = source.score;
    const url = source.url ?? meta?.sourceUrl ?? meta?.url;
    if (typeof url === "string" && /^https?:\/\//i.test(url)) result.url = url;
    if (meta) {
      result.metadata = pick(meta, ["expertProfileId", "vectorId", "generationAudience", "sourceVersion"]);
      if (Array.isArray(meta.evidenceTrace)) result.metadata.evidenceTrace = meta.evidenceTrace.map(trace => pick(trace, evidenceFields));
      const temporal = record(meta.temporalTrace);
      if (temporal) result.metadata.temporalTrace = {
        ...pick(temporal, ["mode", "validAt", "coverage"]),
        stances: Array.isArray(temporal.stances) ? temporal.stances.map(trace => pick(trace, stanceFields)) : [],
        supersededStances: Array.isArray(temporal.supersededStances) ? temporal.supersededStances.map(trace => pick(trace, stanceFields)) : [],
        relations: Array.isArray(temporal.relations) ? temporal.relations.map(trace => pick(trace, ["type", "kind", "from", "to", "evidenceSpanIds", "uncertainty"])) : [],
      };
    }
    return [result];
  });
}
