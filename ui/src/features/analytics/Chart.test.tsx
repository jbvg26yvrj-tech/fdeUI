import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Chart, statusSeries } from '../../pages/analytics-page/AnalyticsPage';
import type { Totals } from './api';
const totals: Totals = {
  sessions: 0,
  success: 0,
  failed: 0,
  aborted: 0,
  active: 0,
  prepare: 0,
  unknown: 0,
  errorRate: null,
  receivedFiles: 0,
  receivedBytes: 0,
  sentFiles: 0,
  sentBytes: 0,
  skippedFiles: 0,
  failedFiles: 0,
  unknownSizeFiles: 0,
};
describe('analytics charts', () => {
  it('lets keyboard users select a translated status with its unchanged API value', () => {
    const select = vi.fn();
    render(
      <Chart
        title='Запуски'
        rows={[{ ...totals, time: '2026-10-27T12:00:00', success: 4 }]}
        metrics={statusSeries}
        stacked
        onSelect={select}
      />,
    );
    const bar = screen.getByRole('button', { name: /2026-10-27 12:00:00: Успешно 4/ });
    fireEvent.keyDown(bar, { key: 'Enter' });
    expect(select).toHaveBeenCalledWith('2026-10-27T12:00:00', 'SUCCESS');
    expect(screen.getByText('4', { selector: 'text' })).toBeInTheDocument();
  });
  it('distinguishes absent completed sessions from measured zero', () => {
    const { rerender } = render(
      <Chart
        title='Ошибки'
        rows={[{ ...totals, time: '2026-10-27T12:00:00' }]}
        metrics={[{ key: 'errorRate', name: 'Ошибки', color: '#000' }]}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('Нет завершённых сессий.')).toBeInTheDocument();
    rerender(
      <Chart
        title='Ошибки'
        rows={[{ ...totals, errorRate: 0, time: '2026-10-27T12:00:00' }]}
        metrics={[{ key: 'errorRate', name: 'Ошибки', color: '#000' }]}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('Все значения за период равны нулю.')).toBeInTheDocument();
    expect(screen.queryByText('Нет завершённых сессий.')).not.toBeInTheDocument();
  });
});
