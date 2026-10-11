# Hosted EXP-25 identity eligibility and bounded journey plan — 2026-10-11

## Exact current target and fresh results

Read-only Vercel connector metadata at 05:25 UTC independently confirms `43b784a4e71fc985ae178e1d7ab764f0ff4a85d1`, READY deployment `dpl_8QQSD3s81bmLVrxjiJ7ctSqTZLsE`, assigned to `stgtesting.experthub.co.in` in project `prj_yFuOq5oOV1T5aLOGXXesop3zP39d`. The staging alias was rechecked after HTTPS tests and still points to that deployment. See `exact-deployment-receipt.json`; root's `evidence/staging-release-receipt.json` records unchanged protection, production aliases, V2/evaluation flags and migration flag 0.

Fresh additional **seven anonymous read-only HTTPS checks PASS** (`read-only-guards.json`): `/api/auth/session` 200/null with private/no-cache/no-store; `/api/experts?limit=1`, `/api/chat/sessions`, `/api/expert/corrections`, `/api/expert/corrections/context` 401; `/expert/reviews` and `/subscriber/feed` 307 to `/login`. No cookies or POSTs were supplied; redirects were not followed. These are an additional guard scope to root's prior 13 anonymous checks, not authenticated acceptance. Initial restricted-network DNS failed before a response; the authorized read-only network run completed the seven cases.

## Identity authorization evidence

Read current Linear EXP-24/26/66 descriptions and comments on 2026-10-11. Their latest checkpoint says the **approved existing-user** real Google login → Subscriber → logout → anonymous redirect → relogin sequence passed on prior `101e941`, and **ended signed out**. That prior result is preserved; it is not an exact 43b784a result. Fresh signup, expiry and wider authenticated security/provider cases remain open. No specific new consenting tester response is recorded in the retrieved evidence.

The historical `audit/staging-google/report.md` named the owner and described an owner-email-only gate. Current `staging-google.cjs` at `43b784a` instead admits verified Google identities: commit `15a5e10` intentionally removed the owner email pin, retaining the exact staging client/branch/origin guards. Public application admission is not permission to use an arbitrary personal Google account. The historical report does not establish current app authorization policy and must not be used to invent a consenting tester.

Existing approved owner identity is historical evidence, not a newly provided active app session. No transferable application session, available separate authenticated test browser, authorized current EXPERT account/profile, source fixture or paid-period fixture was established in this lane. No current hosted account/table inventory was queried. Browser login state was not inferred or inspected, and the billing task's browser was not used.

## Concrete bounded next journey cases

| Case | Action and evidence | Prerequisite | Status |
| --- | --- | --- | --- |
| H1 Existing approved subscriber | In a separate approved app session: GET `/api/auth/session`, verify current server SUBSCRIBER role and no-store; view feed/settings without saving. Record redacted role/status only. | Existing expressly authorized active app session on staging; if unavailable, explicit bounded Google OAuth authorization/identity in the separate browser (openid/email/profile, existing account only). | BLOCKED: no available authorized app session established. Prior 101e941 pass retained. |
| H2 Authenticated denials | Same subscriber session: GET owner releases/corrections/context and admin routes; expect 403 without private payload. | H1 session; no role creation/changes. | BLOCKED on H1. |
| H3 Discovery/read access | Same subscriber session: expert discovery and an owner-approved existing expert profile/source; inspect permitted source/citation reads without generating an answer. | H1 plus identified authorized existing expert material/fixture. Do not infer source rights from discoverability. | BLOCKED on account/material availability. |
| H4 Owner release failure UX | Existing authorized EXPERT session: GET release/context/review pages, inspect current processing/release status. A preview is an application POST even when intended read-only; no activation. | Named/consenting existing expert account/profile and explicit preview-call authorization if needed. No privilege promotion. | BLOCKED: no approved expert session/profile established. |
| H5 Logout/relogin and expiry | Logout the designated test app session, verify anonymous redirect, then relogin under approved OAuth scope. Natural expiry requires a dedicated permitted expiry fixture; local synthetic JWT checks do not become hosted expiry proof. | Existing tester session plus explicit logout/relogin/OAuth use. No minted hosted JWT or shared billing browser. | BLOCKED: no session; expiry fixture unavailable. |
| H6 Fresh signup | Designated consenting new Google tester with openid/email/profile; verify single SUBSCRIBER creation and no elevation. | Specific new tester consent and authorization for the User PII/database creation and any profile image update. | BLOCKED: new identity and live-write approval missing. |
| H7 Source ingestion → authorized twin chat/citations | Approved synthetic/rights-cleared expert source; ingest/index, create session, generate response, verify citations/persistence. | Explicit bounded staging fixture/role/source/chat writes, provider/data destination and ₹0 runtime plan. Current provider-disabled staging is not assumed suitable for real generation. | BLOCKED: source/session/message/live-write scope and provider transmission are not authorized in this lane. |
| H8 Access revocation / rollback adoption | Verify state loss while reading/generating; release activation/rollback changes durable state. | Explicit mutation approval for named fixture role/access/subscription/release state with cleanup/rollback plan. Never change real account access or activate V2 by inference. | BLOCKED: live mutation permission/fixture absent. |

