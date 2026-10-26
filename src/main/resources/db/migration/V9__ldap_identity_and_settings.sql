ALTER TABLE auth.users ADD COLUMN auth_source VARCHAR(8) NOT NULL DEFAULT 'LOCAL';
ALTER TABLE auth.users ADD COLUMN external_id VARCHAR(255);
ALTER TABLE auth.users ADD COLUMN directory_disabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE auth.users ADD COLUMN manual_disabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE auth.users ADD COLUMN display_name VARCHAR(255);
ALTER TABLE auth.users ADD COLUMN email VARCHAR(320);
ALTER TABLE auth.users ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE auth.users ADD CONSTRAINT chk_auth_source CHECK (auth_source IN ('LOCAL', 'LDAP'));
ALTER TABLE auth.users ADD CONSTRAINT chk_external_identity CHECK (auth_source <> 'LDAP' OR external_id IS NOT NULL);
CREATE UNIQUE INDEX users_directory_identity ON auth.users(auth_source, external_id) WHERE external_id IS NOT NULL;

CREATE TABLE auth.ldap_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    config_json TEXT NOT NULL DEFAULT '{}',
    encrypted_password TEXT,
    version BIGINT NOT NULL DEFAULT 0,
    lease_owner VARCHAR(36),
    lease_until TIMESTAMP WITH TIME ZONE,
    next_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(24) NOT NULL DEFAULT 'NEVER',
    sync_message VARCHAR(255) NOT NULL DEFAULT 'Синхронизация ещё не выполнялась',
    sync_checked INTEGER NOT NULL DEFAULT 0,
    sync_updated INTEGER NOT NULL DEFAULT 0,
    sync_deactivated INTEGER NOT NULL DEFAULT 0,
    sync_finished_at TIMESTAMP WITH TIME ZONE
);
INSERT INTO auth.ldap_settings(id) VALUES (1);
