-- Seed admin user, ADMIN/USER roles, all resources, and role assignments.
-- All INSERTs use ON CONFLICT DO NOTHING for idempotency (ResourceSyncService also creates resources on startup).

-- ==================== ADMIN role ====================
INSERT INTO auth.roles (id, code, name, description, is_system, created_at)
VALUES ('ad9996a4-af62-4198-9bbb-cf22939a3338', 'ADMIN', 'Administrator', 'Full system access', TRUE, NOW())
ON CONFLICT (code) DO NOTHING;

-- ==================== USER role ====================
INSERT INTO auth.roles (id, code, name, description, is_system, created_at)
VALUES ('b1e2f3a4-5678-4abc-9def-0123456789ab', 'USER', 'User', 'Basic read access', TRUE, NOW())
ON CONFLICT (code) DO NOTHING;

-- ==================== Admin user (password: admin@fde, bcrypt strength 10) ====================
-- This is the BOOTSTRAP password for initial setup only.
-- password_change_required=TRUE forces the admin to change it on first login.
-- The bcrypt hash below MUST NOT be reused in production — generate a new one.
INSERT INTO auth.users (id, login, password, activated, password_change_required, created_at, updated_at)
VALUES (
    '088c263b-8622-411f-ac68-a8e3feaa7b88',
    'admin',
    '$2a$10$J4nDzRwjwvmSTgVKqnzx9e8aJagkV3q888PIR9rB55vhTs8qG7JHq',
    TRUE,
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (login) DO NOTHING;

-- ==================== Assign admin to ADMIN role ====================
INSERT INTO auth.role_users (id, role_id, user_id, created_at)
VALUES (
    gen_random_uuid(),
    'ad9996a4-af62-4198-9bbb-cf22939a3338',
    '088c263b-8622-411f-ac68-a8e3feaa7b88',
    NOW()
)
ON CONFLICT (role_id, user_id) DO NOTHING;

-- ==================== Resources (from ResourceDefinition enum) ====================
-- Pipelines
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.pipelines.list', 'List pipelines', 'API', NOW()) ON CONFLICT (code) DO NOTHING;
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.pipelines.get', 'Get pipeline', 'API', NOW()) ON CONFLICT (code) DO NOTHING;
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.pipelines.create', 'Create pipeline', 'API', NOW()) ON CONFLICT (code) DO NOTHING;
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.pipelines.update', 'Update pipeline', 'API', NOW()) ON CONFLICT (code) DO NOTHING;
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.pipelines.delete', 'Delete pipeline', 'API', NOW()) ON CONFLICT (code) DO NOTHING;

-- Sessions
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.sessions.list', 'List sessions', 'API', NOW()) ON CONFLICT (code) DO NOTHING;
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.sessions.get', 'Get session', 'API', NOW()) ON CONFLICT (code) DO NOTHING;

-- Schedules
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.schedules.create', 'Create schedule', 'API', NOW()) ON CONFLICT (code) DO NOTHING;
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.schedules.get', 'Get schedule', 'API', NOW()) ON CONFLICT (code) DO NOTHING;
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.schedules.update', 'Update schedule', 'API', NOW()) ON CONFLICT (code) DO NOTHING;
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.schedules.delete', 'Delete schedule', 'API', NOW()) ON CONFLICT (code) DO NOTHING;

-- Triggers
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.triggers.manual', 'Manual trigger', 'API', NOW()) ON CONFLICT (code) DO NOTHING;
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.triggers.stop', 'Stop execution', 'API', NOW()) ON CONFLICT (code) DO NOTHING;

-- Users
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.users.list', 'List users', 'API', NOW()) ON CONFLICT (code) DO NOTHING;
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.users.get', 'Get user', 'API', NOW()) ON CONFLICT (code) DO NOTHING;
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.users.create', 'Create user', 'API', NOW()) ON CONFLICT (code) DO NOTHING;
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.users.update', 'Update user', 'API', NOW()) ON CONFLICT (code) DO NOTHING;
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.users.delete', 'Delete user', 'API', NOW()) ON CONFLICT (code) DO NOTHING;

-- Roles & Permissions
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.roles.manage', 'Manage roles', 'API', NOW()) ON CONFLICT (code) DO NOTHING;
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.permissions.view', 'View permissions', 'API', NOW()) ON CONFLICT (code) DO NOTHING;

-- User Context
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.user-context.get', 'Get user context', 'API', NOW()) ON CONFLICT (code) DO NOTHING;
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'api.user-settings.manage', 'Manage user settings', 'API', NOW()) ON CONFLICT (code) DO NOTHING;

-- UI Pages
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'page.pipelines', 'Pipelines page', 'PAGE', NOW()) ON CONFLICT (code) DO NOTHING;
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'page.sessions', 'Sessions page', 'PAGE', NOW()) ON CONFLICT (code) DO NOTHING;
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'page.users', 'Users page', 'PAGE', NOW()) ON CONFLICT (code) DO NOTHING;
INSERT INTO auth.resources (id, code, name, type, created_at) VALUES (gen_random_uuid(), 'page.permissions', 'Permissions page', 'PAGE', NOW()) ON CONFLICT (code) DO NOTHING;

-- ==================== Assign ALL resources to ADMIN role ====================
INSERT INTO auth.role_resources (id, role_id, resource_id, created_at)
SELECT gen_random_uuid(), 'ad9996a4-af62-4198-9bbb-cf22939a3338', r.id, NOW()
FROM auth.resources r
WHERE NOT EXISTS (
    SELECT 1 FROM auth.role_resources rr
    WHERE rr.role_id = 'ad9996a4-af62-4198-9bbb-cf22939a3338' AND rr.resource_id = r.id
);

-- ==================== Assign read-only resources to USER role ====================
INSERT INTO auth.role_resources (id, role_id, resource_id, created_at)
SELECT gen_random_uuid(), 'b1e2f3a4-5678-4abc-9def-0123456789ab', r.id, NOW()
FROM auth.resources r
WHERE r.code IN (
    'api.pipelines.list', 'api.pipelines.get',
    'api.sessions.list', 'api.sessions.get',
    'api.user-context.get', 'api.user-settings.manage',
    'page.pipelines', 'page.sessions'
)
AND NOT EXISTS (
    SELECT 1 FROM auth.role_resources rr
    WHERE rr.role_id = 'b1e2f3a4-5678-4abc-9def-0123456789ab' AND rr.resource_id = r.id
);