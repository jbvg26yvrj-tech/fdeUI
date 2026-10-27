import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from '../shared/ui/layout/Layout';
import { Sidebar } from '../shared/ui/layout/Sidebar';
const state = vi.hoisted(() => ({
  isLoading: false,
  roles: [] as string[],
  hasAnyPermission: () => false,
}));
vi.mock('../shared/hooks/useUserContext', () => ({
  useUserContext: () => state,
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { login: 'operator' },
    logout: vi.fn(),
  }),
}));
vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));
beforeEach(() => {
  state.roles = [];
  state.isLoading = false;
  localStorage.clear();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});
describe('application shell', () => {
  it('closes narrow navigation after a link, Escape or backdrop', () => {
    render(
      <MemoryRouter initialEntries={['/pipelines']}>
        <Layout>
          <h1>Рабочая область</h1>
        </Layout>
      </MemoryRouter>,
    );
    const toggle = screen.getByRole('button', { name: 'Открыть навигацию' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'О системе' })).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByRole('banner').parentElement).toHaveAttribute('inert');
    expect(screen.getByRole('main')).toHaveAttribute('inert');
    fireEvent.click(screen.getByRole('link', { name: 'О системе' }));
    expect(screen.getByRole('banner').parentElement).not.toHaveAttribute('inert');
    expect(screen.getByRole('main')).not.toHaveAttribute('inert');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть навигацию' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
  it('only exposes permitted links and never flashes administration while loading', () => {
    const view = render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('link').map(link => link.textContent)).toEqual(['О системе']);
    expect(screen.queryByText('Администрирование')).not.toBeInTheDocument();
    state.roles = ['ADMIN'];
    state.isLoading = true;
    view.rerender(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('link').map(link => link.textContent)).toEqual(['О системе']);
    state.isLoading = false;
    view.rerender(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Настройки' })).toHaveAttribute(
      'href',
      '/settings/ldap',
    );
    expect(screen.getByRole('link', { name: 'Права доступа' })).toBeInTheDocument();
  });
});
