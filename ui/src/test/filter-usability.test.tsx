import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TableFilters } from '../shared/ui/table/components/TableFilters';
const columns = ['id', 'pipelineName', 'clientFrom', 'clientTo', 'description'].map(key => ({
  key,
  title: key,
  filterable: true,
}));
function Harness({ onApply = vi.fn() }: { onApply?: (field: string, value: any) => void }) {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  return (
    <TableFilters
      columns={columns}
      filters={filters}
      initialFilters={filters}
      inputValues={drafts}
      onInputValueChange={(field, value) => setDrafts(old => ({ ...old, [field]: value }))}
      onFilterChange={(field, value) => {
        onApply(field, value);
        setFilters(old => ({ ...old, [field]: value }));
      }}
      onReset={() => {
        setFilters({});
        setDrafts({});
      }}
    />
  );
}
afterEach(() => vi.useRealTimers());
describe('usable filters', () => {
  it('shows common fields and applies two edits independently', () => {
    vi.useFakeTimers();
    const apply = vi.fn();
    render(<Harness onApply={apply} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'pipelineName' }), {
      target: { value: 'alpha' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'clientFrom' }), {
      target: { value: 'beta' },
    });
    act(() => vi.advanceTimersByTime(1000));
    expect(apply.mock.calls).toEqual([
      ['pipelineName', 'alpha'],
      ['clientFrom', 'beta'],
    ]);
    expect(screen.getByText('Активные фильтры: 2')).toBeInTheDocument();
  });
  it('excludes blank advanced fields from count and unmounts collapsed controls', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Добавить фильтр' }));
    fireEvent.click(screen.getByRole('button', { name: 'description' }));
    expect(screen.getByRole('textbox', { name: 'description' })).toBeInTheDocument();
    expect(screen.queryByText(/Активные фильтры:/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Дополнительные фильтры' }));
    expect(screen.queryByRole('textbox', { name: 'description' })).not.toBeInTheDocument();
  });
  it('reset cancels pending drafts', () => {
    vi.useFakeTimers();
    const apply = vi.fn();
    render(<Harness onApply={apply} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'id' }), { target: { value: 'pending' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить фильтры' }));
    act(() => vi.advanceTimersByTime(1500));
    expect(apply).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'id' })).toHaveValue('');
  });
  it('chip removal cancels a newer pending value', () => {
    vi.useFakeTimers();
    const apply = vi.fn();
    render(<Harness onApply={apply} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'id' }), { target: { value: 'first' } });
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.change(screen.getByRole('textbox', { name: 'id' }), { target: { value: 'second' } });
    fireEvent.click(screen.getByRole('button', { name: 'Убрать фильтр: id' }));
    act(() => vi.advanceTimersByTime(1500));
    expect(apply.mock.calls).toEqual([
      ['id', 'first'],
      ['id', ''],
    ]);
    expect(screen.getByRole('textbox', { name: 'id' })).toHaveValue('');
  });
});

it('opens advanced choices with keyboard and returns focus on Escape', async () => {
  const user = (await import('@testing-library/user-event')).default.setup();
  render(<Harness />);
  const add = screen.getByRole('button', { name: 'Добавить фильтр' });
  add.focus();
  await user.keyboard('{Enter}');
  await user.tab();
  expect(screen.getByRole('button', { name: 'description' })).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(add).toHaveFocus();
  expect(screen.queryByRole('button', { name: 'description' })).not.toBeInTheDocument();
});

it('uses the latest apply callback and cancels work on unmount', () => {
  vi.useFakeTimers();
  const oldApply = vi.fn();
  const newApply = vi.fn();
  const props = { columns, filters: {}, inputValues: {}, onInputValueChange: vi.fn() };
  const view = render(<TableFilters {...props} onFilterChange={oldApply} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'id' }), { target: { value: 'first' } });
  view.rerender(<TableFilters {...props} onFilterChange={newApply} />);
  act(() => vi.advanceTimersByTime(1000));
  expect(oldApply).not.toHaveBeenCalled();
  expect(newApply).toHaveBeenCalledWith('id', 'first');
  fireEvent.change(screen.getByRole('textbox', { name: 'id' }), { target: { value: 'abandoned' } });
  view.unmount();
  act(() => vi.advanceTimersByTime(1000));
  expect(newApply).toHaveBeenCalledTimes(1);
});


it('keeps advanced input and focus when a quick filter is echoed before its draft commits', () => {
  vi.useFakeTimers();
  const apply = vi.fn();
  render(<Harness onApply={apply} />);
  fireEvent.click(screen.getByRole('button', { name: 'Добавить фильтр' }));
  fireEvent.click(screen.getByRole('button', { name: 'description' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'pipelineName' }), { target: { value: 'alpha' } });
  act(() => vi.advanceTimersByTime(500));
  const description = screen.getByRole('textbox', { name: 'description' });
  description.focus();
  fireEvent.change(description, { target: { value: 'draft' } });
  act(() => vi.advanceTimersByTime(500));
  expect(screen.getByRole('textbox', { name: 'description' })).toBe(description);
  expect(description).toHaveFocus();
  expect(description).toHaveValue('draft');
  act(() => vi.advanceTimersByTime(500));
  expect(apply.mock.calls).toEqual([['pipelineName', 'alpha'], ['description', 'draft']]);
});
