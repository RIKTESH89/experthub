"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.widgetAccessHash = void 0;
exports.chatPersistenceSnapshot = chatPersistenceSnapshot;
exports.captureChatPersistenceSnapshot = captureChatPersistenceSnapshot;
exports.authorizeChatPersistence = authorizeChatPersistence;
exports.widgetOriginAllowed = widgetOriginAllowed;
exports.authorizeWidgetPersistence = authorizeWidgetPersistence;
const prisma_1 = require("@/lib/prisma");
// Snapshot from 96ef26d; only the two relative imports are relocated for review.
const manifest_1 = require("@/lib/persona/manifest");
const access_1 = require("@/lib/knowledge/access");
const access_2 = require("@/lib/payments/access");
const serving_1 = require("@/lib/persona/serving");
function chatPersistenceSnapshot(scope, ownerId, releaseId, ragEnabled) {
    return { scope: { ...scope, allowedVectorIds: [...scope.allowedVectorIds] }, ownerId, releaseId, ragEnabled };
}
async function sourceStateHash(scope, store) {
    const items = await store.knowledgeItem.findMany({ where: { expertProfileId: scope.expertProfileId, vectorIds: { hasSome: scope.allowedVectorIds } }, orderBy: { id: "asc" }, select: { id: true, sourceType: true, sourceId: true, sourceVersion: true, indexedVersion: true, isIndexed: true, title: true, content: true, metadata: true, vectorIds: true } });
    const postIds = (items ?? []).filter(i => i.sourceType === 'post' && i.sourceId).map(i => i.sourceId);
    const posts = postIds.length ? await store.post.findMany({ where: { id: { in: postIds } }, orderBy: { id: "asc" }, select: { id: true, authorId: true, title: true, content: true, status: true, isHidden: true, isPremiumOnly: true, isRagEnabled: true } }) : [];
    return (0, manifest_1.manifestHash)({ items: items ?? [], posts });
}
async function captureChatPersistenceSnapshot(scope, ownerId, releaseId, ragEnabled, store = prisma_1.default) {
    return { ...chatPersistenceSnapshot(scope, ownerId, releaseId, ragEnabled), sourceStateHash: await sourceStateHash(scope, store) };
}
/** Close the EOF-to-SQL race. Hold the existing expert/source protocol and the
 * current session/subscription rows until the answer transaction commits.
 * Direct admin/source writes also conflict with the relevant row locks. No
 * provider, indexing or nested transaction work runs inside this boundary.
 */
async function authorizeChatPersistence(tx, snapshot, sessionId, subscriberId, viewerRole) {
    if (!snapshot || snapshot.scope.viewerId !== subscriberId)
        throw new Error("Chat persistence receipt missing or invalid");
    const { scope, ownerId, releaseId, ragEnabled } = snapshot;
    if (!snapshot.sourceStateHash)
        throw new Error("Chat source receipt missing");
    // User deletion cascades to ExpertProfile: lock User first. NO KEY UPDATE
    // blocks account/role mutation while permitting source-writer FK KEY SHARE.
    await tx.$queryRaw `SELECT "id" FROM "User" WHERE "id" IN (${ownerId},${subscriberId}) ORDER BY "id" FOR NO KEY UPDATE`;
    await tx.$queryRaw `SELECT "id" FROM "ExpertProfile" WHERE "id"=${scope.expertProfileId} FOR UPDATE`;
    await tx.$queryRaw `SELECT "id" FROM "ChatSession" WHERE "id"=${sessionId} FOR UPDATE`;
    const session = await tx.chatSession.findUnique({ where: { id: sessionId } });
    if (!session || session.subscriberId !== subscriberId || session.expertProfileId !== scope.expertProfileId)
        throw new Error("Chat session access changed before persistence");
    const users = await tx.user.findMany({ where: { id: { in: [ownerId, subscriberId] } } });
    const owner = users.find(user => user.id === ownerId), viewer = users.find(user => user.id === subscriberId);
    if (!owner || !viewer || owner.isBanned || !owner.isActive || viewer.isBanned || !viewer.isActive || !["EXPERT", "ADMIN"].includes(owner.role) || (viewerRole && viewer.role !== viewerRole))
        throw new Error("Chat account access changed before persistence");
    await tx.$queryRaw `SELECT "id" FROM "ExpertSubscription" WHERE "expertProfileId"=${scope.expertProfileId} AND "subscriberId"=${subscriberId} FOR UPDATE`;
    await tx.$queryRaw `SELECT "id" FROM "KnowledgeItem" WHERE "expertProfileId"=${scope.expertProfileId} ORDER BY "id" FOR UPDATE`;
    await tx.$queryRaw `SELECT "id" FROM "Post" WHERE "authorId"=${ownerId} ORDER BY "id" FOR UPDATE`;
    const expert = await tx.expertProfile.findUnique({ where: { id: scope.expertProfileId } });
    if (!expert || expert.userId !== ownerId || expert.vectorNamespace !== scope.namespace || (expert.ragEnabled ?? true) !== ragEnabled)
        throw new Error("Expert identity or RAG permission changed before persistence");
    if (!session.isTrial && subscriberId !== ownerId) {
        const subscription = await tx.expertSubscription.findUnique({ where: { subscriberId_expertProfileId: { subscriberId, expertProfileId: scope.expertProfileId } } });
        if (!(0, access_2.hasSubscriptionAccess)(subscription))
            throw new Error("Chat subscription access changed before persistence");
    }
    const currentScope = await (0, access_1.resolveRetrievalScope)(expert.id, expert.vectorNamespace, expert.userId, subscriberId, tx);
    const currentPersona = await (0, serving_1.resolveServingPersona)(currentScope, expert.ragEnabled ?? true, tx);
    if (await sourceStateHash(scope, tx) !== snapshot.sourceStateHash)
        throw new Error("Chat source state changed before persistence");
    if (currentPersona.releaseId !== releaseId || currentScope.isOwner !== scope.isOwner || scope.allowedVectorIds.some(id => !currentPersona.scope.allowedVectorIds.includes(id)))
        throw new Error("Persona release or source access changed before persistence");
}
const widgetAccessHash = (config) => (0, manifest_1.manifestHash)({ expertProfileId: config.expertProfileId, apiKey: config.apiKey, isEnabled: config.isEnabled, allowedDomains: config.allowedDomains, freeQuestions: config.freeQuestions });
exports.widgetAccessHash = widgetAccessHash;
/** Empty configured list is public. Nonempty lists require an exact hostname or
 * full HTTP(S) origin; malformed values fail closed, with no suffix wildcards. */
