import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthForm } from '../features/auth/components/AuthForm';
import { RoleFormModal } from '../features/permissions/components/RoleFormModal';
import { Sidebar } from '../shared/ui/layout/Sidebar';

const state = vi.hoisted(() => ({
  isLoading: false,
  roles: [] as string[],
  hasAnyPermission: () => false,
}));
vi.mock('../shared/hooks/useUserContext', () => ({ useUserContext: () => state }));

describe('LDAP access UI', () => {
  it('sends the selected provider and clears the password when switching', () => {
    const save = vi.fn();
    render(<AuthForm onSubmit={save} isLoading={false} ldapEnabled />);
    fireEvent.change(screen.getByLabelText('Логин'), { target: { value: 'employee' } });
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'local-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Доменная учётная запись' }));
    expect(screen.getByLabelText('Пароль')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'domain-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));
    expect(save).toHaveBeenCalledWith({
      login: 'employee',
      password: 'domain-secret',
      provider: 'LDAP',
    });
  });
  it('does not offer domain sign-in when disabled', () => {
    render(<AuthForm onSubmit={() => {}} isLoading={false} />);
    expect(
      screen.queryByRole('button', { name: 'Доменная учётная запись' }),
    ).not.toBeInTheDocument();
  });
  it('hides settings for ordinary users and during loading, shows ADMIN', () => {
    const { rerender } = render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Настройки')).not.toBeInTheDocument();
    state.roles = ['ADMIN'];
    state.isLoading = true;
    rerender(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Настройки')).not.toBeInTheDocument();
    state.isLoading = false;
    rerender(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText('Настройки')).toBeInTheDocument();
    state.roles = [];
  });
  it('submits explicit normalized client codes from the role form', () => {
    const save = vi.fn();
    render(<RoleFormModal isOpen onClose={() => {}} onSave={save} mode='create' />);
    fireEvent.change(screen.getByLabelText(/Код/), { target: { value: 'CUSTOM' } });
    fireEvent.change(screen.getByLabelText(/Название/), { target: { value: 'Custom' } });
    fireEvent.change(screen.getByLabelText('Доступные клиенты'), {
      target: { value: ' dwh, PC, dwh ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Создать|Сохранить/ }));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ clientCodes: ['DWH', 'PC'] }));
  });
});
