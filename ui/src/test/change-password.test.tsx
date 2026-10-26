import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import ChangePasswordPage from '../features/auth/pages/ChangePasswordPage';
const mocks = vi.hoisted(() => ({ login: vi.fn(), navigate: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', login: 'local', passwordChangeRequired: true },
    login: mocks.login,
  }),
}));
vi.mock('../features/auth/api/authApi', () => ({
  authApi: { changePassword: async () => ({ message: 'ok' }) },
}));
vi.mock('../features/auth/components/ChangePasswordForm', () => ({
  ChangePasswordForm: ({ onSubmit }: { onSubmit: (login: string, data: object) => void }) => (
    <button onClick={() => onSubmit('local', {})}>Save password</button>
  ),
}));
it('updates local identity after changing password so protected landing does not loop', async () => {
  sessionStorage.setItem('accessToken', 'local-token');
  render(<ChangePasswordPage />);
  fireEvent.click(screen.getByText('Save password'));
  await waitFor(() =>
    expect(mocks.login).toHaveBeenCalledWith(
      expect.objectContaining({ passwordChangeRequired: false }),
      'local-token',
    ),
  );
});
