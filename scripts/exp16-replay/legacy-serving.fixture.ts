// Deployed 8897903 reader; only local relative imports remapped for this isolated fixture.
import prisma from "@/lib/prisma";
import type { RetrievalScope } from "@/lib/knowledge/access";
import { EXTRACTOR_VERSION } from "@/lib/graph/evidence-extractor";
import { supportedTemporalReadVersion } from "@/lib/graph/temporal/read-policy";
import { MANIFEST_VERSION, manifestHash, scopeForRelease, type PersonaManifest } from "@/lib/persona/manifest";
import { currentSourcePins, type Release } from "@/lib/persona/store";

/** A release is content authority only. Access always comes from the fresh live scope. */
export async function resolveServingPersona(scope: RetrievalScope, liveRagEnabled: boolean) {
  const rows = await prisma.$queryRaw<Release[]>`SELECT r.* FROM "PersonaReleaseHead" h
    LEFT JOIN "PersonaRelease" r ON r."id"=h."releaseId" AND r."expertProfileId"=h."expertProfileId"
    WHERE h."expertProfileId"=${scope.expertProfileId}`;
  const liveScope = liveRagEnabled ? scope : {...scope, allowedVectorIds: []};
  // Compatibility for experts who have never published a reviewed release.
  if (!rows.length) return {scope: liveScope, releaseId: null, systemPrompt: null, displayName: null};
  const release = rows[0];
  const manifest: PersonaManifest | undefined = release?.manifest;
  if (!manifest || release.expertProfileId !== scope.expertProfileId ||
      manifest.expertProfileId !== scope.expertProfileId || manifest.format !== MANIFEST_VERSION ||
      release.manifestHash !== manifestHash(manifest) ||
      manifest.algorithms?.evidence !== EXTRACTOR_VERSION ||
      !supportedTemporalReadVersion(manifest.algorithms?.temporal) ||
      typeof manifest.renderedPersona?.owner !== "string" || typeof manifest.renderedPersona?.visitor !== "string" ||
      typeof manifest.identity?.displayName !== "string" || !Array.isArray(manifest.sources) ||
      typeof manifest.config?.ragEnabled !== "boolean") {
    throw new Error("Active persona release is invalid or unsupported");
  }
  const pins = await currentSourcePins(prisma, scope.expertProfileId);
  const pinnedScope = scopeForRelease(liveScope, manifest, pins);
  return {
    scope: manifest.config.ragEnabled ? pinnedScope : {...pinnedScope, allowedVectorIds: []},
    releaseId: release.id,
    systemPrompt: scope.isOwner ? manifest.renderedPersona.owner : manifest.renderedPersona.visitor,
    displayName: manifest.identity.displayName,
  };
}
