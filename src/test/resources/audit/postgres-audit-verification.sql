\set ON_ERROR_STOP on
-- Run ONLY against an isolated schema-only clone with migration V13 applied.
CREATE OR REPLACE FUNCTION public.audit_assert(ok boolean, message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Audit assertion failed: %', message; END IF; END; $$;
BEGIN;
SELECT set_config('fde.audit_actor','audit-user-id',true);
SELECT set_config('fde.audit_actor_name','Readable User',true);
SELECT set_config('fde.audit_correlation','audit-integration-001',true);
INSERT INTO pipelines.pipelines(id,pipeline_name,client_from,client_to,all_or_nothing) VALUES ('10000000-0000-0000-0000-000000000001','Audit route','DWH','PC',false);
INSERT INTO auth.users(id,login,password) VALUES ('20000000-0000-0000-0000-000000000001','audit-user','CANARY_PASSWORD');
INSERT INTO auth.roles(id,code,name) VALUES ('30000000-0000-0000-0000-000000000001','AUDIT_TEST','Audit role');
INSERT INTO auth.role_client_scopes(role_id,client_code) VALUES ('30000000-0000-0000-0000-000000000001','DWH');
INSERT INTO auth.role_users(role_id,user_id) VALUES ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');
INSERT INTO pipelines.tasks(pipeline_id,task_order,type_code,props) VALUES ('10000000-0000-0000-0000-000000000001',1,'SftpDownloadTask','{"password":"CANARY_TASK","sourceDir":"/private"}');
COMMIT;
SELECT public.audit_assert((SELECT count(*)=6 FROM audit.events),'all atomic row events');
SELECT public.audit_assert((SELECT bool_and(actor='audit-user-id' AND actor_name='Readable User' AND correlation_id='audit-integration-001') FROM audit.events),'actor and correlation shared in transaction');
SELECT public.audit_assert(NOT EXISTS(SELECT 1 FROM audit.events WHERE changes::text LIKE '%CANARY%' OR changes::text LIKE '%/private%'),'no password or task properties');
SELECT public.audit_assert(EXISTS(SELECT 1 FROM audit.events WHERE target_type='auth.users' AND changes->'after'->>'credentialsChanged'='true'),'password change marker only');
BEGIN;
UPDATE pipelines.pipelines SET primary_datacenter='DC2' WHERE id='10000000-0000-0000-0000-000000000001';
COMMIT;
SELECT public.audit_assert(EXISTS(SELECT 1 FROM audit.events WHERE action='pipelines.update' AND actor='system' AND changes->'before'->>'primary_datacenter'='DC1' AND changes->'after'->>'primary_datacenter'='DC2'),'actor context never leaks between transactions, useful before and after');
BEGIN;
SELECT set_config('fde.audit_actor','rolled-back-user',true);
UPDATE pipelines.pipelines SET pipeline_name='ROLLBACK_CANARY' WHERE id='10000000-0000-0000-0000-000000000001';
ROLLBACK;
SELECT public.audit_assert(NOT EXISTS(SELECT 1 FROM audit.events WHERE actor='rolled-back-user' OR changes::text LIKE '%ROLLBACK_CANARY%'),'rolled back mutations produce no success event');
UPDATE auth.users SET updated_at=NOW() WHERE id='20000000-0000-0000-0000-000000000001';
SELECT public.audit_assert((SELECT count(*)=7 FROM audit.events),'no-op and timestamp changes do not add audit noise');
INSERT INTO auth.ldap_settings(id,config_json,encrypted_password) VALUES (1,'{"enabled":true,"syncEnabled":false,"directoryType":"AD","bindPassword":"CANARY_LDAP","bindDn":"CANARY_DN"}','CANARY_ENCRYPTED');
UPDATE auth.ldap_settings SET lease_owner='lease-test',lease_until=NOW() WHERE id=1;
SELECT public.audit_assert((SELECT count(*)=8 FROM audit.events),'LDAP lease maintenance does not generate audit events');
SELECT public.audit_assert(EXISTS(SELECT 1 FROM audit.events WHERE target_type='auth.ldap_settings' AND changes->'after'->>'enabled'='true'),'safe LDAP configuration snapshot');
INSERT INTO public.loki_connections(id,config,encrypted_secret) VALUES ('40000000-0000-0000-0000-000000000001','{"name":"Audit Loki","enabled":true,"username":"CANARY_USER","secret":"CANARY_LOKI","headers":{"Authorization":"CANARY_HEADER"}}','CANARY_SECRET');
SELECT public.audit_assert(NOT EXISTS(SELECT 1 FROM audit.events WHERE changes::text LIKE '%CANARY%'),'LDAP/Loki configuration secrets excluded');
DO $$ BEGIN
 BEGIN UPDATE audit.events SET result='FAILURE'; RAISE EXCEPTION 'UPDATE unexpectedly accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Audit events are append-only' THEN RAISE; END IF; END;
 BEGIN DELETE FROM audit.events; RAISE EXCEPTION 'DELETE unexpectedly accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Audit events are append-only' THEN RAISE; END IF; END;
 BEGIN TRUNCATE audit.events; RAISE EXCEPTION 'TRUNCATE unexpectedly accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Audit events are append-only' THEN RAISE; END IF; END;
END; $$;
DELETE FROM auth.roles WHERE id='30000000-0000-0000-0000-000000000001';
SELECT public.audit_assert(EXISTS(SELECT 1 FROM audit.events WHERE action='role_client_scopes.delete'),'cascade changes recorded');
SELECT 'AUDIT_POSTGRES_ASSERTIONS_PASSED' AS result;
