CREATE TABLE auth.role_client_scopes (
    role_id UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
    client_code VARCHAR(255) NOT NULL CHECK (length(trim(client_code)) > 0),
    PRIMARY KEY (role_id, client_code)
);

INSERT INTO auth.roles (code, name, description, is_system)
SELECT code, code, 'Read pipelines and sessions for client ' || code, FALSE
FROM unnest(ARRAY['DWH', 'PC', 'OFD', 'PI', 'LKPP', 'SDP']) AS code
ON CONFLICT (code) DO NOTHING;

INSERT INTO auth.role_client_scopes (role_id, client_code)
SELECT id, code FROM auth.roles WHERE code IN ('DWH', 'PC', 'OFD', 'PI', 'LKPP', 'SDP')
ON CONFLICT DO NOTHING;

INSERT INTO auth.role_resources (role_id, resource_id)
SELECT role.id, resource.id FROM auth.roles role CROSS JOIN auth.resources resource
WHERE role.code IN ('DWH', 'PC', 'OFD', 'PI', 'LKPP', 'SDP')
  AND resource.code IN ('page.pipelines', 'page.sessions', 'table.pipelines', 'table.sessions',
                        'api.pipelines.list', 'api.pipelines.get', 'api.sessions.list', 'api.sessions.get')
ON CONFLICT (role_id, resource_id) DO NOTHING;
