import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Topbar } from '../shared/ui/layout/Topbar';
import PermissionsPage from '../pages/permissions-page/PermissionsPage';
const state = vi.hoisted(() => ({
  permissions: [] as string[],
  roles: [] as string[],
  isLoading: false,
}));
vi.mock('../shared/hooks/useUserContext', () => ({ useUserContext: () => state }));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { login: 'operator' }, logout: vi.fn() }),
}));
vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));
vi.mock('../features/auth/components/UsersTable', () => ({
  default: () => <div>users-content</div>,
}));
vi.mock('../features/permissions/components/RolesTable', () => ({
  RolesTable: () => <div>roles-content</div>,
}));
vi.mock('../pages/permissions-page/components/RoleUsersTable', () => ({
  RoleUsersTable: () => <div>assignments-content</div>,
}));
vi.mock('../pages/permissions-page/components/ResourcesTable', () => ({
  ResourcesTable: () => <div>resources-content</div>,
}));
vi.mock('../pages/permissions-page/components/RoleResourcesTable', () => ({
  RoleResourcesTable: () => <div>role-resources-content</div>,
}));
vi.mock('../features/permissions/components/RoleRlsTable', () => ({
  RoleRlsTable: () => <div>rls-content</div>,
}));
describe('presentation navigation', () => {
  it.each([
    [[], ['ADMIN'], false, '/pipelines'],
    [['page.pipelines'], [], false, '/pipelines'],
    [['page.sessions'], [], false, '/sessions'],
    [[], [], false, '/about'],
    [[], ['ADMIN'], true, '/about'],
  ])('links the logo to an allowed landing page', (permissions, roles, isLoading, target) => {
    Object.assign(state, { permissions, roles, isLoading });
    render(
      <MemoryRouter>
        <Topbar onToggleSidebar={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'FDE — на главную' })).toHaveAttribute('href', target);
  });
  it('keeps all six management tools reachable and explains optional RLS', () => {
    render(<PermissionsPage />);
    expect(screen.getByText('users-content')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Роли' }));
    expect(screen.getByText('roles-content')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Назначение ролей' }));
    expect(screen.getByText('assignments-content')).toBeInTheDocument();
    const advanced = screen.getByText('Дополнительные настройки').closest('details')!;
    expect(advanced).not.toHaveAttribute('open');
    fireEvent.click(screen.getByText('Дополнительные настройки'));
    for (const [name, content] of [
      ['Ресурсы', 'resources-content'],
      ['Ресурсы ролей', 'role-resources-content'],
      ['Ограничения RLS', 'rls-content'],
    ]) {
      fireEvent.click(screen.getByRole('button', { name }));
      expect(screen.getByText(content)).toBeInTheDocument();
    }
    expect(screen.getByText(/RLS — необязательные дополнительные ограничения/)).toBeInTheDocument();
  });
});