The owner already approved historical Google use; do not ask them to reapprove that historical result. The concrete missing input is an **available separate approved app session**, or authorization to initiate the defined existing-account Google exchange on the designated browser if none is available. Fresh signup and expert/entitlement fixtures need their specific additional live-write consent. No new credentials, protection bypass, privilege grant or provider configuration is proposed.

## Separation from ongoing local/provider work

Root completed the reviewed compiled Next/Auth.js/Prisma run against a NEW private-socket PG18 synthetic fixture using already approved local scope: **8/8 scenario groups PASS**, all 18 migrations, exact candidate `43b784a`, build ID `8wK667wgWSB5yLdeAYuRP`, Chrome `154.0.8037.98`. Independent outcome review confirms no page errors/external requests and runtime-directory removal after PostgreSQL stop. This establishes the recorded actual LOCAL application/database journeys; it does not unblock the hosted Google/account/provider prerequisites. See `LOCAL-OUTCOME-REVIEW.md`.

The separate approved ₹0 Razorpay/Resend task owns its browser/billing/provider scope. None of its approval, success or identity is reused for these ExpertHub auth journeys, and no payment/email endpoint was touched here. No paid call, provider exchange, live database mutation, app change, credential creation or access/protection change occurred. EXP-25 stays In Progress.


## H1–H8 local versus hosted reconciliation after native run

Hosted statuses above remain BLOCKED as stated. The new local native evidence advances these bounded analogs only:

| Hosted case | New local native analog | Still unverified |
| --- | --- | --- |
| H1 existing subscriber | Synthetic Auth.js session renders subscriber feed and owner review workspace; persisted identity controls access. | Hosted approved app session and deployed session/no-store read. |
| H2 authenticated denials | Subscriber cannot render owner workspace; correction API 403. | Hosted denial responses, broader admin-route matrix. |
| H3 discovery/read access | Owner review reads synthetic native source/release data. | Expert discovery and rights-cleared hosted source/citation reading. |
| H4 owner release failure UX | Actual compiled owner correction acceptance/CAS, completed refresh, release preview/cancel and reviewed rollback with native rows. | Hosted authorized expert profile/session and preview permission; deployed failure modes. |
| H5 session/expiry | Deactivating the synthetic native account rejects its existing encrypted session on reload. | Real Google logout/relogin and natural expiry; subscription expiry. |
| H6 fresh signup | Native synthetic users were seeded expressly for the owned fixture. This is not OAuth signup. | Consenting new Google tester and approved hosted User PII writes. |
| H7 ingestion/chat | Accepted correction creates one native audit event and lifecycle job under double click. | Ingestion/vector recomputation, generated chat/citations and provider/durable-message journeys. |
| H8 revocation/rollback | Native reviewed rollback appends a third release while retaining source version; native account deactivation rejects current session. | Hosted release/access mutations, paid-period entitlement loss, concurrent or midstream revocation. |

The native run's eight groups, hosted seven anonymous guards, installed Auth.js 12 synthetic groups, prior browser/unit results and historical real Google sequence are different scopes. Do not sum them into one acceptance total or mark full EXP-25 Done.
