import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/api/apiClient';
import { loadPipelineSummaries, usePipelineSummaries } from './pipelineSummaries';
vi.mock('../../../shared/api/apiClient', () => ({apiClient: {get: vi.fn()}}));
beforeEach(() => vi.clearAllMocks());
it('batches deduplicated IDs in bounded requests instead of querying every pipeline', async () => {
  vi.mocked(apiClient.get).mockResolvedValue([]);
  const signal = new AbortController().signal;
  await loadPipelineSummaries([...Array.from({length: 101}, (_, i) => String(i)), '1'], signal);
  expect(apiClient.get).toHaveBeenCalledTimes(2);
  const calls = vi.mocked(apiClient.get).mock.calls;
  expect(new URLSearchParams(calls[0][0].split('?')[1]).get('ids')?.split(',')).toHaveLength(100);
  expect(new URLSearchParams(calls[1][0].split('?')[1]).get('ids')).toBe('100');
  expect(calls[0][1]).toBe(signal);
});
it('aborts the previous page and ignores its late response', async () => {
  let resolveOld!: (data: unknown) => void;
  vi.mocked(apiClient.get).mockImplementationOnce(() => new Promise(resolve => {resolveOld = resolve;}));
  vi.mocked(apiClient.get).mockResolvedValueOnce([{id: 'new', consecutiveFailures: 3}]);
  const hook = renderHook(({ids}) => usePipelineSummaries(ids, 0), {initialProps: {ids: ['old']}});
  const oldSignal = vi.mocked(apiClient.get).mock.calls[0][1]!;
  hook.rerender({ids: ['new']});
  await waitFor(() => expect(hook.result.current.data.new?.consecutiveFailures).toBe(3));
  expect(oldSignal.aborted).toBe(true);
  await act(async () => resolveOld([{id: 'old', consecutiveFailures: 10}]));
  expect(hook.result.current.data.old).toBeUndefined();
  expect(hook.result.current.data.new?.consecutiveFailures).toBe(3);
  hook.unmount();
});
it('reports summary errors separately from an empty healthy result', async () => {
  vi.mocked(apiClient.get).mockRejectedValue(new Error('offline'));
  const hook = renderHook(() => usePipelineSummaries(['p1'], 0));
  await waitFor(() => expect(hook.result.current.error).toBe(true));
  expect(hook.result.current.loading).toBe(false);
  expect(hook.result.current.data).toEqual({});
});

it('refreshes monitoring without clearing the last successful values', async () => {
  vi.useFakeTimers();
  try {
    vi.mocked(apiClient.get).mockResolvedValue([{id: 'p1', consecutiveFailures: 2}]);
    const hook = renderHook(() => usePipelineSummaries(['p1'], 0));
    await act(async () => {});
    expect(hook.result.current.data.p1?.consecutiveFailures).toBe(2);
    vi.mocked(apiClient.get).mockResolvedValue([{id: 'p1', consecutiveFailures: 3}]);
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(hook.result.current.data.p1?.consecutiveFailures).toBe(3);
    hook.unmount();
  } finally { vi.useRealTimers(); }
});
