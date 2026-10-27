import { ApiError } from '../../../shared/api/ApiError';
import { schedulesApi } from './schedulesApi';

export type ScheduleSummary = { status: 'ready'; cron: string } | { status: 'absent' | 'error' };

// Shared across page changes: aborted requests may still be in flight in apiClient.
let inFlight = 0;
const waiters: Array<() => void> = [];
async function acquire() {
  if (inFlight < 4) { inFlight++; return; }
  await new Promise<void>(resolve => waiters.push(resolve));
}
function release() {
  const next = waiters.shift();
  if (next) next();
  else inFlight--;
}

// Only the current page is requested, with at most four dispatcher calls in flight.
export async function loadScheduleSummaries(ids: string[], signal: AbortSignal) {
  const results: Record<string, ScheduleSummary> = {};
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, ids.length) }, async () => {
    while (!signal.aborted && next < ids.length) {
      const id = ids[next++];
      await acquire();
      try {
        if (signal.aborted) continue;
        const schedule = await schedulesApi.getSchedule(id);
        results[id] = { status: 'ready', cron: schedule.cronExpression };
      } catch (error) {
        results[id] = { status: error instanceof ApiError && error.status === 404 ? 'absent' : 'error' };
      } finally {
        release();
      }
    }
  }));
  return results;
}
