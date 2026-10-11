import { supportedReplayCapsule } from "./runtime";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { RetrievalScope } from "@/lib/knowledge/access";
import { EXTRACTOR_VERSION } from "@/lib/graph/evidence-extractor";
import { supportedTemporalReadVersion } from "@/lib/graph/temporal/read-policy";
import { ACTIVE_MANIFEST_VERSION, supportedManifestVersion, manifestHash, scopeForRelease, type PersonaManifest } from "./manifest";
import { currentSourcePins, type Release } from "./store";

/** A release is content authority only. Access always comes from the fresh live scope. */
export async function readPersonaRelease(expertProfileId:string,store:Pick<Prisma.TransactionClient,"$queryRaw">=prisma):Promise<Release|null> {
  const rows = await store.$queryRaw<Release[]>`SELECT r.* FROM "PersonaReleaseHead" h
    LEFT JOIN "PersonaRelease" r ON r."id"=h."releaseId" AND r."expertProfileId"=h."expertProfileId"
    WHERE h."expertProfileId"=${expertProfileId}`;
  if (!rows.length) return null;
  const release = rows[0];
  const manifest: PersonaManifest | undefined = release?.manifest;
  if (!manifest || release.expertProfileId !== expertProfileId ||
      manifest.expertProfileId !== expertProfileId || !supportedManifestVersion(manifest.format) ||
      release.manifestHash !== manifestHash(manifest) ||
      manifest.algorithms?.evidence !== EXTRACTOR_VERSION ||
      !supportedTemporalReadVersion(manifest.algorithms?.temporal) ||
      typeof manifest.renderedPersona?.owner !== "string" || typeof manifest.renderedPersona?.visitor !== "string" ||
      typeof manifest.identity?.displayName !== "string" || !Array.isArray(manifest.sources) ||
      typeof manifest.config?.ragEnabled !== "boolean" ||
      (manifest.format===ACTIVE_MANIFEST_VERSION && !supportedReplayCapsule(manifest.runtime,manifest.greetings))) {
    throw new Error("Active persona release is invalid or unsupported");
  }
  return release;
}
export async function resolveReleasedPresentation(expertProfileId:string,store:Pick<Prisma.TransactionClient,"$queryRaw">=prisma) {
 const release=await readPersonaRelease(expertProfileId,store);if(!release)return null;
 const manifest=release.manifest;
 return {releaseId:release.id,format:manifest.format,displayName:manifest.identity.displayName,
  greeting:manifest.format===ACTIVE_MANIFEST_VERSION?manifest.greetings!.chat:(manifest.config.twinGreeting??null),
  widgetGreeting:manifest.format===ACTIVE_MANIFEST_VERSION?manifest.greetings!.widget:null};
}
/** Released content never grants access; intersect fresh current pins and live scope. */
export async function resolveServingPersona(scope:RetrievalScope,liveRagEnabled:boolean,store:Prisma.TransactionClient=prisma) {
 const release=await readPersonaRelease(scope.expertProfileId,store);
 const liveScope=liveRagEnabled?scope:{...scope,allowedVectorIds:[]};
 if(!release)return {scope:liveScope,releaseId:null,systemPrompt:null,displayName:null,greeting:null,widgetGreeting:null,runtime:null};
 const manifest=release.manifest;
  const pins = await currentSourcePins(store, scope.expertProfileId);
  const pinnedScope = scopeForRelease(liveScope, manifest, pins);
  return {
    scope: manifest.config.ragEnabled ? pinnedScope : {...pinnedScope, allowedVectorIds: []},
    releaseId: release.id,
    systemPrompt: scope.isOwner ? manifest.renderedPersona.owner : manifest.renderedPersona.visitor,
    displayName: manifest.identity.displayName,
    greeting: manifest.format===ACTIVE_MANIFEST_VERSION ? manifest.greetings!.chat : (manifest.config.twinGreeting ?? null),
    widgetGreeting: manifest.format===ACTIVE_MANIFEST_VERSION ? manifest.greetings!.widget : null,
    runtime: manifest.format===ACTIVE_MANIFEST_VERSION ? manifest.runtime! : null,
  };
}
