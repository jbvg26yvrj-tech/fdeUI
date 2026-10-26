import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { AccessRoute } from '../shared/components/AccessRoute';
const access = vi.hoisted(() => ({
  user: { id: 'employee' },
  isLoading: false,
  error: null,
  roles: [] as string[],
  permissions: [] as string[],
  refreshContext: vi.fn(),
}));
vi.mock('../shared/hooks/useUserContext', () => ({ useUserContext: () => access }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'employee' } }) }));
function view(path = '/', landing = true) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={path}
          element={
            <AccessRoute landing={landing}>
              <p>Secret settings</p>
            </AccessRoute>
          }
        />
        <Route path='/about' element={<p>About destination</p>} />
        <Route path='/pipelines/:id' element={<p>Pipeline destination</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
describe('access routes', () => {
  it('never renders settings from another identity context', () => {
    access.roles = ['ADMIN']; access.user = { id: 'old-admin' };
    view('/settings/ldap', false);
    expect(screen.queryByText('Secret settings')).not.toBeInTheDocument();
    access.roles = []; access.user = { id: 'employee' };
  });
  it('ignores a saved pipeline link when no page permission exists', () => {
    sessionStorage.setItem('pendingPipelineId', 'a0000000-0000-0000-0000-000000000000');
    view();
    expect(screen.getByText('About destination')).toBeInTheDocument();
    expect(sessionStorage.getItem('pendingPipelineId')).toBeNull();
  });
  it('denies direct settings route to users without ADMIN role', () => {
    view('/settings/ldap', false);
    expect(screen.queryByText('Secret settings')).not.toBeInTheDocument();
    expect(screen.getByText('About destination')).toBeInTheDocument();
  });
  it('does not mount settings content while permissions load', () => {
    access.roles = ['ADMIN'];
    access.isLoading = true;
    view('/settings/ldap', false);
    expect(screen.queryByText('Secret settings')).not.toBeInTheDocument();
    access.roles = [];
    access.isLoading = false;
  });
});
