import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useTableData } from '../shared/ui/table/hooks/useTableData';
import { useTableState } from '../shared/ui/table/hooks/useTableState';
import { SessionCard } from '../features/pipeline-sessions/ui/PipelinesSessionCard';
vi.mock('../shared/hooks/usePermissions', () => ({ usePermissions: () => ({ permissions: {}, isLoading: false }) }));
vi.mock('../shared/hooks/useTablePersist', () => ({ useTablePersist: () => ({ savedState: null, isLoading: false, saveState: vi.fn(), hasSavedState: false }) }));
vi.mock('../shared/api/userContextApi', () => ({ userContextApi: { getCachedContext: () => ({ user: { id: 'navigation-test' } }) } }));
const params = { pagination: { page: 2, size: 10 }, filters: { pipelineName: 'test' }, sort: { field: 'createdAt', order: 'desc' as const } };
describe('list return state', () => {
  it('remounts on page two with the same filter and sort and refreshes that page', async () => {
    const fetchData = vi.fn(async (p: any) => ({ data: [{ id: 'p' }], meta: { pagination: { ...p.pagination, page: p.pagination.page - 1, totalPages: 3, totalElements: 30 }, filters: p.filters, sort: p.sort } }));
    const first = renderHook(() => useTableData({ resourceCode: 'navigation-page-test', fetchData }));
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    act(() => first.result.current.handleTableChange(params));
    await waitFor(() => expect(fetchData).toHaveBeenLastCalledWith(params));
    first.unmount();
    const second = renderHook(() => useTableData({ resourceCode: 'navigation-page-test', fetchData }));
    await waitFor(() => expect(second.result.current.isLoading).toBe(false));
    expect(fetchData).toHaveBeenLastCalledWith(params);
    await act(async () => second.result.current.loadServerData());
    expect(fetchData).toHaveBeenLastCalledWith(params);
  });
  it('hydrates asynchronous sort and filters without dropping restored page', () => {
    const hook = renderHook(({ filters, sort }) => useTableState({ initialFilters: filters, initialSort: sort, serverMeta: { pagination: { page: 1, size: 10, totalPages: 3, totalElements: 30 }, filters: {}, sort: null } }), { initialProps: { filters: {} as Record<string, string>, sort: null as typeof params.sort | null } });
    hook.rerender({ filters: params.filters, sort: params.sort });
    expect(hook.result.current.getTableParams()).toEqual(params);
  });
});
describe('session card navigation', () => {
  it('offers a native full-card link and leaves its actions independent', () => {
    const onViewProgress = vi.fn();
    const onStop = vi.fn();
    render(<MemoryRouter><SessionCard session={{ id: 's1', pipelineName: 'Pipeline', status: 'ACTIVE' } as any} permissions={{ canSessionProgressOpen: true, canTriggerStop: true }} onViewProgress={onViewProgress} onStop={onStop} statusDisplayName='Active' /></MemoryRouter>);
    const link = screen.getByRole('link', { name: /Pipeline/ });
    expect(link).toHaveAttribute('href', '/sessions/s1');
    expect(link).toHaveClass('fde-card-link');
    fireEvent.click(screen.getByRole('button'));
    expect(onViewProgress).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Остановить'));
    expect(onStop).toHaveBeenCalledOnce();
    expect(onViewProgress).not.toHaveBeenCalled();
  });
});

it('merges two independently debounced fields in one render batch', () => {
  const changed = vi.fn();
  const hook = renderHook(() => useTableState({ onTableChange: changed }));
  act(() => {
    hook.result.current.handleFilterChange('clientFrom', 'a');
    hook.result.current.handleFilterChange('clientTo', 'b');
  });
  expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ filters: { clientFrom: 'a', clientTo: 'b' } }));
});

it('does not let a slow obsolete request replace the latest page', async () => {
  let resolveOld!: (value: any) => void;
  const response = (id: string, page: number) => ({ data: [{ id }], meta: { pagination: { page, size: 10, totalPages: 3, totalElements: 30 }, filters: {}, sort: null } });
  const fetchData = vi.fn().mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce(response('latest', 1));
  const hook = renderHook(() => useTableData({ resourceCode: 'race-navigation', fetchData }));
  await waitFor(() => expect(fetchData).toHaveBeenCalledOnce());
  act(() => hook.result.current.handleTableChange(params));
  await waitFor(() => expect(hook.result.current.data).toEqual([{ id: 'latest' }]));
  await act(async () => resolveOld(response('old', 0)));
  expect(hook.result.current.data).toEqual([{ id: 'latest' }]);
});

