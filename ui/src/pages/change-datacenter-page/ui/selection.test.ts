import { describe, expect, it, vi } from 'vitest';
import { collectMatchingPipelines, prepareSchedules, restoreSchedule, stopSchedule } from './selection';
import { ApiError } from '../../../shared/api/ApiError';

const params = { pagination: { page: 7, size: 20 }, filters: { clientFrom: 'A' }, sort: null };
const row = (id: string) => ({ id, pipelineName: id });
const page = (ids: string[], total = 201) => ({ content: ids.map(row), totalElements: total });
const ids = Array.from({ length: 201 }, (_, i) => String(i));
describe('selection snapshot', () => {
  it('collects every page with filters and a bounded stable sort, then verifies membership', async () => {
    const fetch = vi.fn(async (p) => page(ids.slice((p.pagination.page - 1) * 200, p.pagination.page * 200)));
    const result = await collectMatchingPipelines(params, 201, fetch, new AbortController().signal);
    expect(result.map(p => p.id)).toEqual(ids);
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(fetch.mock.calls[0][0]).toEqual({ ...params, pagination: { page: 1, size: 200 }, sort: { field: 'id', order: 'asc' } });
  });
  it('rejects changed totals and duplicate IDs instead of accepting a partial selection', async () => {
    await expect(collectMatchingPipelines(params, 201, async () => page(['a'], 200), new AbortController().signal)).rejects.toThrow();
    await expect(collectMatchingPipelines(params, 2, async () => page(['a', 'a'], 2), new AbortController().signal)).rejects.toThrow();
  });
  it('detects membership changes even when the total is unchanged', async () => {
    let call = 0;
    await expect(collectMatchingPipelines(params, 1, async () => page([String(call++)], 1), new AbortController().signal)).rejects.toThrow();
  });
  it('discards interrupted or failed collection without returning partial IDs', async () => {
    const controller = new AbortController();
    const fetch = vi.fn(async () => { controller.abort(); return page(ids.slice(0, 200)); });
    await expect(collectMatchingPipelines(params, 201, fetch, controller.signal)).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
    await expect(collectMatchingPipelines(params, 201, async () => { throw new Error('offline'); }, new AbortController().signal)).rejects.toThrow('offline');
  });
});
describe('schedule preparation', () => {
  it('only considers 404 an absent schedule', async () => {
    const schedules = await prepareSchedules(['a', 'b'], async id => {
      if (id === 'a') throw new ApiError('missing', 404);
      return { cronExpression: '* * * * *' };
    });
    expect([...schedules]).toEqual([['b', '* * * * *']]);
    for (const status of [403, 500, undefined]) {
      await expect(prepareSchedules(['a'], async () => { throw new ApiError('failure', status); })).rejects.toThrow('failure');
    }
  });
  it('rejects empty IDs so empty selection cannot start the wizard', async () => {
    const get = vi.fn();
    await expect(prepareSchedules([], get)).rejects.toThrow();
    expect(get).not.toHaveBeenCalled();
  });
});

it('restores missing schedules, accepts already restored schedules, and preserves conflicting schedules', async () => {
  const create = vi.fn(async () => {});
  await restoreSchedule('a', 'cron', async () => ({ cronExpression: 'cron' }), create);
  expect(create).not.toHaveBeenCalled();
  await restoreSchedule('a', 'cron', async () => { throw new ApiError('missing', 404); }, create);
  expect(create).toHaveBeenCalledWith({ pipelineId: 'a', cronExpression: 'cron' });
  create.mockClear();
  await expect(restoreSchedule('a', 'cron', async () => ({ cronExpression: 'changed' }), create)).rejects.toThrow();
  await expect(restoreSchedule('a', 'cron', async () => { throw new ApiError('offline', 500); }, create)).rejects.toThrow();
  expect(create).not.toHaveBeenCalled();
});

it('accepts already deleted schedules on retry but propagates other deletion errors', async () => {
  await expect(stopSchedule('a', async () => { throw new ApiError('absent', 404); })).resolves.toBeUndefined();
  await expect(stopSchedule('a', async () => { throw new ApiError('denied', 403); })).rejects.toThrow('denied');
});
