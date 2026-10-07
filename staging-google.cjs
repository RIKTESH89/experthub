// Server/build-only configuration. Credentials are never exported to next.config.env.
const { previewOriginFromHost } = require('./preview-environment.cjs');
const BRANCH = 'exp25-26-launch-auth-payments';
const HOST = 'experthub-git-exp25-26-launch-au-e842c4-riktesh-singhs-projects.vercel.app';
/** @param {Record<string, string | undefined>} env */
function stagingGoogleConfig(env = process.env) {
 if(env.VERCEL_ENV !== 'preview' || env.VERCEL_GIT_COMMIT_REF !== BRANCH || env.EXPERTHUB_STAGING_GOOGLE_ENABLED !== '1')return null;
 try {if(previewOriginFromHost(env.VERCEL_BRANCH_URL)!==`https://${HOST}`)return null;}catch{return null;}
 const id=env.EXPERTHUB_STAGING_GOOGLE_CLIENT_ID;
 const approved=env.EXPERTHUB_STAGING_GOOGLE_APPROVED_CLIENT_ID;
 const secret=env.EXPERTHUB_STAGING_GOOGLE_CLIENT_SECRET;
 if(!id || !approved || id!==approved || !/^[0-9]+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(id) || !secret || !secret.trim())return null;
 return {clientId:id,clientSecret:secret};
}
/** @param {unknown} email @param {unknown} profile @param {Record<string, string | undefined>} env */
function approvedStagingGoogleIdentity(email, profile, env = process.env) {
 if(!stagingGoogleConfig(env) || !profile || typeof profile!=='object')return false;
 const p=/** @type {{email?:unknown,email_verified?:unknown,sub?:unknown}} */(profile);
 // The approved staging policy admits verified Google identities, not a single person.
 // Auth.js verifies the provider response; this gate validates the required identity claims.
 return typeof email==='string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
   p.email===email && p.email_verified===true && typeof p.sub==='string' && Boolean(p.sub.trim());
}
module.exports={stagingGoogleConfig,approvedStagingGoogleIdentity};
