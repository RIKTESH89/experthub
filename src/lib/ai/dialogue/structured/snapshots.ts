export const isSnapshotDate = (value: unknown): value is Date => Object.prototype.toString.call(value) === "[object Date]";
/** Detached snapshots isolate adapter-retained objects from approval state. Dates need
 * explicit setter protection because Object.freeze alone does not freeze their slots.
 * Adapter snapshots also have digest checks across every asynchronous boundary. */
function freezeData<T>(value: T, immutableDates = false, seen = new WeakMap<object, unknown>()): T {
    if (!value || typeof value !== "object")
        return value;
    if (seen.has(value))
        return seen.get(value) as T;
    if (isSnapshotDate(value)) {
        if (immutableDates) {
            const target = new Date(value.getTime());
            Object.freeze(target);
            const proxy = new Proxy(target, { get(date, key) {
                    if (key === Symbol.toStringTag)
                        return "Date";
                    if (typeof key === "string" && key.startsWith("set"))
                        return () => { throw new TypeError("Immutable snapshot Date"); };
                    const member = Reflect.get(date, key, date);
                    return typeof member === "function" ? member.bind(date) : member;
                }, set() { throw new TypeError("Immutable snapshot Date"); }, defineProperty() { throw new TypeError("Immutable snapshot Date"); }, deleteProperty() { throw new TypeError("Immutable snapshot Date"); } }) as T;
            seen.set(value, proxy);
            return proxy;
        }
        seen.set(value, value);
        for (const name of Object.getOwnPropertyNames(Date.prototype).filter(key => key.startsWith("set")))
            Object.defineProperty(value, name, { value: () => { throw new TypeError("Immutable snapshot Date"); }, writable: false, configurable: false });
        return Object.freeze(value);
    }
    seen.set(value, value);
    for (const key of Object.keys(value)) {
        const object = value as Record<string, unknown>;
        object[key] = freezeData(object[key], immutableDates, seen);
    }
    return Object.freeze(value);
}
export function detachedSnapshot<T>(value: T): T { return freezeData(structuredClone(value)); }
/** Returned Date proxies remain readable/JSON serializable but reject prototype setter
 * bypasses too. JSON can copy the diagnostic result; structuredClone of these protected
 * Date proxies is intentionally unsupported. No adapter receives returned result objects. */
export function immutableResult<T>(value: T): T { return freezeData(structuredClone(value), true); }
export function isSnapshotMutation(error: unknown): boolean {
    return error instanceof TypeError && /read only|readonly|not extensible|Cannot add property|Cannot delete property|Immutable snapshot/i.test(error.message);
}
