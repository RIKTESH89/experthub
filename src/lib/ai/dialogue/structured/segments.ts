import { z } from "zod";
import { claimSchema, draftSchema, LIMITS, STRUCTURED_VERSION, type StructuredDraft } from "./contracts";
import { checkStructuredDraft } from "./gate";
import { detachedSnapshot } from "./snapshots";
import { obviousPersonAssertion } from "./literal-support";

/** New opt-in generator wire contract only. Internal verifier/draft contracts stay v1. */
export const SEGMENT_VERSION = "dialogue-claim-segments-v1" as const;
export const SEGMENT_LIMITS = Object.freeze({ wireBytes: 64000, jsonDepth: 16, ...LIMITS });
export const segmentSchema = claimSchema.omit({ start: true, end: true }).extend({ text: z.string().min(1) });
export const segmentPayloadSchema = z.strictObject({ version: z.literal(SEGMENT_VERSION), segments: z.array(segmentSchema).min(1).max(LIMITS.claims) });
export type ClaimSegmentPayload = z.infer<typeof segmentPayloadSchema>;
export type SegmentDecodeResult = { ok: true; draft: StructuredDraft } | { ok: false; reasons: string[] };

function pairedUtf16(text: string): boolean {
    for (let i = 0; i < text.length; i++) {
        const unit = text.charCodeAt(i);
        if (unit >= 0xd800 && unit <= 0xdbff) {
            const next = text.charCodeAt(++i);
            if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
        } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
    }
    return true;
}

/** JSON.parse otherwise silently selects the last duplicate key. Scan already
 * syntax-validated JSON without interpreting any source/history text as commands. */
function uniqueJsonKeys(raw: string): boolean {
    const frames: { object: boolean; key: boolean; keys: Set<string> }[] = [];
    for (let i = 0; i < raw.length; i++) {
        const char = raw[i];
        if (char === '"') {
            const start = i++;
            for (; i < raw.length; i++) {
                if (raw[i] === "\\") i++;
                else if (raw[i] === '"') break;
            }
            const frame = frames.at(-1);
            if (frame?.object && frame.key) {
                const key: string = JSON.parse(raw.slice(start, i + 1));
                if (frame.keys.has(key)) return false;
                frame.keys.add(key); frame.key = false;
            }
        } else if (char === "{" || char === "[") {
            frames.push({ object: char === "{", key: char === "{", keys: new Set() });
            if (frames.length > SEGMENT_LIMITS.jsonDepth) return false;
        } else if (char === "}" || char === "]") frames.pop();
        else if (char === "," && frames.at(-1)?.object) frames.at(-1)!.key = true;
    }
    return true;
}

/** Delimiter structure only, never evidence support. Single quotations use a
 * conservative outer-pair grammar; contractions/plural possessives are prose.
 * Multiple separate single quotations may refuse rather than infer their pairing. */
