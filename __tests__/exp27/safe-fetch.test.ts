import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
jest.mock("node:dns/promises", () => ({ lookup: jest.fn() }));
jest.mock("node:https", () => ({ request: jest.fn() }));
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { fetchPublicHtml, isPublicAddress } from "@/lib/import/safe-fetch";
const dns = lookup as jest.Mock;
const network = request as jest.Mock;
function response(status = 200, headers: Record<string, string> = { "content-type": "text/html" }, chunks = ["<html>ok</html>"]) {
  network.mockImplementationOnce((_url, options, callback) => {
    const req = new EventEmitter() as EventEmitter & { end: () => void };
    req.end = () => {
      const res = new PassThrough() as PassThrough & { statusCode: number; headers: Record<string, string> };
      res.statusCode = status; res.headers = headers;
      callback(res);
      if (!res.destroyed) { chunks.forEach(chunk => res.write(chunk)); res.end(); }
    };
    options.signal.addEventListener("abort", () => req.emit("error", new Error("secret DNS error")), { once: true });
    return req;
  });
}
beforeEach(() => { dns.mockReset(); network.mockReset(); dns.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]); });
it.each(["127.0.0.1", "10.1.2.3", "172.16.2.3", "192.168.1.2", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "198.18.0.1", "::1", "::", "fc00::1", "fe80::1", "::ffff:127.0.0.1", "2002:7f00:1::", "2001:db8::1"])('rejects non-public IP %s', address => expect(isPublicAddress(address)).toBe(false));
it.each(["https://127.1/", "https://2130706433/", "https://0x7f000001/", "https://[::ffff:127.0.0.1]/", "https://localhost/", "https://user:password@example.com/", "http://example.com", "file:///etc/passwd", "https://example.com:8443/"])('rejects %s before network', async url => {
  await expect(fetchPublicHtml(url)).rejects.toThrow(); expect(network).not.toHaveBeenCalled();
});
it('rejects mixed public/private DNS results', async () => {
  dns.mockResolvedValue([{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.1", family: 4 }]);
  await expect(fetchPublicHtml("https://example.com")).rejects.toThrow("not public"); expect(network).not.toHaveBeenCalled();
});
it('pins validated address and preserves TLS hostname despite later DNS rebinding', async () => {
  response(); dns.mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }]).mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
  await expect(fetchPublicHtml("https://example.com/path")).resolves.toContain("ok");
  const [url, options] = network.mock.calls[0]; expect(url.hostname).toBe("example.com"); expect(options.agent).toBe(false);
  const callback = jest.fn(); options.lookup("example.com", {}, callback); expect(callback).toHaveBeenCalledWith(null, "93.184.216.34", 4); expect(dns).toHaveBeenCalledTimes(1);
});
it.each(["https://169.254.169.254/latest", "http://example.com", "https://x:y@example.com"])('blocks redirect %s', async location => {
  response(302, { location }); await expect(fetchPublicHtml("https://example.com")).rejects.toThrow(); expect(network).toHaveBeenCalledTimes(1);
});
it('revalidates DNS on redirect, including same-host rebinding', async () => {
  response(302, { location: "/next" }); dns.mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }]).mockResolvedValueOnce([{ address: "10.0.0.2", family: 4 }]);
  await expect(fetchPublicHtml("https://example.com")).rejects.toThrow("not public"); expect(network).toHaveBeenCalledTimes(1);
});
it('follows a bounded public relative redirect', async () => { response(302, { location: "/next" }); response(); await expect(fetchPublicHtml("https://example.com")).resolves.toContain("ok"); expect(network.mock.calls[1][0].pathname).toBe("/next"); });
it('caps redirect loops', async () => { for (let i = 0; i < 4; i++) response(302, { location: "/loop" }); await expect(fetchPublicHtml("https://example.com")).rejects.toThrow("redirect limit"); expect(network).toHaveBeenCalledTimes(4); });
it.each([
  [{ "content-type": "text/html", "content-length": "100" }, ["ok"]],
  [{ "content-type": "text/html" }, ["12345", "67890"]],
  [{ "content-type": "text/html", "content-encoding": "gzip" }, ["ok"]],
  [{ "content-type": "image/svg+xml" }, ["<svg/>"]],
])('bounds response bytes/type', async (headers, chunks) => { response(200, headers, chunks); await expect(fetchPublicHtml("https://example.com", { timeoutMs: 100, maxBytes: 8, maxRedirects: 3 })).rejects.toThrow(); });
it('bounds DNS time without fetching after deadline', async () => {
  dns.mockImplementation(() => new Promise(() => {}));
  await expect(fetchPublicHtml("https://example.com", { timeoutMs: 10, maxBytes: 8, maxRedirects: 3 })).rejects.toThrow("deadline"); expect(network).not.toHaveBeenCalled();
});
it('bounds stalled socket/body time', async () => {
  network.mockImplementation((_url, options) => { const req = new EventEmitter(); options.signal.addEventListener("abort", () => req.emit("error", new Error("private socket details"))); return Object.assign(req, { end() {} }); });
  await expect(fetchPublicHtml("https://example.com", { timeoutMs: 10, maxBytes: 8, maxRedirects: 3 })).rejects.toThrow();
});
