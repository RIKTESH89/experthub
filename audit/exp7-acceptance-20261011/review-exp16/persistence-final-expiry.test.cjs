const scopeRead = jest.fn(), personaRead = jest.fn();
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/knowledge/access', () => ({ resolveRetrievalScope: scopeRead }));
jest.mock('@/lib/persona/serving', () => ({ resolveServingPersona: personaRead }));
const { authorizeChatPersistence } = require('@/lib/persona/persistence');
const { manifestHash } = require('@/lib/persona/manifest');

test('independent review: expiry during final authorization reads must fail before COMMIT callback returns', async () => {
  const instant = Date.parse('2026-10-11T10:00:00.000Z');
  jest.useFakeTimers().setSystemTime(instant);
  const scope = { expertProfileId: 'expert', namespace: 'ns', viewerId: 'viewer', isOwner: false, allowedVectorIds: [] };
  const subscription = { tier: 'PREMIUM', status: 'ACTIVE', razorpayPaymentId: 'synthetic', paidPeriodStart: new Date(instant - 1000), currentPeriodEnd: new Date(instant + 1000) };
  const snapshot = { scope, ownerId: 'owner', releaseId: 'head', ragEnabled: true, sourceStateHash: manifestHash({ items: [], posts: [] }) };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    chatSession: { findUnique: jest.fn().mockResolvedValue({ subscriberId: 'viewer', expertProfileId: 'expert', isTrial: false }) },
    user: { findMany: jest.fn().mockResolvedValue([{ id: 'owner', role: 'EXPERT', isBanned: false, isActive: true }, { id: 'viewer', role: 'SUBSCRIBER', isBanned: false, isActive: true }]) },
    expertProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'expert', userId: 'owner', vectorNamespace: 'ns', ragEnabled: true }) },
    expertSubscription: { findUnique: jest.fn().mockResolvedValue(subscription) },
    knowledgeItem: { findMany: jest.fn().mockResolvedValue([]) }, post: { findMany: jest.fn().mockResolvedValue([]) },
  };
  scopeRead.mockImplementation(async () => { jest.setSystemTime(instant + 1500); return scope; });
  personaRead.mockResolvedValue({ releaseId: 'head', scope });
  try { await expect(authorizeChatPersistence(tx, snapshot, 'session', 'viewer', 'SUBSCRIBER')).rejects.toThrow('subscription'); }
  finally { jest.useRealTimers(); }
});
