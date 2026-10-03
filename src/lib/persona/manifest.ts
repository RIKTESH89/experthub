import type { Prisma } from "@prisma/client";
import { createHash } from "crypto";
import type { RetrievalScope } from "@/lib/knowledge/access";
export const MANIFEST_VERSION = "persona-release-v1";
export type PersonaConfig = { twinPersonality: string | null; twinGreeting: string | null; twinOpinions: string | null; twinFramework: string | null; twinBoundaries: string | null; ragEnabled: boolean; personalityProfile: Prisma.JsonValue | null };
export type SourcePin = { itemId: string; sourceVersion: number; revisionId: string; contentHash: string; snapshotHash: string; extractorVersion: string; vectorIds: string[] };
export type PersonaManifest = { format: typeof MANIFEST_VERSION; expertProfileId: string; config: PersonaConfig; sources: SourcePin[]; identity: { displayName: string; specialty: string[] }; renderedPersona: { visitor: string; owner: string }; algorithms: { evidence: string; temporal: string }; parentReleaseId: string | null; rollbackOf: string | null };
/** Stable serialization recursively sorts object keys; array ordering is intentional. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>`${JSON.stringify(key)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
export const manifestHash = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
export function sourcePinsEqual(a: SourcePin[], b: SourcePin[]) { return canonical(a) === canonical(b); }
export function sortedPins(pins: SourcePin[]): SourcePin[] {
  return pins.map(p=>({...p,vectorIds:Array.from(new Set(p.vectorIds)).sort()})).sort((a,b)=>a.itemId.localeCompare(b.itemId));
}
/** EXP14 read contract: intersection only. Caller must resolve a fresh live scope and
 * fresh current pins per request. Never treat a historical release as access authority. */
export function scopeForRelease(scope: RetrievalScope, manifest: PersonaManifest, currentPins: SourcePin[]): RetrievalScope {
  if (scope.expertProfileId !== manifest.expertProfileId) return {...scope,allowedVectorIds:[]};
  const current = new Map(currentPins.map(p=>[p.itemId,p]));
  const ids = new Set(manifest.sources.filter(p=>canonical(p)===canonical(current.get(p.itemId))).flatMap(p=>p.vectorIds));
  return {...scope,allowedVectorIds:scope.allowedVectorIds.filter(id=>ids.has(id))};
}