function closedQuotes(text: string): { ok: boolean; ranges: [number, number][] } {
    const doublesAndCurly = Array.from(text.matchAll(/"(?:\\.|[^"\\])*"|“[^”]*”|‘[^\n]+’(?=$|[\s.,;:)])/g));
    const singles = Array.from(text.matchAll(/(?:^|[\s(:,])'([^\n]+)'(?=$|[\s.,;:)])/g));
    const matches = [...doublesAndCurly, ...singles];
    let remainder = text;
    for (const match of matches) remainder = remainder.replace(match[0], "");
    const invalid = /["“”‘]/.test(remainder) || /(?:^|[\s(:,])'(?=\S)/.test(remainder)
        || new RegExp("(?:^|[^\\p{L}\\p{N}])[’']", "u").test(remainder)
        || /[’'](?=$|[.,;:)])/.test(remainder)
        || (text.includes("‘") && /’(?=$|[\s.,;:)])/.test(remainder))
        || (singles.length > 0 && /'(?=$|[\s.,;:)])/.test(remainder));
    const ranges = matches.map(match => {
        const prefix = match[0].startsWith("'") || !singles.includes(match) ? 0 : match[0].indexOf("'");
        return [match.index! + prefix, match.index! + match[0].length] as [number, number];
    });
    return { ok: !invalid, ranges };
}

/** A punctuated subject-only rhetorical fragment can imply the next segment's
 * career assertion ("The expert? A cardiologist."). Refuse this finite pattern;
 * sentence punctuation alone is not a semantic proposition-completeness proof. */
function ambiguousPersonEnd(text: string): boolean {
    const subject = "(?:I|he|she|they|the expert|the represented person|this person|that person|(?:this|that|the|our|your)\\s+(?:AI\\s+)?(?:representation|avatar|(?:digital|AI)\\s+twin|twin))";
    return new RegExp(`(?:^|[.!?\\n]\\s*)(?:(?:who|what) is |what about )?${subject}(?:['’]s\\s+(?:belief|motive|experience|credentials?|preference|position|reason|opinion))?\\s*[.!?]\\s*$`, "i").test(text)
        || /(?:^|[.!?\n]\s*)(?:their|his|her)\s+(?:(?:clinical|medical|professional|legal)\s+)?(?:belief|motive|experience|credentials?|preference|position|reason|opinion|career|role|training|degree|licen[cs]e)\s*[.!?]\s*$/i.test(text)
        || new RegExp(`${subject},\\s*(?:Ph\\.D\\.|M\\.D\\.)\\s*$`, "i").test(text);
}

function adjacentCareerFragment(first: string, second: string): boolean {
    const representedSubject = /\b(?:the expert|the represented person|this person|that person|(?:this|that|the|our|your)\s+(?:AI\s+)?(?:representation|avatar|(?:digital|AI)\s+twin|twin))\b/i;
    const career = "(?:an?\\s+)(?:(?:licensed|qualified|professional|board[- ]certified)\\s+)*(?:doctor|surgeon|physician|clinician|cardiologist|lawyer|attorney|optometrist|therapist|broker|financial advis[oe]r|medical degree)";
    const bareCareer = new RegExp(`^\\s*${career}\\s*[.!?]\\s*$`, "i");
    const careerQuestion = new RegExp(`(?:^|[.!?\\n]\\s*)(?:who is |which person is )?${career}\\s*\\?\\s*$`, "i");
    const subjectAnswer = new RegExp(`^\\s*${representedSubject.source}\\s*[.!?]\\s*$`, "i");
    return representedSubject.test(first) && bareCareer.test(second) || careerQuestion.test(first) && subjectAnswer.test(second);
}

/** Accept only the new raw JSON wire string. No old-output repair, fallback,
 * substring search, separators, trimming, normalization or evidence pooling. */
export function decodeSegmentGeneration(raw: unknown): SegmentDecodeResult {
    const fail = (reason: string): SegmentDecodeResult => ({ ok: false, reasons: [reason] });
    if (typeof raw !== "string") return fail("segment-wire-string-required");
    if (Buffer.byteLength(raw, "utf8") > SEGMENT_LIMITS.wireBytes) return fail("segment-wire-byte-budget");
    let object: unknown;
    try { object = JSON.parse(raw); } catch { return fail("segment-json-invalid"); }
    if (!uniqueJsonKeys(raw)) return fail("segment-json-key-or-depth-ambiguity");
    const parsed = segmentPayloadSchema.safeParse(object);
    if (!parsed.success) return fail("invalid-segment-envelope");
    const payload = parsed.data, ids = new Set<string>(), claims: StructuredDraft["claims"] = [];
    let text = "", cursor = 0;
    const boundaries: number[] = [];
    for (let i = 0; i < payload.segments.length; i++) {
        const segment = payload.segments[i];
        if (!segment.text.trim()) return fail("empty-segment-text");
        if (!pairedUtf16(segment.text)) return fail("segment-unpaired-surrogate");
        if (ids.has(segment.id)) return fail("duplicate-segment-id");
        ids.add(segment.id);
        if (segment.category === "evidence-gap" && obviousPersonAssertion(segment.text)) return fail("segment-person-assertion-in-gap");
        if (!closedQuotes(segment.text).ok) return fail("segment-quote-boundary");
        if (i < payload.segments.length - 1) {
            if (!/[.!?](?:["”’'\)\]]){0,2}$/.test(segment.text.trimEnd())) return fail("segment-sentence-boundary");
            if (ambiguousPersonEnd(segment.text)) return fail("segment-person-fragment-boundary");
            if (adjacentCareerFragment(segment.text, payload.segments[i + 1].text)) return fail("segment-person-fragment-boundary");
        }
        const { text: piece, ...metadata } = segment;
        claims.push({ ...metadata, start: cursor, end: cursor + piece.length });
        cursor += piece.length; text += piece; boundaries.push(cursor);
    }
    if (Buffer.byteLength(text, "utf8") > LIMITS.draftBytes) return fail("draft-byte-budget");
    const quotes = closedQuotes(text);
    if (!quotes.ok || quotes.ranges.some(([start, end]) => boundaries.some(boundary => start < boundary && boundary < end))) return fail("segment-quote-boundary");
    const checked = draftSchema.safeParse({ version: STRUCTURED_VERSION, text, claims });
    if (!checked.success) return fail("invalid-derived-draft");
    const structural = checkStructuredDraft(checked.data);
    if (structural.length) return { ok: false, reasons: structural };
    return { ok: true, draft: detachedSnapshot(checked.data) };
}
