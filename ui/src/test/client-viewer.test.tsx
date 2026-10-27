import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { usePermissions } from '../shared/hooks/usePermissions';
import { Sidebar } from '../shared/ui/layout/Sidebar';
import { canAccessPath } from '../shared/lib/access';
import { ScheduleSection } from '../features/pipeline/components/ScheduleSection';
import { ScheduleSummaryLabel } from '../features/pipeline/components/ScheduleSummaryLabel';
import { schedulesApi } from '../features/pipeline/api/schedulesApi';
import { loadScheduleSummaries } from '../features/pipeline/api/scheduleSummaries';
import { ApiError } from '../shared/api/ApiError';

const state = vi.hoisted(() => ({ roles: [] as string[] }));
vi.mock('../shared/hooks/useUserContext', () => ({ useUserContext: () => ({ roles: state.roles, isLoading: false, hasAnyPermission: () => true }) }));
vi.mock('../features/pipeline/api/schedulesApi', () => ({ schedulesApi: { getSchedule: vi.fn(), createSchedule: vi.fn(), updateSchedule: vi.fn(), deleteSchedule: vi.fn() } }));

function context(admin = false) {
  state.roles = admin ? ['ADMIN'] : ['DWH_VIEWER'];
  sessionStorage.setItem('userContext', JSON.stringify({ user: { id: 'viewer', login: 'viewer' }, roleCodes: state.roles,
    resourceCodes: ['api.pipelines.get', 'api.sessions.get', 'api.sessions.list', 'api.schedules.get', 'api.pipelines.create', 'api.pipelines.update', 'api.pipelines.delete', 'api.triggers.manual', 'api.triggers.stop', 'api.schedules.create', 'api.schedules.update', 'api.schedules.delete'], settings: {}, rlsFilters: {} }));
}
beforeEach(() => { vi.clearAllMocks(); context(); });

it('ignores legacy write grants for viewers and grants all mutation controls only to ADMIN', () => {
  const viewer = renderHook(() => usePermissions());
  expect(viewer.result.current.permissions.canPipelineDetails).toBe(true);
  expect(viewer.result.current.permissions.canScheduleGet).toBe(true);
  const mutations = ['canPipelineCreate', 'canPipelineUpdate', 'canPipelineDelete', 'canTriggerManual', 'canTriggerStop', 'canScheduleCreate', 'canScheduleUpdate', 'canScheduleDelete'] as const;
  for (const key of mutations) expect(viewer.result.current.permissions[key]).toBe(false);
  viewer.unmount(); context(true);
  const admin = renderHook(() => usePermissions());
  for (const key of mutations) expect(admin.result.current.permissions[key]).toBe(true);
});

it('does not expose admin routes or links even with legacy page grants', () => {
  const view = render(<MemoryRouter><Sidebar /></MemoryRouter>);
  expect(screen.getAllByRole('link').map(link => link.textContent)).toEqual(['Пайплайны', 'Сессии', 'Аналитика', 'О системе']);
  for (const path of ['/logs', '/permissions', '/settings/ldap', '/change-datacenter']) {
    expect(canAccessPath(path, ['page.logs', 'page.permissions', 'page.settings', 'api.pipelines.update'], state.roles)).toBe(false);
  }
  context(true); view.rerender(<MemoryRouter><Sidebar /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Логи' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Права доступа' })).toBeInTheDocument();
});

it('shows current cron, explicit disabled state and supplied timezone without viewer editing', async () => {
  vi.mocked(schedulesApi.getSchedule).mockResolvedValue({ pipelineId: 'p', cronExpression: '0 */5 * * * ?', active: false, timezone: 'Europe/Moscow' });
  render(<ScheduleSection pipelineId='p' />);
  expect(await screen.findByText('0 */5 * * * ?')).toBeInTheDocument();
  expect(screen.getByText('Приостановлено')).toBeInTheDocument();
  expect(screen.getByText('Часовой пояс: Europe/Moscow')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Редактировать' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Удалить' })).not.toBeInTheDocument();
});

it('lets ADMIN open the schedule editor and save a change', async () => {
  context(true);
  const schedule = { pipelineId: 'p', cronExpression: '0 */5 * * * ?', active: true };
  vi.mocked(schedulesApi.getSchedule).mockResolvedValue(schedule);
  vi.mocked(schedulesApi.updateSchedule).mockResolvedValue({ ...schedule, cronExpression: '0 0 * * * ?' });
  render(<ScheduleSection pipelineId='p' />);
  fireEvent.click(await screen.findByRole('button', { name: 'Редактировать' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '0 0 * * * ?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
  expect(await screen.findByText('Каждый час')).toBeInTheDocument();
  expect(schedulesApi.updateSchedule).toHaveBeenCalledWith('p', { cronExpression: '0 0 * * * ?' });
  expect(screen.getByText('Часовой пояс: не указан диспетчером')).toBeInTheDocument();
});

it('distinguishes a failed schedule request from absence and allows retry', async () => {
  vi.mocked(schedulesApi.getSchedule).mockRejectedValueOnce(new ApiError('unavailable', 503)).mockRejectedValueOnce(new ApiError('missing', 404));
  render(<ScheduleSection pipelineId='p' />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить');
  expect(screen.queryByText('Расписание не установлено')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
  expect(await screen.findByText('Расписание не установлено')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Создать расписание' })).not.toBeInTheDocument();
});

it('bounds schedule concurrency, stops pending page requests on abort and preserves errors', async () => {
  let active = 0; let maximum = 0;
  vi.mocked(schedulesApi.getSchedule).mockImplementation(async id => {
    active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, 1)); active--;
    if (id === '1') throw new ApiError('missing', 404);
    if (id === '2') throw new ApiError('failed', 503);
    return { pipelineId: id, cronExpression: 'cron' };
  });
  const results = await loadScheduleSummaries(Array.from({ length: 12 }, (_, i) => String(i)), new AbortController().signal);
  expect(maximum).toBe(4); expect(schedulesApi.getSchedule).toHaveBeenCalledTimes(12);
  expect(results['1'].status).toBe('absent'); expect(results['2'].status).toBe('error');
  vi.mocked(schedulesApi.getSchedule).mockClear();
  const controller = new AbortController();
  const loading = loadScheduleSummaries(Array.from({ length: 20 }, (_, i) => String(i)), controller.signal);
  await new Promise(resolve => setTimeout(resolve, 0));
  controller.abort();
  const replacement = loadScheduleSummaries(['a', 'b', 'c', 'd'], new AbortController().signal);
  await Promise.all([loading, replacement]);
  expect(maximum).toBe(4);
  expect(schedulesApi.getSchedule).toHaveBeenCalledTimes(8);
});

it('renders separate loading, absent and error summaries for cards and table', () => {
  const view = render(<ScheduleSummaryLabel />);
  expect(screen.getByText('Загрузка…')).toBeInTheDocument();
  view.rerender(<ScheduleSummaryLabel summary={{ status: 'absent' }} />);
  expect(screen.getByText('Не задано')).toBeInTheDocument();
  view.rerender(<ScheduleSummaryLabel summary={{ status: 'error' }} />);
  expect(screen.getByText('Не удалось загрузить')).toBeInTheDocument();
});
