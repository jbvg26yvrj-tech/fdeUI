import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { it, expect, vi, beforeEach } from 'vitest';
import AuditPage from '../pages/audit-page/AuditPage';
import { auditApi } from '../features/audit/api';
import { canAccessPath } from '../shared/lib/access';
const context = vi.hoisted(() => ({ roles: ['ADMIN'], isLoading: false }));
vi.mock('../shared/hooks/useUserContext', () => ({ useUserContext: () => context }));
vi.mock('../features/audit/api', () => ({ auditApi: { list: vi.fn() } }));
const event = {
  id: 1,
  occurredAt: '2026-10-28T10:00:00Z',
  actor: 'u1',
  actorName: 'admin',
  action: 'pipelines.update',
  targetType: 'pipelines.pipelines',
  targetId: 'p1',
  result: 'SUCCESS',
  correlationId: 'trace1',
  changes: {
    before: { pipeline_name: 'До' },
    after: { pipeline_name: '<script>alert(1)</script>' },
  },
};
beforeEach(() => {
  vi.resetAllMocks();
  context.roles = ['ADMIN'];
  vi.mocked(auditApi.list).mockResolvedValue({
    content: [event],
    page: 0,
    size: 20,
    totalElements: 21,
    totalPages: 2,
  });
});
it('restricts journal to ADMIN even with legacy permission', () => {
  expect(canAccessPath('/audit', ['page.audit'], ['DWH'])).toBe(false);
  context.roles = ['DWH'];
  render(<AuditPage />);
  expect(screen.getByRole('alert')).toHaveTextContent('только администратору');
  expect(auditApi.list).not.toHaveBeenCalled();
});
it('opens escaped changes and correlation details', async () => {
  const { container } = render(<AuditPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Подробности события 1' }));
  expect(screen.getByText('До')).toBeInTheDocument();
  expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
  expect(container.querySelector('script')).toBeNull();
  expect(screen.getByText('trace1')).toBeInTheDocument();
});
it('applies exact actor/object filters and resets page', async () => {
  render(<AuditPage />);
  await screen.findByText('admin');
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
  await waitFor(() =>
    expect(vi.mocked(auditApi.list).mock.lastCall?.[0].get('page')).toBe('1'),
  );
  fireEvent.change(screen.getByLabelText('Пользователь'), { target: { value: 'admin' } });
  fireEvent.change(screen.getByLabelText('ID объекта'), { target: { value: 'p1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Применить' }));
  await waitFor(() => {
    const params = vi.mocked(auditApi.list).mock.lastCall?.[0];
    expect(params?.get('page')).toBe('0');
    expect(params?.get('actor')).toBe('admin');
    expect(params?.get('targetId')).toBe('p1');
  });
});
it('shows a recoverable load failure', async () => {
  vi.mocked(auditApi.list).mockRejectedValueOnce(new Error('unavailable'));
  render(<AuditPage />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Обновить' }));
  await screen.findByText('admin');
  expect(screen.queryByRole('alert')).toBeNull();
});
it('does not request an inverted period', async () => {
  render(<AuditPage />);
  await screen.findByText('admin');
  fireEvent.change(screen.getByLabelText('С', { exact: true }), {
    target: { value: '2026-10-28T10:00' },
  });
  fireEvent.change(screen.getByLabelText('По', { exact: true }), {
    target: { value: '2026-10-27T10:00' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Применить' }));
  expect(screen.getByRole('alert')).toHaveTextContent('раньше');
  expect(auditApi.list).toHaveBeenCalledTimes(1);
});
