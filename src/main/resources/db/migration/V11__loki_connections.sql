-- External Loki configuration only. Session/executor schemas remain read-only.
CREATE TABLE public.loki_connections (
    id UUID PRIMARY KEY,
    config JSONB NOT NULL,
    encrypted_secret TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
