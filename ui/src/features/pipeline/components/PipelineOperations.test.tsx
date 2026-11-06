import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PipelineOperations } from './PipelineOperations';
const summary = { id: 'p1', consecutiveFailures: 2, today: {sentFiles: 3, sentBytes: 1024, receivedFiles: 4, receivedBytes: 2048, unknownSizeFiles: 1}, agreedVolumeBytes: 4096, agreedVolumePeriod: 'DAY' as const, periodSentBytes: 1024, periodUnknownSizeFiles: 1, sourceTimeZone: 'Europe/Moscow' };
const show = (props = {}) => render(<MemoryRouter><PipelineOperations pipelineId='p1' canSessions returnTo='/pipelines' summary={summary} {...props} /></MemoryRouter>);
it('links complete and failed history, daily transfer totals and incomplete agreement usage', () => {
  show();
  expect(screen.getByRole('link', {name: 'Сессии →'})).toHaveAttribute('href', expect.stringContaining('pipelineId=p1'));
  expect(screen.getByRole('link', {name: /2 ошибки подряд/})).toHaveAttribute('href', expect.stringContaining('status=FAILED'));
  expect(screen.getByRole('link', {name: /Сегодня/})).toHaveAttribute('href', expect.stringContaining('/analytics/pipelines/p1?'));
  expect(screen.getByText(/25%/)).toBeInTheDocument();
  expect(screen.getByText(/неизвестен/)).toBeInTheDocument();
});
it('distinguishes unavailable monitoring from a healthy pipeline', () => {
  show({summary: undefined, loading: false});
  expect(screen.getByText('Статистика недоступна')).toBeInTheDocument();
  expect(screen.queryByText('Без серии ошибок')).not.toBeInTheDocument();
});
it('does not expose session links without permission', () => {
  show({canSessions: false});
  expect(screen.queryByRole('link', {name: 'Сессии →'})).not.toBeInTheDocument();
  expect(screen.getByText(/2 ошибки подряд/).tagName).not.toBe('A');
});

it('labels agreement overage explicitly and provides seven calendar days of analytics', () => {
  show({summary: {...summary, periodSentBytes: 8192}});
  expect(screen.getByText(/Превышение согласованного объёма/)).toHaveClass('text-red-700');
  const href = screen.getByRole('link', {name: 'По дням →'}).getAttribute('href')!;
  const query = new URLSearchParams(href.split('?')[1]);
  expect(query.get('bucket')).toBe('day');
  const fromDay = Date.parse(query.get('from')!.slice(0, 10));
  const toDay = Date.parse(query.get('to')!.slice(0, 10));
  expect((toDay - fromDay) / 86400000).toBe(6);
});

it('opens only today when clicking the today totals', () => {
  show();
  const href = screen.getByRole('link', {name: /Сегодня/}).getAttribute('href')!;
  const q = new URLSearchParams(href.split('?')[1]);
  expect(q.get('from')!.slice(0, 10)).toBe(q.get('to')!.slice(0, 10));
});
