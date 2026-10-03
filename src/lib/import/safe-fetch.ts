import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";

const blocked = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24],
  ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 3],
] as const) blocked.addSubnet(network, prefix, "ipv4");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
for (const [network, prefix] of [["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20]] as const) {
  blocked.addSubnet(network, prefix, "ipv6");
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  return family === 4 ? !blocked.check(address, "ipv4")
    : family === 6 && globalV6.check(address, "ipv6") && !blocked.check(address, "ipv6");
}

export function publicHttpsUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new Error("Import requires a public HTTPS URL without credentials on port 443");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || (isIP(host) && !isPublicAddress(host))) {
    throw new Error("Import destination is not public");
  }
  return url;
}

/** DNS is checked once per hop; the socket lookup returns ONLY that approved address.
 * TLS still verifies the original hostname. No proxy, pooled socket, or automatic redirects.
 * The single deadline includes DNS, redirects and streamed response bytes.
 */
export async function fetchPublicHtml(value: string, limits = { timeoutMs: 15000, maxBytes: 2 * 1024 * 1024, maxRedirects: 3 }): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), limits.timeoutMs);
  let rejectAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = () => reject(new Error("Import deadline exceeded"));
    controller.signal.addEventListener("abort", rejectAbort, { once: true });
  });
  async function run(): Promise<string> {
    let url = publicHttpsUrl(value);
    for (let hop = 0; ; hop++) {
      const hostname = url.hostname.replace(/^\[|\]$/g, "");
      const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }]
        : await lookup(hostname, { all: true, verbatim: true }).catch(() => { throw new Error("Import DNS resolution failed"); });
      if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
        throw new Error("Import destination is not public");
      }
      if (controller.signal.aborted) throw new Error("Import deadline exceeded");
      const pinned = addresses[0];
      const result = await new Promise<{ redirect?: string; html?: string }>((resolve, reject) => {
        const req = request(url, {
          agent: false,
          family: pinned.family,
          signal: controller.signal,
          lookup: (_host, _options, callback) => callback(null, pinned.address, pinned.family),
          headers: { Accept: "text/html,application/xhtml+xml", "Accept-Encoding": "identity", "User-Agent": "ExpertHub-Blog-Import/1.0" },
        }, (res) => {
          res.on("error", reject);
          const status = res.statusCode || 0;
          if ([301, 302, 303, 307, 308].includes(status)) {
            const redirect = res.headers.location;
            res.destroy();
            if (!redirect) reject(new Error("Import redirect has no destination"));
            else resolve({ redirect });
            return;
          }
          if (status < 200 || status >= 300) {
            res.destroy(); reject(new Error(`Import HTTP status ${status}`)); return;
          }
          const type = res.headers["content-type"] || "";
          if (!/^(text\/html|application\/xhtml\+xml)(;|$)/i.test(type) ||
              (res.headers["content-encoding"] && res.headers["content-encoding"] !== "identity") ||
              Number(res.headers["content-length"] || 0) > limits.maxBytes) {
            res.destroy(); reject(new Error("Import response type or size is unsupported")); return;
          }
          let bytes = 0;
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > limits.maxBytes) { res.destroy(); reject(new Error("Import response exceeds size limit")); }
            else chunks.push(chunk);
          });
          res.on("aborted", () => reject(new Error("Import response interrupted")));
          res.on("end", () => resolve({ html: Buffer.concat(chunks).toString("utf8") }));
        });
        req.on("error", () => reject(new Error("Import connection failed")));
        req.end();
      });
      if (result.html !== undefined) return result.html;
      if (hop >= limits.maxRedirects) throw new Error("Import redirect limit exceeded");
      url = publicHttpsUrl(new URL(result.redirect!, url).toString());
    }
  }
  try { return await Promise.race([run(), aborted]); }
  finally {
    clearTimeout(timeout);
    if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
  }
}
