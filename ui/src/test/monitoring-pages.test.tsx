import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lokiApi, type LokiConnection } from '../features/logs/api';
import LogsPage from '../pages/logs-page/LogsPage';
import LokiSettingsPage from '../pages/settings-page/LokiSettingsPage';
vi.mock('../shared/hooks/useUserContext', () => ({
  useUserContext: () => ({ roles: ['ADMIN'], isLoading: false }),
}));
vi.mock('../features/logs/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../features/logs/api')>();
  return {
    ...actual,
    lokiApi: { connections: vi.fn(), query: vi.fn(), list: vi.fn(), save: vi.fn(), test: vi.fn() },
  };
});
const connection = {
  id: 'loki',
  name: 'Corporate Loki',
  description: '',
  enabled: true,
  baseUrl: 'https://loki.example',
  authType: 'BEARER',
  username: '',
  tenantId: '',
  labels: { app: 'fde' },
  sessionField: 'sessionId',
  pipelineField: 'pipelineId',
  levelField: 'level',
  correlationMode: 'JSON',
  datacenter: '',
  timeoutSeconds: 10,
  limit: 500,
  maxHours: 24,
  secretConfigured: true,
} as LokiConnection;
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(lokiApi.connections).mockResolvedValue([
    {
      id: 'loki',
      name: 'Corporate Loki',
      datacenter: '',
      sessionField: 'sessionId',
      maxHours: 24,
      limit: 500,
    },
  ]);
  vi.mocked(lokiApi.list).mockResolvedValue([connection]);
});
describe('monitoring pages', () => {
  it('shows an empty successful query, and an error instead of false empty after failure', async () => {
    vi.mocked(lokiApi.query).mockResolvedValue({ entries: [], truncated: false, message: null });
    render(
      <MemoryRouter>
        <LogsPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Найти логи' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Найти логи' }));
    expect(await screen.findByText('Нет строк в выбранном окне.')).toBeInTheDocument();
    vi.mocked(lokiApi.query).mockRejectedValue(new Error('Источник недоступен'));
    fireEvent.change(screen.getByLabelText('Текст сообщения'), { target: { value: 'failed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Найти логи' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Источник недоступен');
    expect(screen.queryByText('Нет строк в выбранном окне.')).not.toBeInTheDocument();
  });
  it('renders logs as text and warns about truncated output', async () => {
    vi.mocked(lokiApi.query).mockResolvedValue({
      entries: [
        {
          timestamp: '2026-10-27T09:00:00Z',
          line: '<script>alert(1)</script>',
          labels: { level: 'ERROR' },
        },
      ],
      truncated: true,
      message: null,
    });
    render(
      <MemoryRouter>
        <LogsPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Найти логи' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Найти логи' }));
    expect(await screen.findByText('<script>alert(1)</script>')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('результат усечён');
    expect(document.querySelector('script')).toBeNull();
  });
  it('does not refill secrets and tests draft without saving', async () => {
    vi.mocked(lokiApi.test).mockResolvedValue({
      success: true,
      message: 'Соединение установлено',
      checkedAt: '2026-10-27T12:00:00Z',
    });
    render(
      <MemoryRouter>
        <LokiSettingsPage />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: /Corporate Loki/ }));
    expect(screen.getByLabelText(/Токен/)).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Проверить подключение' }));
    await waitFor(() => expect(lokiApi.test).toHaveBeenCalled());
    expect(lokiApi.save).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Настройки не сохранены');
  });
});

it('requires explicit choice between multiple connections and preserves the old-session window after search', async () => {
  vi.mocked(lokiApi.connections).mockResolvedValue([
    { id: 'one', name: 'One', datacenter: '', sessionField: 'sessionId', maxHours: 24, limit: 500 },
    { id: 'two', name: 'Two', datacenter: '', sessionField: 'sessionId', maxHours: 1, limit: 500 },
  ]);
  vi.mocked(lokiApi.query).mockResolvedValue({ entries: [], truncated: false, message: null });
  render(
    <MemoryRouter initialEntries={['/logs?sessionId=session&start=2026-01-01T12%3A00%3A00Z']}>
      <LogsPage />
    </MemoryRouter>,
  );
  await screen.findByRole('option', { name: 'Two' });
  expect(screen.getByLabelText('Подключение')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Найти логи' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Подключение'), { target: { value: 'one' } });
  fireEvent.click(screen.getByRole('button', { name: 'Найти логи' }));
  await screen.findByText('Нет строк в выбранном окне.');
  fireEvent.change(screen.getByLabelText('Подключение'), { target: { value: 'two' } });
  expect(screen.getByLabelText('Начало (ISO с зоной)')).toHaveValue('2026-01-01T11:55:00.000Z');
  expect(screen.getByLabelText('Конец (ISO с зоной)')).toHaveValue('2026-01-01T12:55:00.000Z');
});
