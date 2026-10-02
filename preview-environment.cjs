// Pure shared validation for next.config and application code. Never accepts request headers.
function previewOriginFromHost(host) {
  if (typeof host !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.vercel\.app$/i.test(host)) {
    throw new Error('Preview requires a valid VERCEL_BRANCH_URL system hostname');
  }
  return `https://${host.toLowerCase()}`;
}
module.exports = { previewOriginFromHost };
