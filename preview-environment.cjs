// Pure shared validation for next.config and application code. Never accepts request headers.
function previewOriginFromHost(host) {
  if (typeof host !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.vercel\.app$/i.test(host)) {
    throw new Error('Preview requires a valid VERCEL_BRANCH_URL system hostname');
  }
  return `https://${host.toLowerCase()}`;
}
const STAGING_BRANCH = 'exp25-26-launch-auth-payments';
const STAGING_HOST = 'experthub-git-exp25-26-launch-au-e842c4-riktesh-singhs-projects.vercel.app';
const STAGING_ORIGIN = 'https://stgtesting.experthub.co.in';
/** Uses trusted deployment metadata only, never request/forwarded headers. */
function isStagingPreview(env = process.env) {
  return env.VERCEL_ENV === 'preview' && env.VERCEL_GIT_COMMIT_REF === STAGING_BRANCH && env.VERCEL_BRANCH_URL === STAGING_HOST;
}
function previewOriginFromEnvironment(env = process.env) {
  // Git deployments provide a branch alias; CLI deployments may provide only
  // their immutable system URL. That URL establishes an isolated origin, never
  // the separately gated full-site staging identity or Google configuration.
  const missingBranch = env.VERCEL_BRANCH_URL === undefined || env.VERCEL_BRANCH_URL === '';
  const host = missingBranch && env.VERCEL === '1' && env.VERCEL_ENV === 'preview'
    ? env.VERCEL_URL : env.VERCEL_BRANCH_URL;
  const origin = previewOriginFromHost(host);
  return isStagingPreview(env) ? STAGING_ORIGIN : origin;
}
function validatePreviewOrigin(origin) {
  if (origin === STAGING_ORIGIN) return origin;
  const validated = previewOriginFromHost(typeof origin === 'string' ? origin.replace(/^https:\/\//, '') : origin);
  if (origin !== validated) throw new Error('Invalid Preview canonical origin');
  return validated;
}
module.exports = { previewOriginFromHost, previewOriginFromEnvironment, validatePreviewOrigin, isStagingPreview };
