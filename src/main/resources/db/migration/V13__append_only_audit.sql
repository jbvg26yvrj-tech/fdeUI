CREATE SCHEMA audit;
CREATE TABLE audit.events (
 id BIGSERIAL PRIMARY KEY,
 occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 actor VARCHAR(128) NOT NULL,
 actor_name VARCHAR(100) NOT NULL,
 action VARCHAR(128) NOT NULL,
 target_type VARCHAR(128) NOT NULL,
 target_id VARCHAR(128),
 result VARCHAR(24) NOT NULL CHECK(result IN ('SUCCESS','FAILURE','FORBIDDEN','ACCEPTED','UNKNOWN','REQUESTED')),
 correlation_id VARCHAR(64) NOT NULL,
 changes JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX audit_events_time ON audit.events(occurred_at DESC,id DESC);
CREATE INDEX audit_events_actor_time ON audit.events(actor,occurred_at DESC);
CREATE INDEX audit_events_target_time ON audit.events(target_id,occurred_at DESC);
CREATE INDEX audit_events_actor_name_time ON audit.events(actor_name,occurred_at DESC);
CREATE INDEX audit_events_correlation ON audit.events(correlation_id);
CREATE FUNCTION audit.reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Audit events are append-only'; END; $$;
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON audit.events
 FOR EACH STATEMENT EXECUTE FUNCTION audit.reject_mutation();
CREATE FUNCTION audit.capture_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous JSONB; current_row JSONB; safe_before JSONB; safe_after JSONB; keys TEXT[];
BEGIN
 previous := CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;
 current_row := CASE WHEN TG_OP='DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END;
 keys := string_to_array(TG_ARGV[0], ',');
 SELECT coalesce(jsonb_object_agg(key,value),'{}'::jsonb) INTO safe_before FROM jsonb_each(previous) WHERE key=ANY(keys);
 SELECT coalesce(jsonb_object_agg(key,value),'{}'::jsonb) INTO safe_after FROM jsonb_each(current_row) WHERE key=ANY(keys);
 IF TG_TABLE_NAME='ldap_settings' THEN
  SELECT coalesce(jsonb_object_agg(key,value),'{}'::jsonb) INTO safe_before FROM jsonb_each(coalesce(previous->>'config_json','{}')::jsonb) WHERE key=ANY(ARRAY['enabled','syncEnabled','directoryType','tlsMode','syncIntervalMinutes','connectTimeoutMs','readTimeoutMs']);
  SELECT coalesce(jsonb_object_agg(key,value),'{}'::jsonb) INTO safe_after FROM jsonb_each(coalesce(current_row->>'config_json','{}')::jsonb) WHERE key=ANY(ARRAY['enabled','syncEnabled','directoryType','tlsMode','syncIntervalMinutes','connectTimeoutMs','readTimeoutMs']);
 ELSIF TG_TABLE_NAME='loki_connections' THEN
  SELECT coalesce(jsonb_object_agg(key,value),'{}'::jsonb) INTO safe_before FROM jsonb_each(coalesce(previous->'config','{}'::jsonb)) WHERE key=ANY(ARRAY['name','enabled','datacenter','authType','timeoutSeconds','limit','maxHours']);
  SELECT coalesce(jsonb_object_agg(key,value),'{}'::jsonb) INTO safe_after FROM jsonb_each(coalesce(current_row->'config','{}'::jsonb)) WHERE key=ANY(ARRAY['name','enabled','datacenter','authType','timeoutSeconds','limit','maxHours']);
 END IF;
 -- For opaque/secret-bearing configuration, record change markers, never its contents.
 IF previous->'props' IS DISTINCT FROM current_row->'props' THEN
  safe_after := safe_after || jsonb_build_object('propertiesChanged',previous->'props' IS DISTINCT FROM current_row->'props');
 END IF;
 IF previous->'filter' IS DISTINCT FROM current_row->'filter' THEN
  safe_after := safe_after || jsonb_build_object('filterChanged',previous->'filter' IS DISTINCT FROM current_row->'filter');
 END IF;
 IF previous->'password' IS DISTINCT FROM current_row->'password' THEN
  safe_after := safe_after || jsonb_build_object('credentialsChanged',previous->'password' IS DISTINCT FROM current_row->'password');
 END IF;
 IF TG_TABLE_NAME IN ('ldap_settings','loki_connections','system_information') THEN
  IF previous->'config_json' IS DISTINCT FROM current_row->'config_json' OR previous->'config' IS DISTINCT FROM current_row->'config' OR previous->'blocks' IS DISTINCT FROM current_row->'blocks' OR previous->'encrypted_password' IS DISTINCT FROM current_row->'encrypted_password' OR previous->'encrypted_secret' IS DISTINCT FROM current_row->'encrypted_secret' THEN
   safe_after := safe_after || jsonb_build_object('configurationChanged',true);
  END IF;
 END IF;
 IF TG_OP='UPDATE' AND safe_before=safe_after THEN RETURN NULL; END IF;
 INSERT INTO audit.events(actor,actor_name,action,target_type,target_id,result,correlation_id,changes)
 VALUES(coalesce(nullif(current_setting('fde.audit_actor',true),''),'system'),coalesce(nullif(current_setting('fde.audit_actor_name',true),''),'system'), lower(TG_TABLE_NAME)||'.'||lower(TG_OP),
 TG_TABLE_SCHEMA||'.'||TG_TABLE_NAME,coalesce(current_row->>'id',previous->>'id',current_row->>'role_id',previous->>'role_id'),
 'SUCCESS',coalesce(nullif(current_setting('fde.audit_correlation',true),''),gen_random_uuid()::text),
 jsonb_build_object('before',safe_before,'after',safe_after));
 RETURN NULL;
END; $$;
CREATE TRIGGER capture_audit AFTER INSERT OR UPDATE OR DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION audit.capture_change('id,login,activated,password_change_required,auth_source,directory_disabled,manual_disabled');
CREATE TRIGGER capture_audit AFTER INSERT OR UPDATE OR DELETE ON auth.roles FOR EACH ROW EXECUTE FUNCTION audit.capture_change('id,code,name,is_system');
CREATE TRIGGER capture_audit AFTER INSERT OR UPDATE OR DELETE ON auth.resources FOR EACH ROW EXECUTE FUNCTION audit.capture_change('id,code,name,type');
CREATE TRIGGER capture_audit AFTER INSERT OR UPDATE OR DELETE ON auth.role_users FOR EACH ROW EXECUTE FUNCTION audit.capture_change('id,role_id,user_id');
CREATE TRIGGER capture_audit AFTER INSERT OR UPDATE OR DELETE ON auth.role_resources FOR EACH ROW EXECUTE FUNCTION audit.capture_change('id,role_id,resource_id');
CREATE TRIGGER capture_audit AFTER INSERT OR UPDATE OR DELETE ON auth.role_rls FOR EACH ROW EXECUTE FUNCTION audit.capture_change('id,role_id,resource_id');
CREATE TRIGGER capture_audit AFTER INSERT OR UPDATE OR DELETE ON auth.role_client_scopes FOR EACH ROW EXECUTE FUNCTION audit.capture_change('role_id,client_code');
CREATE TRIGGER capture_audit AFTER INSERT OR UPDATE OR DELETE ON pipelines.pipelines FOR EACH ROW EXECUTE FUNCTION audit.capture_change('id,pipeline_name,client_from,client_to,primary_datacenter,all_or_nothing');
CREATE TRIGGER capture_audit AFTER INSERT OR UPDATE OR DELETE ON pipelines.tasks FOR EACH ROW EXECUTE FUNCTION audit.capture_change('id,pipeline_id,task_order,type_code');
CREATE TRIGGER capture_audit AFTER INSERT OR UPDATE OR DELETE ON auth.ldap_settings FOR EACH ROW EXECUTE FUNCTION audit.capture_change('id,version,sync_status,sync_checked,sync_updated,sync_deactivated');
CREATE TRIGGER capture_audit AFTER INSERT OR UPDATE OR DELETE ON public.loki_connections FOR EACH ROW EXECUTE FUNCTION audit.capture_change('id');
CREATE TRIGGER capture_audit AFTER INSERT OR UPDATE OR DELETE ON public.system_information FOR EACH ROW EXECUTE FUNCTION audit.capture_change('id,version');
