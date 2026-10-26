-- Permission module — RBAC tables

-- Roles
CREATE TABLE auth.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Resources (permissions)
CREATE TABLE auth.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Role-User assignments
CREATE TABLE auth.role_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (role_id, user_id)
);
CREATE INDEX idx_role_users_user_id ON auth.role_users(user_id);
CREATE INDEX idx_role_users_role_id ON auth.role_users(role_id);

-- Role-Resource permissions
CREATE TABLE auth.role_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES auth.resources(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (role_id, resource_id)
);
CREATE INDEX idx_role_resources_role_id ON auth.role_resources(role_id);
CREATE INDEX idx_role_resources_resource_id ON auth.role_resources(resource_id);