// Harness-only preload. Never imported by application code; no auth/model backdoors.
const allowed = host => {
  let value = String(host); if (value === '::1') return true;
  try { value = new URL('http://' + value).hostname.replace(/^\[|\]$/g, ''); } catch { return false; }
  return ['127.0.0.1', 'localhost', '::1'].includes(value);
};
function assertTarget(input) {
  const host = typeof input === 'string' || input instanceof URL ? new URL(input).hostname : input?.hostname || input?.host || 'localhost';
  if (!allowed(host)) throw new Error('External network blocked by EXP25/26 harness host=' + host);
}
const originalFetch = global.fetch;
global.fetch = (input, options) => { assertTarget(typeof input === 'object' && !(input instanceof URL) ? input.url : input); return originalFetch(input, options); };
for (const moduleName of ['http', 'https']) {
  const module = require(moduleName);
  for (const method of ['request', 'get']) {
    const original = module[method];
    module[method] = function (...args) { assertTarget(args[0]); return original.apply(this, args); };
  }
}
const net = require('net');
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  let options = Array.isArray(args[0]) ? args[0][0] : args[0];
  if (typeof options === 'object' && !options.path && !allowed(options.host || 'localhost')) throw new Error('External socket blocked by EXP25/26 harness');
  if (typeof options === 'number' && typeof args[1] === 'string' && !allowed(args[1])) throw new Error('External socket blocked by EXP25/26 harness');
  return originalConnect.apply(this, args);
};
