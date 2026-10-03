# Controlled staging Google login — local implementation

Base ebd54ef45fe8a6b148be5fcc849aa687570b8be6. Owner approved local implementation for verified rikteshsingh28801@gmail.com. No real provider calls, credentials, Google account action, database/user creation, scope change, push, or deployment occurred.

## Gate and identity boundary

staging-google.cjs is imported only by build/server authentication paths. It requires VERCEL_ENV=preview, exact branch exp25-26-launch-auth-payments, validated system hostname experthub-git-exp25-26-launch-au-e842c4-riktesh-singhs-projects.vercel.app, explicit EXPERTHUB_STAGING_GOOGLE_ENABLED=1, separate client ID and nonblank secret, and an exact matching approved client-ID pin with Google client-ID format. Absent/mismatched configuration returns null. Original production GOOGLE_CLIENT_ID/SECRET are never a staging fallback. Actual approved staging client ID is pending and no values have been configured by this implementation.

Server signIn rejects every non-Google Preview callback and requires user.email AND Google profile.email to exactly equal the approved owner email, profile.email_verified===true, and a nonempty Google sub before any application user lookup/create/update. If EXPERTHUB_STAGING_GOOGLE_APPROVED_SUBJECT is provided it must match exactly. Subject is not learned or pinned automatically; current enrollment authority is the exact approved verified email, authenticated by the standard Google OIDC exchange. Google Testing mode does not enforce its user list for identity-only scopes, so it is not relied upon.

Provider declaration, callback and login button are coordinated. Only a derived NEXT_PUBLIC_EXPERTHUB_STAGING_GOOGLE_ENABLED boolean reaches the client. next.config continues deriving canonical auth origins from validated Vercel metadata. No credential, owner allowlist, approved client pin or subject is exported through next.config.env. General isPreviewIsolated remains unchanged: Google enablement does not permit payments, upload, email, AI/search/import or Sentry. Production provider and verified-email behavior remain unchanged.

## Auth.js ordering and account implications

Installed @auth/core/lib/actions/callback/index.js runs OAuth handling, then optional adapter getUserByAccount, then handleAuthorized (signIn callback), then handleLoginOrRegister/JWT. This app configures no adapter, so no adapter identity query/write occurs before our callback. The Google token exchange precedes app authorization and is inherently required for verified claims; local tests mocked it and made no exchange.

The existing permitted path creates only User(name,email,image,role=SUBSCRIBER), never admin/expert/subscription/settings. Repeat login uses existing identity; banned/inactive checks remain. JWT sessions resolve current DB role/account state; profile role claims are not authority. Existing production email linking semantics were not broadened. Any future adapter requires re-review of pre-callback queries. Concurrent first-user unique-email race behavior remains the existing implementation, not a guarantee established by this slice.

## Future configuration, all Preview/exact branch only

- EXPERTHUB_STAGING_GOOGLE_ENABLED: plain 1.
- EXPERTHUB_STAGING_GOOGLE_CLIENT_ID: new staging Web client ID.
- EXPERTHUB_STAGING_GOOGLE_APPROVED_CLIENT_ID: exactly that reviewed non-secret client ID (explicit pin, no default).
- EXPERTHUB_STAGING_GOOGLE_CLIENT_SECRET: new staging-only secret, sensitive; secure owner-entry workflow, never source/log/chat.
- Optional EXPERTHUB_STAGING_GOOGLE_APPROVED_SUBJECT: independently approved owner Google subject, sensitive/server-only.

Authorized redirect URI must exactly equal https://experthub-git-exp25-26-launch-au-e842c4-riktesh-singhs-projects.vercel.app/api/auth/callback/google . Staging scopes explicitly openid email profile, no offline access/additional Google APIs. Retain Vercel protection, staging AUTH_SECRET/DB scopes, original credentials Production/Development only, and automatic Preview disabled. Use the branch alias for real browser OAuth; no dynamic deployment callback wildcard or proxy login. Vercel authorization is separate from app authentication.

## Verification

933/933 tests, 56 suites; focused auth/Google/isolation/migration 146/146. Synthetic tests cover missing/wrong flag/environment/branch/host/client/pin/secret, non-Google provider, missing/wrong/unverified profile/email/subject, exact denial before user operations, optional subject mismatch, safe subscriber creation, repeat identity, banned/inactive rejection, production verified enrollment, client boolean behavior, and continued general Preview service denial. Existing migration tests cover verified completed 15-ledger reruns without reset/empty requirement and partial-history rejection.

Types and lint pass. Actual local Preview build with synthetic Google enabled passes, general isolation remains true, only boolean exported, no synthetic secret in static assets, no Sentry tunnel. Production build-only pass-through also passes. Local builds used synthetic unreachable DB URLs, offline font mock and network guard; no real credentials or selected migrations. Prior latency artifact restored byte-for-byte.

## Remaining work

Parent review of commit and staged client configuration before any push/deploy. Real owner OAuth requires an expressly authorized browser login and creates owner profile PII only in staging. Verify canonical callback/state/cookie flow, subscriber session, repeated-login single identity, signout, expert/admin denial and unchanged service guards. Actual client ID/secret and optional subject pin remain pending; current hosted revision remains ebd54ef with Google disabled.

Sources: https://support.google.com/cloud/answer/15549945?hl=en ; https://developers.google.com/identity/protocols/oauth2/web-server .
