import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DailyTransfers } from './DailyTransfers';
import type { Overview } from './api';
it('keeps inbound and outbound separate and links a day to sessions', () => {
  const select = vi.fn();
  render(<DailyTransfers zone='UTC' onSelect={select} rows={[{ time:'2026-11-06T00:00:00', receivedFiles:4, sentFiles:3, receivedBytes:2048, sentBytes:1024, sessions:2, failed:1, unknownSizeFiles:1 } as Overview['series'][number]]} />);
  const row = screen.getByRole('row', { name:/2026-11-06/ });
  expect(within(row).getByText('2.0 КиБ')).toBeInTheDocument();
  expect(within(row).getByText('1.0 КиБ')).toBeInTheDocument();
  expect(within(row).getByText('Неполный объём: 1')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name:'2026-11-06' }));
  expect(select).toHaveBeenCalledWith('2026-11-06T00:00:00');
});
