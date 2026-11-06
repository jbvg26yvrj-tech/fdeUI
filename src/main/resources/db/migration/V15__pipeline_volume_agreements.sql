ALTER TABLE pipelines.pipelines
 ADD COLUMN agreed_volume_bytes BIGINT,
 ADD COLUMN agreed_volume_period VARCHAR(5) NOT NULL DEFAULT 'DAY',
 ADD CONSTRAINT ck_pipeline_agreed_volume CHECK (agreed_volume_bytes IS NULL OR agreed_volume_bytes BETWEEN 1 AND 9007199254740991),
 ADD CONSTRAINT ck_pipeline_agreed_period CHECK (agreed_volume_period IN ('RUN','DAY','MONTH'));

-- Preserve the existing allowlist and add only the two non-secret agreement fields.
DROP TRIGGER capture_audit ON pipelines.pipelines;
CREATE TRIGGER capture_audit AFTER INSERT OR UPDATE OR DELETE ON pipelines.pipelines
 FOR EACH ROW EXECUTE FUNCTION audit.capture_change('id,pipeline_name,client_from,client_to,primary_datacenter,all_or_nothing,agreed_volume_bytes,agreed_volume_period');

