import { createHash } from "crypto";
import { AsyncLocalStorage } from "async_hooks";
import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient;
const KIND = "REPAIR_FENCE";
const CLOSED = "HOLD_REPAIR_FENCE";
const markerId = (id: string) => createHash("sha256").update(`repair-fence-v1\0${id}`).digest("hex");
const lockName = (id: string) => `experthub-source-operation-v1:${id}`;
const owners = new WeakMap<object, { operationId: string; namespaces: Map<string, string> }>();
const workerContext = new AsyncLocalStorage<{ experts: ReadonlySet<string>; signal: AbortSignal; deadline: number; expire: () => void }>();
export function sourceWorkerSignal(): AbortSignal | undefined {
  const current = workerContext.getStore();
  // An event-loop-delayed timer cannot admit a dispatch after the wall deadline.
  if (current && Date.now() >= current.deadline) current.expire();
  return current?.signal;
}

export class RepairFenceError extends Error {
  constructor() { super("Source operation temporarily fenced; no automatic retry"); this.name = "RepairFenceError"; }
}

/** Shared holder is acquired BEFORE Expert/source locks and lasts until commit. */
export async function holdSourceWriter(tx: Tx, expertId: string) {
  const [r] = await tx.$queryRaw<{ admitted: boolean }[]>`SELECT pg_try_advisory_xact_lock_shared(hashtextextended(${lockName(expertId)},0)) AS admitted`;
  if (!r?.admitted) throw new RepairFenceError();
  const marker = await tx.knowledgeLifecycleJob.findUnique({ where: { id: markerId(expertId) } });
  if (marker) {
    const expert = await tx.expertProfile.findUnique({ where: { id: expertId } });
    if (marker.kind !== KIND || marker.expertProfileId !== expertId || marker.itemId !== expertId || marker.namespace !== expert?.vectorNamespace || marker.sourceVersion !== null || marker.vectorIds.length || ![CLOSED, "REPAIR_RELEASED"].includes(marker.state)) throw new RepairFenceError();
    const owner = owners.get(tx);
    if (marker.state !== "REPAIR_RELEASED" && (!owner || owner.operationId !== marker.leaseToken || owner.namespaces.get(expertId) !== marker.namespace)) throw new RepairFenceError();
  }
}

/** Recheck after the row lock: marker installation serializes with current writes. */
export async function admitSourceWrite(tx: Tx, expertId: string) {
  await holdSourceWriter(tx, expertId);
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "ExpertProfile" WHERE "id"=${expertId} FOR UPDATE`;
  if (!rows.length) throw new Error("Source owner no longer exists");
  await holdSourceWriter(tx, expertId);
}

/** Keep the shared holder over provider/index/cleanup/ack, not merely the claim. */
export async function withSourceWorker<T>(db: PrismaClient, expertId: string, work: () => Promise<T>): Promise<T> {
  if (workerContext.getStore()?.experts.has(expertId)) { sourceWorkerSignal()?.throwIfAborted(); return work(); }
  const controller = new AbortController();
  // Prisma may expire the SQL holder while an uncooperative callback remains
  // pending. Bound future dispatch independently of transaction completion.
  const expire = () => controller.abort(new Error("Source worker lifetime exceeded; no further embedding dispatch"));
  const horizon = Math.min(Date.now() + 615_000, workerContext.getStore()?.deadline ?? Infinity);
  const deadline = setTimeout(expire, Math.max(0, horizon - Date.now()));
  const parent = sourceWorkerSignal();
  const signal = parent ? AbortSignal.any([parent, controller.signal]) : controller.signal;
  try {
    return await db.$transaction(async tx => { await holdSourceWriter(tx, expertId); signal.throwIfAborted(); return workerContext.run({ experts: new Set([...Array.from(workerContext.getStore()?.experts || []), expertId]), signal, deadline: horizon, expire }, work); }, { timeout: 615_000, maxWait: 5000 });
  } finally { clearTimeout(deadline); controller.abort(new Error("Source worker holder ended; no further embedding dispatch")); }
}

/** This candidate has no live operator activation. Existing rows only deny work. */
export function activateLiveRepairFence(): never {
  throw new Error("LIVE REPAIR FENCE ACTIVATION DISABLED: deployed legacy writers/private operation bindings absent");
}

/** Local fixture construction only. Marker survives timeout/keeper loss; no TTL opens it. */
export async function withSyntheticRepairFence<T>(db: PrismaClient, operationId: string, expertIds: string[], work: (tx: Tx) => Promise<T>): Promise<T> {
  const ids = Array.from(new Set(expertIds)).sort();
  if (!/^mock-[a-z0-9-]{1,80}$/.test(operationId) || !ids.length || ids.length > 5 || ids.some(id => !/^mock-[a-z0-9-]{1,80}$/.test(id))) throw new Error("Owned synthetic operation only");
  const [identity] = await db.$queryRaw<{ db: string; role: string; address: string | null }[]>`SELECT current_database() AS db,current_user AS role,inet_server_addr()::text AS address`;
  if (identity?.db !== "exp17_repair" || identity.role !== "exp17_repair" || identity.address !== null) throw new Error("Owned local database only");
  // Do not wait for the exclusive holder while keeping Expert row locks.
  const namespaces = await db.$transaction(async tx => {
    const scoped = new Map<string, string>();
    for (const id of ids) {
      const rows = await tx.$queryRaw<{ vectorNamespace: string }[]>`SELECT "vectorNamespace" FROM "ExpertProfile" WHERE "id"=${id} FOR UPDATE`;
      if (!rows.length) throw new Error("Synthetic owner missing");
      scoped.set(id, rows[0].vectorNamespace);
      const old = await tx.knowledgeLifecycleJob.findUnique({ where: { id: markerId(id) } });
      if (old && (old.kind !== KIND || old.state !== "REPAIR_RELEASED")) throw new RepairFenceError();
      await tx.knowledgeLifecycleJob.upsert({ where: { id: markerId(id) }, create: { id: markerId(id), kind: KIND, itemId: id, expertProfileId: id, namespace: rows[0].vectorNamespace, sourceVersion: null, vectorIds: [], state: CLOSED, leaseToken: operationId }, update: { state: CLOSED, leaseToken: operationId, leaseUntil: null } });
    }
    return scoped;
  });
  return db.$transaction(async tx => {
    for (const id of ids) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockName(id)},0))::text AS acquired`;
    // Advisory-holder loss is not JavaScript/provider settlement. Unacknowledged
    // work remains blocked, including expired leases; never reset it automatically.
    if (await tx.knowledgeLifecycleJob.count({ where: { expertProfileId: { in: ids }, kind: { in: ["INDEX", "POST_SYNC", "CLEANUP"] }, state: "RUNNING" } })) throw new Error("Source worker settlement unknown");
    if (await tx.importJob.count({ where: { expertProfileId: { in: ids }, status: { in: ["PENDING", "PROCESSING"] } } })) throw new Error("Import worker settlement unknown");
    owners.set(tx, { operationId, namespaces });
    try { for (const id of ids) await holdSourceWriter(tx, id); return await work(tx); }
    finally { owners.delete(tx); }
  }, { timeout: 615_000, maxWait: 5000 });
  // Deliberately no implicit release, even on success or failure. Future reviewed
  // release must bind durable terminal receipt, retention decision and settlement.
}
