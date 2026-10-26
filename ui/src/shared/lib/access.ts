const pagePermissions: Record<string, string> = {
  pipelines: 'page.pipelines',
  sessions: 'page.sessions',
  permissions: 'page.permissions',
  'change-datacenter': 'api.pipelines.update',
};

export function canAccessPath(path: string, permissions: string[], roles: string[]): boolean {
  const section = path.split('/')[1];
  if (section === 'about') return true;
  if (section === 'settings') return roles.includes('ADMIN');
  const required = pagePermissions[section];
  return Boolean(required && (roles.includes('ADMIN') || permissions.includes(required)));
}

export function landingPath(permissions: string[], roles: string[]): string {
  return (
    ['/pipelines', '/sessions', '/permissions'].find(path =>
      canAccessPath(path, permissions, roles),
    ) || '/about'
  );
}
