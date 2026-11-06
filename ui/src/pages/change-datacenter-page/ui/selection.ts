import type { TableParams } from '../../../shared/ui/table/types/type';
import { ApiError } from '../../../shared/api/ApiError';

// Offset pagination has no server snapshot token. Verify a second complete pass;
// never silently accept duplicate IDs, changing counts or changing membership.
export async function collectMatchingPipelines<T extends { id: string }>(
  params: TableParams,
  expectedTotal: number,
  fetchPage: (params: TableParams) => Promise<{ content: T[]; totalElements: number }>,
  signal: AbortSignal,
): Promise<T[]> {
  const changed = () => new Error('Список маршрутов изменился. Обновите таблицу и повторите выбор.');
  if (!Number.isSafeInteger(expectedTotal) || expectedTotal < 0) throw changed();
  const scan = async () => {
    const result = new Map<string, T>();
    for (let page = 1; page <= Math.ceil(expectedTotal / 200); page++) {
      signal.throwIfAborted();
      const response = await fetchPage({ ...params, pagination: { page, size: 200 }, sort: { field: 'id', order: 'asc' } });
      signal.throwIfAborted();
      const expectedSize = Math.min(200, expectedTotal - (page - 1) * 200);
      if (response.totalElements !== expectedTotal || response.content.length !== expectedSize) throw changed();
      for (const item of response.content) {
        if (!item.id || result.has(item.id)) throw changed();
        result.set(item.id, item);
      }
    }
    signal.throwIfAborted();
    return result;
  };
  const first = await scan();
  const verified = await scan();
  if (first.size !== verified.size || [...first.keys()].some(id => !verified.has(id))) throw changed();
  return [...first.values()];
}

export async function prepareSchedules(
  ids: readonly string[],
  getSchedule: (id: string) => Promise<{ cronExpression?: string }>,
): Promise<Map<string, string>> {
  if (!ids.length) throw new Error('Выберите маршруты');
  const schedules = new Map<string, string>();
  for (const id of ids) {
    try {
      const schedule = await getSchedule(id);
      if (schedule?.cronExpression) schedules.set(id, schedule.cronExpression);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error;
    }
  }
  return schedules;
}

export async function restoreSchedule(
  id: string,
  cron: string,
  getSchedule: (id: string) => Promise<{ cronExpression?: string }>,
  createSchedule: (data: { pipelineId: string; cronExpression: string }) => Promise<unknown>,
): Promise<void> {
  let existing: { cronExpression?: string };
  try {
    existing = await getSchedule(id);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
    await createSchedule({ pipelineId: id, cronExpression: cron });
    return;
  }
  if (existing.cronExpression !== cron) {
    throw new Error('Расписание изменено другим пользователем. Проверьте его перед восстановлением.');
  }
}

export async function stopSchedule(id: string, deleteSchedule: (id: string) => Promise<void>): Promise<void> {
  try {
    await deleteSchedule(id);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
  }
}
