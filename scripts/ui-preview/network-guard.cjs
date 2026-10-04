// Local QA preload only. It grants no identity, role or database access.
const allowed = host => ['localhost', '127.0.0.1', '::1', '[::1]'].includes(String(host).toLowerCase());
function assertHost(host) {
  if (!allowed(host)) throw new Error('External network blocked by local UI test guard');
}
function assertTarget(target) {
  if (typeof target === 'string' || target instanceof URL) {
    assertHost(new URL(target).hostname);
  } else if (target) {
    if (target.url) assertTarget(target.url);
    else if (!target.socketPath) {
      if (target.hostname) assertHost(target.hostname);
      if (target.host) {
        let url;
        try { url = new URL('http://' + target.host); } catch { throw new Error('Invalid local network target'); }
        assertHost(url.hostname);
      }
    }
  }
}
const originalFetch = global.fetch;
global.fetch = (target, options) => { assertTarget(target); return originalFetch(target, options); };
for (const name of ['http', 'https']) {
  const module = require(name);
  for (const method of ['request', 'get']) {
    const original = module[method];
    module[method] = function (...args) {
      assertTarget(args[0]);
      if (args[1] && typeof args[1] === 'object') assertTarget(args[1]);
      return original.apply(this, args);
    };
  }
}
const net = require('net');
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const options = Array.isArray(args[0]) ? args[0][0] : args[0];
  if (options && typeof options === 'object' && !options.path) assertHost(options.host || 'localhost');
  if (typeof options === 'number' && typeof args[1] === 'string') assertHost(args[1]);
  return connect.apply(this, args);
};
const dns = require('dns');
const lookup = dns.lookup;
dns.lookup = function (hostname, ...args) { assertHost(hostname); return lookup.call(this, hostname, ...args); };
globalThis[Symbol.for('experthub.local-ui-network-guard')] = true;
