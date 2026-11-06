import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import StepProgressModal from './StepProgressModal';
vi.mock('../../../shared/ui/Modal', () => ({ Modal: ({ isOpen, children, footer }: any) => isOpen ? <div>{children}{footer}</div> : null }));
const items = [{id: 'a', label: 'Alpha'}, {id: 'b', label: 'Beta'}];
it('blocks both forward buttons after errors and retries only failed items', async () => {
  const execute = vi.fn().mockResolvedValueOnce('success').mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('success');
  const complete = vi.fn();
  render(<StepProgressModal isOpen title='Step' items={items} onExecute={execute} onComplete={complete} skipLabel='Skip' />);
  await screen.findByText('Ошибок: 1');
  expect(screen.getByRole('button', { name: 'Далее' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Skip' })).toBeDisabled();
  fireEvent.click(screen.getByText('Повторить ошибки'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Далее' })).toBeEnabled());
  expect(execute.mock.calls.map(call => call[0])).toEqual(['a', 'b', 'b']);
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
  expect(complete).toHaveBeenCalledTimes(1);
});
it('never allows cancellation during an in-flight mutation and offers recovery after it settles', async () => {
  let resolve!: (value: 'error') => void;
  const execute = vi.fn(() => new Promise<'error'>(r => { resolve = r; }));
  const recover = vi.fn();
  render(<StepProgressModal isOpen title='Step' items={items.slice(0, 1)} onExecute={execute} onComplete={vi.fn()} onCancel={recover} />);
  expect(screen.queryByText('Отмена')).not.toBeInTheDocument();
  expect(screen.queryByText('Восстановить расписания и завершить')).not.toBeInTheDocument();
  resolve('error');
  await screen.findByText('Ошибок: 1');
  fireEvent.click(screen.getByText('Восстановить расписания и завершить'));
  expect(recover).toHaveBeenCalledTimes(1);
});
it('does not execute successful operations twice under StrictMode effect replay', async () => {
  const execute = vi.fn(async (_id: string) => 'success' as const);
  render(<StrictMode><StepProgressModal isOpen title='Step' items={items} onExecute={execute} onComplete={vi.fn()} /></StrictMode>);
  await screen.findByText('Успешно: 2');
  expect(execute.mock.calls.map(call => call[0])).toEqual(['a', 'b']);
});
it('never retries an ambiguous manual trigger and offers schedule recovery', async () => {
  const execute = vi.fn(async () => { throw new Error('timeout'); });
  const recover = vi.fn();
  render(<StepProgressModal isOpen title='Trigger' items={items.slice(0, 1)} onExecute={execute} onComplete={vi.fn()} onCancel={recover} allowRetry={false} />);
  await screen.findByText('Ошибок: 1');
  expect(screen.queryByText('Повторить ошибки')).not.toBeInTheDocument();
  expect(screen.getByText('Результат запуска не подтверждён. Проверьте сессии; повторный запрос может запустить поток ещё раз.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Далее' })).toBeDisabled();
  fireEvent.click(screen.getByText('Восстановить расписания и завершить'));
  expect(recover).toHaveBeenCalledTimes(1);
  expect(execute).toHaveBeenCalledTimes(1);
});
