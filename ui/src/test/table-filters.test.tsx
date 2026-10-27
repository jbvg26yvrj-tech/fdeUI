import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TableFilters } from '../shared/ui/table/components/TableFilters';

describe('filter field selection', () => {
  it('keeps an empty selected field when equivalent saved filters are refreshed', () => {
    const props = {
      columns: [{ key: 'name', title: 'Название', filterable: true, filterType: 'text' as const }],
      filters: {}, inputValues: {}, onFilterChange: vi.fn(), onInputValueChange: vi.fn(),
    };
    const view = render(<TableFilters {...props} initialFilters={{}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Добавить фильтр' }));
    fireEvent.click(screen.getByRole('button', { name: /^Название$/ }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    view.rerender(<TableFilters {...props} initialFilters={{}} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'SIMULATION' } });
    expect(props.onInputValueChange).toHaveBeenCalledWith('name', 'SIMULATION');
    view.rerender(<TableFilters {...props} initialFilters={{ name: 'saved' }} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    view.rerender(<TableFilters {...props} initialFilters={{}} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
