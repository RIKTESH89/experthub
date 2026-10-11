# Remaining local authenticated acceptance

At source commit `43b784a4e71fc985ae178e1d7ab764f0ff4a85d1`, the real compiled Next/Auth.js/Prisma application passed eight browser groups on installed Chrome 154 and a newly owned PostgreSQL 18 database after all 18 migrations. These cover anonymous and subscriber denial, owner cancellation and duplicate acceptance, source CAS conflict and refresh, rollback preview/cancel/confirmation, existing-session account revocation and the pinned Google declaration. No Google OAuth was performed.

`local-auth/built-browser.json` records the exact build ID, groups and limitations; the screenshot and server log support the result. The original runner and raw migration/cleanup logs are retained outside the checkout in `evidence/remaining/local-auth`. All owned app/browser/database processes were stopped, and the private runtime was removed. No external requests were observed. This is local synthetic authentication and database evidence; hosted authenticated journeys and PostgreSQL 16 parity remain open.

The runner requires a clean exact source revision, the dedicated synthetic fixture role/database/private socket, and the owned app listener before making fixture writes. It refuses unrelated listeners and terminates its owned process group on timeout. `scripts/remaining-acceptance/run-local-auth.py` is the archived invocation used from the parent workspace; it is evidence, not a portable package installation command.

Independent pre-execution and result review are recorded separately under `audit/exp25-acceptance-20261011/hosted-43b784a`. All checks remain distinct from human quality or provider-model acceptance.