it('keeps query-linked lists in separate page snapshots', async () => {
  const fetchData = vi.fn(async (p: any) => ({ data: [], meta: { pagination: { ...p.pagination, page: p.pagination.page - 1, totalPages: 3, totalElements: 30 }, filters: p.filters, sort: p.sort } }));
  const hook = renderHook(({ search }) => useTableData({ resourceCode: 'query-navigation', navigationSearch: search, fetchData }), { initialProps: { search: '?pipelineId=a' } });
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  act(() => hook.result.current.handleTableChange(params));
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  hook.rerender({ search: '?pipelineId=b' });
  await waitFor(() => expect(fetchData).toHaveBeenLastCalledWith(expect.objectContaining({ pagination: { page: 1, size: 10 } })));
  hook.rerender({ search: '?pipelineId=a' });
  await waitFor(() => expect(fetchData).toHaveBeenLastCalledWith(params));
});

it('omits session navigation without permission', () => {
  render(<MemoryRouter><SessionCard session={{ id: 'hidden', pipelineName: 'Hidden', status: 'SUCCESS' } as any} permissions={{ canSessionProgressOpen: false }} onViewProgress={vi.fn()} statusDisplayName='Success' /></MemoryRouter>);
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

it('preserves a later filter draft while the parent echoes an earlier applied field', () => {
  const hook = renderHook(({ filters }) => useTableState({ initialFilters: filters }), { initialProps: { filters: {} as Record<string, string> } });
  act(() => {
    hook.result.current.setInputValues({ clientFrom: 'first', clientTo: 'still typing' });
    hook.result.current.handleFilterChange('clientFrom', 'first');
  });
  hook.rerender({ filters: { clientFrom: 'first' } });
  expect(hook.result.current.inputValues.clientTo).toBe('still typing');
});

it('hydrates view mode after identity arrives and isolates another user and resource', async () => {
  const { userContextApi } = await import('../shared/api/userContextApi');
  const { useViewMode } = await import('../shared/hooks/useViewMode');
  const context = vi.spyOn(userContextApi, 'getCachedContext').mockReturnValue(null);
  sessionStorage.setItem('tableDisplayModes:alice', JSON.stringify({ pipelines: 'cards', sessions: 'table' }));
  const hook = renderHook(({ resource }) => useViewMode(resource), { initialProps: { resource: 'pipelines' } });
  expect(hook.result.current.displayMode).toBe('table');
  context.mockReturnValue({ user: { id: 'alice' } } as any);
  hook.rerender({ resource: 'pipelines' });
  expect(hook.result.current.displayMode).toBe('cards');
  hook.rerender({ resource: 'sessions' });
  expect(hook.result.current.displayMode).toBe('table');
  context.mockReturnValue({ user: { id: 'bob' } } as any);
  hook.rerender({ resource: 'pipelines' });
  expect(hook.result.current.displayMode).toBe('table');
  context.mockRestore();
});

it('restores scroll and visited item only after the list finishes loading', async () => {
  const { useListReturn } = await import('../shared/hooks/useListReturn');
  const { listStateKey, writeListState } = await import('../shared/hooks/listReturnState');
  writeListState(listStateKey('scroll-test', ''), { lastId: 'visited', scrollY: 420, mainScrollTop: 80 });
  const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const main = document.createElement('main');
  document.body.append(main);
  const hook = renderHook(({ loading }) => useListReturn('scroll-test', loading), { initialProps: { loading: true }, wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> });
  expect(scroll).not.toHaveBeenCalled();
  hook.rerender({ loading: false });
  await waitFor(() => expect(scroll).toHaveBeenCalledWith(0, 420));
  expect(main.scrollTop).toBe(80);
  expect(hook.result.current.lastId).toBe('visited');
  main.remove();
  scroll.mockRestore();
});
