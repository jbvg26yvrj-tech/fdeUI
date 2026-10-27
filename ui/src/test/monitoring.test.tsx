import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { sourceInstant, sessionLogsLink, type AnalyticsSession } from '../features/analytics/api';
import { useRead } from '../features/analytics/useRead';
import {
  connectionWindow,
  connectionPayload,
  safeDraft,
  safeLogQuery,
  logWindow,
  type LokiConnection,
} from '../features/logs/api';
import { canAccessPath } from '../shared/lib/access';
describe('monitoring contracts', () => {
  it('does not derive session instant from browser-local timezone', () => {
    expect(sourceInstant('2026-10-27T12:00:00', 'Europe/Moscow').toISOString()).toBe(
      '2026-10-27T09:00:00.000Z',
    );
    expect(
      sessionLogsLink(
        { id: 's&x', pipelineId: 'p', startDt: '2026-10-27T12:00:00' } as AnalyticsSession,
        'Europe/Moscow',
      ),
    ).toContain('sessionId=s%26x');
  });
  it('rejects nonexistent or ambiguous source wall times', () => {
    expect(() => sourceInstant('2026-03-29T02:30:00', 'Europe/Berlin')).toThrow();
    expect(() => sourceInstant('2026-10-25T02:30:00', 'Europe/Berlin')).toThrow();
  });
  it('keeps the first bounded historical log window', () => {
    expect(logWindow('2026-01-01T12:00:00Z', 24, new Date('2026-10-27T12:00:00Z'))).toEqual({
      from: '2026-01-01T11:55:00.000Z',
      to: '2026-01-02T11:55:00.000Z',
    });
  });
  it('never forwards a URL, tenant or LogQL from route parameters', () => {
    const query = safeLogQuery(
      new URLSearchParams(
        'connectionId=c&sessionId=s&pipelineId=p&baseUrl=http://evil&query=%7B%7D&tenantId=x&secret=hidden',
      ),
    );
    expect(query.toString()).toBe('connectionId=c&sessionId=s&pipelineId=p');
  });
  it('does not refill saved secrets and omits a blank replacement', () => {
    const draft = safeDraft({
      id: '1',
      secret: 'unexpected',
      secretConfigured: true,
    } as LokiConnection);
    expect(draft.secret).toBe('');
    expect(connectionPayload(draft)).not.toHaveProperty('secret');
    expect(connectionPayload({ ...draft, clearSecret: true }).clearSecret).toBe(true);
  });
  it('keeps settings admin-only and analytics/logs explicit', () => {
    expect(canAccessPath('/settings/loki', ['page.logs'], [])).toBe(false);
    expect(canAccessPath('/analytics', [], [])).toBe(false);
    expect(canAccessPath('/logs', [], ['DWH'])).toBe(false);
    expect(canAccessPath('/analytics/pipelines/id', ['page.analytics'], [])).toBe(true);
    expect(canAccessPath('/logs', ['page.logs'], [])).toBe(true);
  });
  it('ignores a stale response and preserves last success on failure', async () => {
    let resolveFirst!: (n: number) => void;
    const first = new Promise<number>(resolve => {
      resolveFirst = resolve;
    });
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) =>
        useRead(key, () =>
          key === 'first'
            ? first
            : key === 'second'
              ? Promise.resolve(2)
              : Promise.reject(new Error('unavailable')),
        ),
      { initialProps: { key: 'first' } },
    );
    rerender({ key: 'second' });
    await waitFor(() => expect(result.current.data).toBe(2));
    await act(async () => resolveFirst(1));
    expect(result.current.data).toBe(2);
    rerender({ key: 'third' });
    await waitFor(() => expect(result.current.error).toBe('unavailable'));
    expect(result.current.data).toBe(2);
  });
});

it('keeps a historical window when changing connections, shrinking only its end', () => {
  expect(connectionWindow('2026-01-01T11:55:00.000Z', '2026-01-02T11:55:00.000Z', 1, null)).toEqual(
    { from: '2026-01-01T11:55:00.000Z', to: '2026-01-01T12:55:00.000Z' },
  );
});
