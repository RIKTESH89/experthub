import { createHmac, randomUUID, timingSafeEqual } from "crypto";

export function widgetIdentity(configId: string, visitorId: unknown, token: unknown): { visitorId: string; token: string } {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Widget identity signing is not configured");
  const sign = (id: string) => createHmac("sha256", secret).update(JSON.stringify([configId, id])).digest("hex");
  if (typeof token === "string" && token) {
    if (typeof visitorId !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw new Error("Invalid widget identity");
    const expected = Buffer.from(sign(visitorId), "hex");
    if (!timingSafeEqual(Buffer.from(token, "hex"), expected)) throw new Error("Invalid widget identity");
    return { visitorId, token };
  }
  // A caller-provided visitor ID is not proof of ownership. Issue a fresh identity.
  const id = randomUUID();
  return { visitorId: id, token: sign(id) };
}
