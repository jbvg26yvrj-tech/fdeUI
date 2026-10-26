import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../context/AuthContext';
vi.mock('../shared/api/userContextApi', () => ({ userContextApi: {
  getCachedContext: () => ({ user: { id: 'old-admin', login: 'old-admin' } }),
  getUserContext: async () => ({ user: { id: 'employee', login: 'employee' } }),
  clearCache: vi.fn(),
} }));
function Identity() { const { user, isLoading } = useAuth(); return <p>{isLoading ? 'Loading' : user?.login}</p>; }
it('restores identity from the authenticated server response, never a previous cached user', async () => {
  sessionStorage.setItem('accessToken', 'employee-token');
  render(<MemoryRouter><AuthProvider><Identity /></AuthProvider></MemoryRouter>);
  expect(await screen.findByText('employee')).toBeInTheDocument();
  expect(screen.queryByText('old-admin')).not.toBeInTheDocument();
});
