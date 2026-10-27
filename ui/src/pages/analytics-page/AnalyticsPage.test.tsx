import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import AnalyticsPage from './AnalyticsPage';
import { apiClient } from '../../shared/api/apiClient';
vi.mock('../../shared/api/apiClient', () => ({ apiClient: { get: vi.fn() } }));
function Location() {
  return <output aria-label='Адрес'>{useLocation().search}</output>;
}
beforeEach(() => {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url === '/analytics/config') return { sourceTimeZone: 'Europe/Moscow', testStand: false };
    if (url.startsWith('/analytics/pipelines?')) return { content: [], totalPages: 2 };
    if (url.startsWith('/analytics/sessions?'))
      return { content: [], totalPages: 0, totalElements: 0 };
    return {
      summary: { sessions: 1, errorRate: null, active: 1, receivedBytes: 0, sentBytes: 0 },
      series: [],
      warnings: [],
      bucket: 'hour',
      generatedAt: '2026-10-27T12:00:00',
      sourceTimeZone: 'Europe/Moscow',
    };
  });
});
it('keeps source wall time and API status codes while displaying translated choices', async () => {
  render(
    <MemoryRouter
      initialEntries={['/analytics?from=2026-10-27T09:00:00&to=2026-10-27T12:00:00&pipelineId=p-1']}
    >
      <AnalyticsPage />
      <Location />
    </MemoryRouter>,
  );
  await screen.findByText('Найдено сессий: 0');
  fireEvent.change(screen.getByLabelText('Статус'), { target: { value: 'FAILED' } });
  expect(screen.getByRole('option', { name: 'Ошибка' })).toHaveValue('FAILED');
  expect(screen.getByLabelText('Адрес')).toHaveTextContent('status=FAILED');
  expect(screen.getByLabelText('Адрес')).toHaveTextContent('pipelineId=p-1');
  expect(screen.getByLabelText('Начало')).toHaveValue('2026-10-27T09:00');
  expect(screen.getByLabelText('Справка об аналитике')).toBeInTheDocument();
  expect(document.querySelectorAll('.monitor-metrics > div')).toHaveLength(5);
  fireEvent.change(screen.getByPlaceholderText('Название или ID пайплайна'), {
    target: { value: 'pipeline-id' },
  });
  await waitFor(() =>
    expect(apiClient.get).toHaveBeenCalledWith(
      '/analytics/pipelines?query=pipeline-id&page=0&size=100',
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Следующие потоки' }));
  await waitFor(() =>
    expect(apiClient.get).toHaveBeenCalledWith(
      '/analytics/pipelines?query=pipeline-id&page=1&size=100',
    ),
  );
});
