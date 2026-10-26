import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LdapSettingsPage from '../pages/settings-page/LdapSettingsPage';
const api = vi.hoisted(() => ({
  get: vi.fn(),
  save: vi.fn(),
  test: vi.fn(),
  status: vi.fn(),
  sync: vi.fn(),
}));
vi.mock('../features/settings/ldapApi', () => ({ ldapApi: api }));
const config = {
  enabled: true,
  syncEnabled: true,
  directoryType: 'AD',
  url: 'ldaps://directory:636',
  tlsMode: 'LDAPS',
  baseDn: 'dc=example,dc=com',
  bindDn: 'cn=service',
  userFilter: '(sAMAccountName={login})',
  activeFilter: '',
  loginAttribute: 'sAMAccountName',
  idAttribute: 'objectGUID',
  displayNameAttribute: 'displayName',
  emailAttribute: 'mail',
  syncIntervalMinutes: 15,
  connectTimeoutMs: 5000,
  readTimeoutMs: 10000,
  bindPasswordConfigured: true,
};
describe('LDAP settings', () => {
  it('preserves the stored secret and tests unsaved input without saving', async () => {
    api.get.mockResolvedValue(config);
    api.status.mockResolvedValue({ status: 'NEVER', checked: 0, updated: 0, deactivated: 0 });
    api.test.mockResolvedValue({ success: true, message: 'Соединение установлено' });
    api.save.mockResolvedValue(config);
    render(<LdapSettingsPage />);
    await screen.findByLabelText('Адрес сервера');
    expect(screen.getByLabelText('Пароль служебной учётной записи')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Адрес сервера'), {
      target: { value: 'ldaps://new-directory:636' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Проверить подключение' }));
    await screen.findByText('Соединение установлено');
    expect(api.test).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'ldaps://new-directory:636' }),
    );
    expect(api.test.mock.calls[0][0]).not.toHaveProperty('bindPassword');
    expect(api.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    expect(api.save.mock.calls[0][0]).not.toHaveProperty('bindPassword');
  });
  it('shows actual synchronization results and uses the saved configuration', async () => {
    api.get.mockResolvedValue(config);
    api.status.mockResolvedValue(null);
    api.sync.mockResolvedValue({
      status: 'SUCCESS',
      message: 'Готово',
      checked: 7,
      updated: 2,
      deactivated: 1,
      finishedAt: '2026-10-26T12:00:00Z',
    });
    render(<LdapSettingsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Синхронизировать сейчас' }));
    await screen.findByText('Готово');
    expect(screen.getByText('Проверено: 7')).toBeInTheDocument();
    expect(api.sync).toHaveBeenCalledWith();
  });
});
