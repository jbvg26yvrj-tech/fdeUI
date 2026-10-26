import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../context/AuthContext';
vi.mock('../features/auth/api/authApi', () => ({ authApi: { logout: async () => {} } }));
vi.mock('../shared/api/userContextApi', () => ({ userContextApi: {
  getUserContext: async () => {
    await Promise.resolve();
    window.dispatchEvent(new Event('authTokenRefreshFailed'));
    throw new Error('Refresh token expired');
  },
  clearCache: vi.fn(),
} }));
function Identity() {
  const { isAuthenticated, isLoading } = useAuth();
  return <p>{isLoading ? 'Loading' : isAuthenticated ? 'Signed in' : 'Sign in available'}</p>;
}
it('finishes startup when both the saved access token and refresh token are expired', async () => {
  sessionStorage.setItem('accessToken', 'expired-token');
  render(<MemoryRouter><AuthProvider><Identity /></AuthProvider></MemoryRouter>);
  expect(await screen.findByText('Sign in available')).toBeInTheDocument();
  expect(screen.queryByText('Loading')).not.toBeInTheDocument();
  expect(sessionStorage.getItem('accessToken')).toBeNull();
});