function widgetOriginAllowed(allowedDomains, origin) {
    if (!allowedDomains.length)
        return true;
    if (!origin)
        return false;
    let parsed;
    try {
        parsed = new URL(origin);
    }
    catch {
        return false;
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin)
        return false;
    return allowedDomains.some(domain => {
        if (domain.includes('://')) {
            try {
                const configured = new URL(domain);
                return configured.origin === origin && configured.pathname === '/' && !configured.search && !configured.hash;
            }
            catch {
                return false;
            }
        }
        return /^[a-z0-9.-]+$/i.test(domain) && domain.toLowerCase() === parsed.hostname.toLowerCase();
    });
}
/** Anonymous widget identity is server-validated independently of account IDs.
 * Follow release ordering through sources/posts, then widget parent/session. */
async function authorizeWidgetPersistence(tx, snapshot, identity, incremented = false) {
    if (!snapshot || snapshot.scope.viewerId || snapshot.scope.isOwner || !snapshot.sourceStateHash)
        throw new Error('Anonymous widget persistence receipt missing or invalid');
    const { scope, ownerId, ragEnabled, releaseId } = snapshot;
    await tx.$queryRaw `SELECT "id" FROM "User" WHERE "id"=${ownerId} FOR NO KEY UPDATE`;
    await tx.$queryRaw `SELECT "id" FROM "ExpertProfile" WHERE "id"=${scope.expertProfileId} FOR UPDATE`;
    await tx.$queryRaw `SELECT "id" FROM "KnowledgeItem" WHERE "expertProfileId"=${scope.expertProfileId} ORDER BY "id" FOR UPDATE`;
    await tx.$queryRaw `SELECT "id" FROM "Post" WHERE "authorId"=${ownerId} ORDER BY "id" FOR UPDATE`;
    await tx.$queryRaw `SELECT "id" FROM "WidgetConfig" WHERE "id"=${identity.configId} FOR UPDATE`;
    await tx.$queryRaw `SELECT "id" FROM "WidgetSession" WHERE "id"=${identity.sessionId} FOR UPDATE`;
    const owner = await tx.user.findUnique({ where: { id: ownerId } });
    const expert = await tx.expertProfile.findUnique({ where: { id: scope.expertProfileId } });
    const config = await tx.widgetConfig.findUnique({ where: { id: identity.configId } });
    const session = await tx.widgetSession.findUnique({ where: { id: identity.sessionId } });
    if (!owner || owner.isBanned || !owner.isActive || !['EXPERT', 'ADMIN'].includes(owner.role) || !expert || expert.userId !== ownerId || expert.vectorNamespace !== scope.namespace || (expert.ragEnabled ?? true) !== ragEnabled)
        throw new Error('Widget expert access changed before persistence');
    if (!config || !config.isEnabled || config.expertProfileId !== expert.id || (0, exports.widgetAccessHash)(config) !== identity.configHash || !widgetOriginAllowed(config.allowedDomains, identity.origin))
        throw new Error('Widget configuration access changed before persistence');
    if (!session || session.widgetConfigId !== config.id || session.visitorId !== identity.visitorId || (incremented ? session.questionCount > config.freeQuestions : session.questionCount >= config.freeQuestions))
        throw new Error('Widget session access or question limit changed before persistence');
    const currentScope = await (0, access_1.resolveRetrievalScope)(expert.id, expert.vectorNamespace, ownerId, undefined, tx);
    const persona = await (0, serving_1.resolveServingPersona)(currentScope, ragEnabled, tx);
    if (persona.releaseId !== releaseId || currentScope.isOwner || scope.allowedVectorIds.some(id => !persona.scope.allowedVectorIds.includes(id)) || await sourceStateHash(scope, tx) !== snapshot.sourceStateHash)
        throw new Error('Widget release or source state changed before persistence');
}
