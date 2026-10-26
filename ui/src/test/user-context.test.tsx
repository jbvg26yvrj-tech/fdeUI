import { renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useUserContext } from '../shared/hooks/useUserContext';
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: '1' } }) }));
vi.mock('../shared/api/userContextApi', () => ({
  userContextApi: {
    getUserContext: async () => ({
      user: { id: '1' },
      roleCodes: ['ADMIN'],
      resourceCodes: [],
      settings: {},
    }),
  },
}));
it('loads initial user context without needing force refresh', async () => {
  const { result } = renderHook(() => useUserContext());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.roles).toEqual(['ADMIN']);
});
