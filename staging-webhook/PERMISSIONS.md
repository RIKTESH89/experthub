# Narrow local permission contract — requires independent review before hosted use

This followup changes only local permission specs/tests/docs/evidence. No application algorithms, repository schema/migration, root manifests, hosted roles/grants, PUBLIC/default ACLs or RLS policy were changed. Synthetic roles, PUBLIC revoke/grant experiments and temporary RLS policy exist only inside the owned disposable test cluster, removed on exit.

`permission-grants.sql` is a reviewed positive-GRANT specification, NOT a migration or deployment hook. It creates no roles, revokes no PUBLIC rights, and grants no table-level SELECT/INSERT/UPDATE. Role creation and any cleanup of old/default/inherited rights remain separate approval steps. Use fresh unprivileged non-owner roles; applying these GRANTs to a role with prior broad privileges does not narrow it.

## Exact tested rights

| Object | Receiver | Worker |
|---|---|---|
| Database neondb / schema public | CONNECT / USAGE only | CONNECT / USAGE only |
| Inbox | INSERT(digest,raw_body), SELECT(digest) | Explicit SELECT of nine current columns (claim RETURNING i.*), UPDATE(state,attempts,next_attempt,lease_token,lease_until,last_error) |
| User | None | SELECT(id,name) only |
| ExpertProfile | None | Explicit SELECT of19 current scalars, UPDATE(totalSubscribers,updatedAt) only |
| ExpertSubscription | None | Explicit SELECT of18 current scalars, UPDATE(status,endDate,razorpayPaymentId,paidPeriodStart,renewalCancelledAt,lastPaymentEventAt,lastPaymentEventRank,currentPeriodEnd,updatedAt,billingVersion) only |
| PaymentEvent | None | Explicit SELECT/INSERT of10 current scalars, no UPDATE/DELETE |
| Notification | None | Explicit SELECT/INSERT of7 current scalars, no UPDATE/DELETE |
| BillingOutbox | None | INSERT(id,payload), SELECT(id) only; no delivery/lease/payload read or update |

Subscription findUnique and Prisma update RETURNING read all current scalars; profile update RETURNING also reads all current scalars. Their explicit SELECT lists are necessary for unchanged query shapes, even though domain logic does not consume every returned field. This is a known read-scope limitation; reducing it further needs a separately reviewed shared query-shape change, not an algorithm change made here. Explicit column lists fail closed for future added columns; never replace them with table SELECT to fix a future error silently.

Prisma6.19.2 inserts default columns explicitly: notification isRead/createdAt and receipt createdAt require INSERT permission too. Native removal tests revoke each separately, confirm failure and zero partial receipt/notification/subscription effects, then restore only inside the disposable cluster. The before-failure log shows notification creation denied before those defaults were allowed. These INSERT grants permit specifying those fields for newly inserted rows; current reducer supplies defaults. Existing rows remain immutable to the worker because UPDATE/DELETE are absent. Enforcing row/content conditions beyond current algorithm requires separately approved RLS/constraint work.

Worker cannot read email/hashedPassword/role/bio; change profile displayName/monthlyPrice/userId; change subscription price/tier/provider subscription ID/subscriber IDs; mutate inbox raw bytes/digest/received_at; update historic receipts/notifications; drain email outbox; create roles/tables/temp tables; DELETE/TRUNCATE; own objects; use CREATEDB/CREATEROLE/SUPERUSER/BYPASSRLS. Positive grants confer no sequence/function/DDL rights beyond PostgreSQL's built-in inherited defaults, which must be audited.

## READ ONLY hosted preflight, before proposing grants

`permission-audit.sql` is a psql script for later authorized read-only inspection. Supply actual intended role names (or inspect existing ACLs before role creation) and neondb. It inspects role attributes/memberships, object ownership, PUBLIC database/schema/table/column ACLs, default ACLs at global/schema scope, RLS flags/policies, user-defined SECURITY DEFINER routines, raw and effective table/column privileges. Lack of the two intended role rows is a STOP, not permission to create them. No PUBLIC REVOKEs or RLS mutations exist in either SQL specification.

Acceptance prerequisites:

- Actual exact staging identity/DB/endpoint and intended fresh non-owner role verified. No inherited owner/admin memberships, grant options, SUPERUSER/CREATEDB/CREATEROLE/BYPASSRLS, broad table privileges or unlisted effective column rights.
- PUBLIC or inherited/default rights must not add User reads, unrelated writes, CREATE/DDL/TEMP or other data access. PostgreSQL cannot subtract a PUBLIC grant by revoking it from one role. **Stop and obtain separate owner approval** for any wider ACL cleanup or alternative isolation design; never revoke PUBLIC on the shared hosted DB through this component. CONNECT and schema USAGE are expected; TEMP/CREATE are not required. Fresh local PG PUBLIC TEMP was explicitly removed by the test owner only to simulate this prerequisite.
- `pg_default_acl` absence does not mean no defaults: PostgreSQL generally gives PUBLIC CONNECT/TEMP on databases and EXECUTE on functions. Audit effective privileges and SECURITY DEFINER call paths, including objects outside the component. Inspect safe search_path, role membership and callable privileged routines. No default grants are installed here; future schema/default-ACL changes must trigger re-review.
- Current repository migrations define no RLS policies and no SECURITY DEFINER application routines. Native audit verified RLS disabled, no PUBLIC table rights, no default ACL entries or public SECURITY DEFINER routines in the fresh cluster. Do not assume that matches hosted state. With RLS enabled, explicitly review policies for this non-owner role; a denied row fails closed and retries durably, rather than using row_security=off or BYPASSRLS. Column privileges restrict columns, not rows: absent RLS the worker can access all staging rows of granted columns. Staging-only isolation is a boundary, not per-customer row isolation.
- Compare effective privilege matrix to permission-grants.sql after any approved setup. The SQL grants are additive; they do not clean prior broad rights. Repeat native negative probes against approved staging only after explicit test authorization; no payment provider transaction is needed for permission inspection.

## Verification and evidence

`bash staging-webhook/run-local.sh` deploys the18-migration schema into disposable PG18, executes36 receiver/route/permission tests, performs the own generated-client Node24 ZIP smoke when artifacts are present, and runs read-only psql permission audit. Tests reuse the actual permission-grants.sql by substituting only fixed synthetic local identifiers. All existing receiver/reducer lease races still pass. Additional narrow-role race test proves concurrent changed-header replay commits one notification/outbox, cancelled renewal stays cancelled, differently serialized charge keeps idempotent business counters, and expiry inside apply rolls back the receipt.

Evidence: audit/staging-webhook/tests.json + tests.log, narrow-grants-before.log, permission-audit.json, permission-audit.log, targeted-typecheck.log, package-smoke.log. Tests assert no table-level SELECT/UPDATE on every granted table, check sensitive-column denial, demonstrate/detect PUBLIC column leakage, verify RLS denial rolls back domain effects, and prove each required default INSERT column. Previous native billing86-test parity remains unchanged; no shared reducer changes in this lane. PG16/hosted Linux checks still await separate installation/setup approval.

Later separately approved execution syntax (DO NOT RUN now): psql against the exact approved restricted setup's DIRECT_URL as authorized owner, with `-v ON_ERROR_STOP=1 -v database_name=neondb -v receiver_role=staging_webhook_receiver -v worker_role=staging_webhook_worker -f staging-webhook/permission-grants.sql`. First review permission-audit.sql results and independently approve role/grant scope; no actual credentials supplied here. Runtime-owned read/write clients remain distinct from that future migration/grant owner.
