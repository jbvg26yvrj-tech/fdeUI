-- Row-Level Security (RLS) table

CREATE TABLE auth.role_rls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES auth.resources(id) ON DELETE CASCADE,
    filter JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (role_id, resource_id)
);

CREATE INDEX idx_role_rls_role_id ON auth.role_rls(role_id);