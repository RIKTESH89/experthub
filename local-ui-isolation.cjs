// Pure configuration validation. This never changes hosted origin policy.
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);
function localOriginFromUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error('Local UI test requires an explicit loopback origin'); }
  if (url.protocol !== 'http:' || !LOOPBACK.has(url.hostname) || !url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Local UI test requires an http loopback origin with an explicit port');
  }
  return url.origin;
}
/** @param {Record<string, string | undefined>} env */
function assertLocalUiContext(env) {
  if (!['development', 'test'].includes(env.NODE_ENV || '') || ['VERCEL', 'VERCEL_ENV', 'VERCEL_URL', 'VERCEL_BRANCH_URL', 'VERCEL_GIT_COMMIT_REF'].some(key => Boolean(env[key]))) {
    throw new Error('Local UI test isolation is forbidden outside local development/test');
  }
}
/** @param {Record<string, string | undefined>} env @param {{networkGuardLoaded?:boolean}} options */
function localUiConfig(env = process.env, options = {}) {
  if (env.EXPERTHUB_LOCAL_UI_TEST === undefined) return null;
  if (env.EXPERTHUB_LOCAL_UI_TEST !== '1') throw new Error('Invalid local UI test flag');
  assertLocalUiContext(env);
  if (env.EXPERTHUB_UI_FIXTURES !== '1' || env.AUTH_SECRET !== 'synthetic-local-ui-only' || env.NEXT_TELEMETRY_DISABLED !== '1') {
    throw new Error('Local UI test requires explicit synthetic fixture configuration');
  }
  if (!options.networkGuardLoaded) throw new Error('Local UI test requires the external network guard preload');
  const origin = localOriginFromUrl(env.EXPERTHUB_LOCAL_UI_ORIGIN);
  for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
    let url;
    try { url = new URL(env[key]); } catch { throw new Error('Local UI test requires synthetic loopback database URLs'); }
    if (url.protocol !== 'postgresql:' || !LOOPBACK.has(url.hostname) || !url.port || url.username !== 'fixture' || url.password !== 'fixture' || url.pathname !== '/fixture' || url.search || url.hash) {
      throw new Error('Local UI test requires synthetic loopback database URLs');
    }
  }
  if (env.DATABASE_URL !== env.DIRECT_URL) throw new Error('Local UI test database URLs must match');
  for (const [key, value] of Object.entries(env)) {
    if (value && key !== 'AUTH_SECRET' && /(?:SECRET|TOKEN|API_KEY|DSN|^AWS_|^GOOGLE_|^RAZORPAY_|^RESEND_|^OPENAI_|^EXPERTHUB_STAGING_)/.test(key)) {
      throw new Error('Local UI test must not inherit provider credentials or staging configuration');
    }
  }
  for (const key of ['AUTH_URL', 'NEXTAUTH_URL', 'NEXT_PUBLIC_APP_URL']) {
    if (env[key] && env[key] !== origin) throw new Error('Local UI test must not inherit a different app origin');
  }
  return { origin };
}
module.exports = { localUiConfig, assertLocalUiContext, localOriginFromUrl };
