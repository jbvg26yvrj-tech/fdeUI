CREATE TABLE auth.registration_settings (
 id INTEGER PRIMARY KEY CHECK (id=1),
 registration_enabled BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO auth.registration_settings(id,registration_enabled) VALUES (1,true);
CREATE TRIGGER capture_audit AFTER UPDATE ON auth.registration_settings
 FOR EACH ROW EXECUTE FUNCTION audit.capture_change('registration_enabled');
