-- User settings: key-value storage per user
CREATE TABLE auth.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    setting_key VARCHAR(255) NOT NULL,
    setting_value TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, setting_key)
);

CREATE INDEX idx_user_settings_user_id ON auth.user_settings(user_id);

COMMENT ON TABLE auth.user_settings IS 'Per-user key-value settings';