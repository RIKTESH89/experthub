-- READ ONLY preflight. Run before proposing any hosted grants, not via migration ledger.
-- Supply database_name/receiver_role/worker_role as psql identifier/string variables.
SELECT current_database(), current_user, version();
SELECT rolname,rolsuper,rolcreaterole,rolcreatedb,rolbypassrls,rolinherit,rolcanlogin
 FROM pg_roles WHERE rolname IN (:'receiver_role', :'worker_role');
SELECT member.rolname AS member, parent.rolname AS parent_role, m.admin_option
 FROM pg_auth_members m JOIN pg_roles member ON member.oid=m.member JOIN pg_roles parent ON parent.oid=m.roleid;
-- PUBLIC database/schema privileges (CONNECT is expected, TEMP/CREATE need explicit review).
SELECT datname,a.grantee,a.privilege_type FROM pg_database d,
 LATERAL aclexplode(COALESCE(d.datacl,acldefault('d',d.datdba))) a
 WHERE d.datname=:'database_name' AND a.grantee=0;
SELECT nspname,a.grantee,a.privilege_type FROM pg_namespace n,
 LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) a
 WHERE n.nspname='public' AND a.grantee=0;
-- Audit PUBLIC rights on ALL public application objects, not only payment tables.
SELECT c.relname,a.privilege_type FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace,
 LATERAL aclexplode(COALESCE(c.relacl,acldefault(CASE WHEN c.relkind='S' THEN 's'::"char" ELSE 'r'::"char" END,c.relowner))) a
 WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S') AND a.grantee=0;
SELECT c.relname,att.attname,a.privilege_type FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 JOIN pg_attribute att ON att.attrelid=c.oid,
 LATERAL aclexplode(att.attacl) a WHERE n.nspname='public' AND att.attnum>0 AND a.grantee=0;
SELECT pg_get_userbyid(defaclrole) AS owner,COALESCE(n.nspname,'global') AS scope,defaclobjtype,defaclacl
 FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace;
-- RLS is not assumed; these roles are non-owner/NOBYPASSRLS. Policies may block work or broaden it.
SELECT c.relname,pg_get_userbyid(c.relowner) AS owner,c.relrowsecurity,c.relforcerowsecurity
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p');
SELECT * FROM pg_policies WHERE schemaname='public';
-- Callable SECURITY DEFINER routines can circumvent column permissions; inspect all such routines.
SELECT n.nspname,p.proname,p.oid::regprocedure,pg_get_userbyid(p.proowner) AS owner,p.proconfig,p.proacl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.prosecdef AND n.nspname NOT IN ('pg_catalog','information_schema');
-- Raw ACL output includes inherited/default effects requiring effective privilege probes per role.
SELECT c.relname,c.relacl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p');
SELECT c.relname,att.attname,att.attacl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 JOIN pg_attribute att ON att.attrelid=c.oid WHERE n.nspname='public' AND att.attnum>0 AND att.attacl IS NOT NULL;
-- Effective privileges include PUBLIC and inherited roles; absence of two rows is a STOP.
SELECT r.rolname,has_database_privilege(r.oid,d.oid,'CONNECT') AS can_connect,
 has_database_privilege(r.oid,d.oid,'CREATE') AS can_create_database_objects,
 has_database_privilege(r.oid,d.oid,'TEMP') AS can_temp,
 has_schema_privilege(r.oid,n.oid,'CREATE') AS can_create_public,
 has_schema_privilege(r.oid,n.oid,'USAGE') AS can_use_public
 FROM pg_roles r CROSS JOIN pg_database d CROSS JOIN pg_namespace n
 WHERE r.rolname IN (:'receiver_role',:'worker_role') AND d.datname=:'database_name' AND n.nspname='public';
SELECT r.rolname,c.relname,pg_get_userbyid(c.relowner)=r.rolname AS owns_object,
 has_table_privilege(r.oid,c.oid,'SELECT') AS table_read,
 has_table_privilege(r.oid,c.oid,'INSERT') AS table_insert,
 has_table_privilege(r.oid,c.oid,'UPDATE') AS table_update,
 has_table_privilege(r.oid,c.oid,'DELETE') AS can_delete,
 has_table_privilege(r.oid,c.oid,'TRUNCATE') AS can_truncate,
 has_table_privilege(r.oid,c.oid,'TRIGGER') AS can_trigger
 FROM pg_roles r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE r.rolname IN (:'receiver_role',:'worker_role') AND n.nspname='public' AND c.relkind IN ('r','p');
SELECT r.rolname,c.relname,att.attname,
 has_column_privilege(r.oid,c.oid,att.attnum,'SELECT') AS can_read,
 has_column_privilege(r.oid,c.oid,att.attnum,'INSERT') AS can_insert,
 has_column_privilege(r.oid,c.oid,att.attnum,'UPDATE') AS can_update
 FROM pg_roles r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute att ON att.attrelid=c.oid
 WHERE r.rolname IN (:'receiver_role',:'worker_role') AND n.nspname='public' AND c.relkind IN ('r','p') AND att.attnum>0 AND NOT att.attisdropped
 AND (has_column_privilege(r.oid,c.oid,att.attnum,'SELECT') OR has_column_privilege(r.oid,c.oid,att.attnum,'INSERT') OR has_column_privilege(r.oid,c.oid,att.attnum,'UPDATE'));
