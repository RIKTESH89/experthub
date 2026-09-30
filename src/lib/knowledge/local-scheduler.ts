/** Explicitly started local test runner; never registered as an application service. */
export interface SchedulerClock {
  now(): Date;
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}
export interface LocalSchedulerOptions {
  syntheticExpertIds: readonly string[];
  drain: (expertId: string, limit: number, now: Date) => Promise<unknown>;
  clock: SchedulerClock;
  intervalMs?: number;
  batchSize?: number;
  onError?: (expertId: string, error: unknown) => void;
}

export function createLocalScheduler(options: LocalSchedulerOptions) {
  const ids = Array.from(new Set(options.syntheticExpertIds));
  if (!ids.length || ids.length > 10 || ids.some(id => !/^synthetic-[a-z0-9-]{1,64}$/.test(id))) {
    throw new Error("Explicit synthetic expert allowlist required (maximum 10)");
  }
  const interval = options.intervalMs ?? 1000;
  const batch = options.batchSize ?? 20;
  if (!Number.isInteger(interval) || interval < 1000 || !Number.isInteger(batch) || batch < 1 || batch > 20) {
    throw new Error("Invalid local scheduler interval/batch limits");
  }
  let stopped = false;
  let started = false;
  let timer: unknown;
  let active: Promise<void> | undefined;
  function schedule() {
    if (!stopped) timer = options.clock.setTimeout(() => { timer = undefined; void tick(); }, interval);
  }
  function tick(): Promise<void> {
    if (stopped) return Promise.resolve();
    if (active) return active;
    if (timer !== undefined) { options.clock.clearTimeout(timer); timer = undefined; }
    active = (async () => {
      for (const id of ids) {
        if (stopped) break;
        try { await options.drain(id, batch, options.clock.now()); }
        catch (error) { try { options.onError?.(id, error); } catch { /* logging cannot kill recovery */ } }
      }
    })().finally(() => { active = undefined; if (started) schedule(); });
    return active;
  }
  return {
    start() { if (stopped) throw new Error("Create a new scheduler after shutdown"); if (!started) { started = true; schedule(); } },
    tick,
    async shutdown() { stopped = true; if (timer !== undefined) options.clock.clearTimeout(timer); timer = undefined; await active; },
  };
}

/** Native clock for an explicitly invoked local integration harness. No timer starts on import. */
export const localRuntimeClock: SchedulerClock = {
  now: () => new Date(),
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};
