// Server/build-only configuration. Credentials are never exported to next.config.env.
const { previewOriginFromHost } = require('./preview-environment.cjs');
const BRANCH = 'exp25-26-launch-auth-payments';
const HOST = 'experthub-git-exp25-26-launch-au-e842c4-riktesh-singhs-projects.vercel.app';
const APPROVED_EMAIL = 'rikteshsingh28801@gmail.com';
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
 if(email!==APPROVED_EMAIL || p.email!==APPROVED_EMAIL || p.email_verified!==true || typeof p.sub!=='string' || !p.sub)return false;
 const approvedSubject=env.EXPERTHUB_STAGING_GOOGLE_APPROVED_SUBJECT;
 return !approvedSubject || p.sub===approvedSubject;
}
module.exports={stagingGoogleConfig,approvedStagingGoogleIdentity};
