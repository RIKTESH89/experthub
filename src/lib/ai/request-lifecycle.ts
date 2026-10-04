/** Transport cancellation and deadlines never change entitlement or usage policy. */
export class ChatRequestStopped extends Error {
  constructor(public readonly kind: "cancelled" | "deadline") { super(`Chat request ${kind}`); this.name = "ChatRequestStopped"; }
}
const deadlines = new WeakMap<AbortSignal, { at: number; expire: () => void }>();
export function checkSignal(signal?: AbortSignal): void {
  const deadline = signal && deadlines.get(signal);
  if (deadline && Date.now() >= deadline.at) deadline.expire();
  if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : new ChatRequestStopped("cancelled");
}
export function chatRequestDeadlineMs(): number {
  // A server-only local test override; never accepted from request JSON.
  if (process.env.EXP29_HTTP_SYNTHETIC === "1" && ["test", "development"].includes(process.env.NODE_ENV || "") &&
      !process.env.VERCEL && !process.env.VERCEL_ENV && !process.env.AWS_EXECUTION_ENV) {
    const value = Number(process.env.EXP29_HTTP_DEADLINE_MS);
    if (Number.isInteger(value) && value >= 100 && value <= 30000) return value;
  }
  // Server-owned deployment configuration; never read from request input.
  // Candidate only: hosted activation and sizing require owner approval.
  const configured = Number(process.env.CHAT_REQUEST_DEADLINE_MS);
  return Number.isInteger(configured) && configured >= 1000 && configured <= 120000 ? configured : 30000;
}
export function createChatRequestLifecycle(parent: AbortSignal, timeoutMs = chatRequestDeadlineMs()) {
  const controller = new AbortController();
  const deadline = Date.now() + timeoutMs;
  let commitDecided = false;
  const abort = (reason: Error = new ChatRequestStopped("cancelled")) => { if (!controller.signal.aborted) controller.abort(reason); };
  const parentAbort = () => abort(new ChatRequestStopped("cancelled"));
  deadlines.set(controller.signal, { at: deadline, expire: () => abort(new ChatRequestStopped("deadline")) });
  parent.addEventListener("abort", parentAbort, { once: true });
  if (parent.aborted) parentAbort();
  const timer = setTimeout(() => abort(new ChatRequestStopped("deadline")), timeoutMs);
  const check = () => { if (Date.now() >= deadline) abort(new ChatRequestStopped("deadline")); checkSignal(controller.signal); };
  return {
    signal: controller.signal, abort, check,
    /** Linearization point immediately before returning the transaction callback.
     * Cancellation after this decision cannot undo an in-flight/already committed COMMIT. */
    decideCommit() { check(); commitDecided = true; },
    get commitDecided() { return commitDecided; },
    dispose() { clearTimeout(timer); parent.removeEventListener("abort", parentAbort); },
  };
}
export function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  checkSignal(signal);
  return new Promise((resolve, reject) => {
    const onAbort = () => { clearTimeout(timer); signal.removeEventListener("abort", onAbort); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", onAbort); resolve(); }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
}
