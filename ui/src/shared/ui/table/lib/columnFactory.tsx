import type { Column, MenuItem } from '../types/type';
import { MenuActions } from '../components/MenuActions';

export interface TextColumnOptions {
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
  minWidth?: number;
  className?: string;
}

export const createTextColumn = <T,>(
  key: keyof T,
  title: string,
  options: TextColumnOptions = {},
): Column<T> => ({
  key,
  title,
  sortable: options.sortable ?? true,
  filterable: options.filterable ?? true,
  filterType: 'text',
  width: options.width ?? 150,
  minWidth: options.minWidth ?? 20,
  render: (value: unknown) => (
    <div
      className='truncate min-w-0 dark:text-gray-100'
      title={String(value)}
      style={{ minWidth: 0 }}
    >
      {String(value ?? '')}
    </div>
  ),
});

export const createDateTimeColumn = <T,>(
  key: keyof T,
  title: string,
  options: TextColumnOptions = {},
): Column<T> => ({
  key,
  title,
  sortable: options.sortable ?? true,
  filterable: options.filterable ?? true,
  filterType: 'datetime',
  width: options.width ?? 150,
  minWidth: options.minWidth ?? 20,
  render: (value: unknown) => {
    if (!value) return '-';
    try {
      const date = new Date(String(value));
      return date.toLocaleString('ru-RU');
    } catch {
      return String(value);
    }
  },
});

export const createSelectColumn = <T,>(
  key: keyof T,
  title: string,
  options: { value: string; label: string }[],
  columnOptions: TextColumnOptions = {},
): Column<T> => ({
  key,
  title,
  sortable: columnOptions.sortable ?? true,
  filterable: columnOptions.filterable ?? true,
  filterType: 'select',
  filterOptions: options,
  width: columnOptions.width ?? 150,
  minWidth: columnOptions.minWidth ?? 20,
  render: (value: unknown) => (
    <div
      className='truncate min-w-0 dark:text-gray-100'
      title={String(value)}
      style={{ minWidth: 0 }}
    >
      {String(value ?? '')}
    </div>
  ),
});

export const createCheckboxColumn = <T,>(
  key: keyof T,
  title: string,
  options: TextColumnOptions = {},
): Column<T> => ({
  key,
  title,
  sortable: options.sortable ?? true,
  filterable: options.filterable ?? true,
  filterType: 'checkbox',
  filterOptions: [
    { value: 'true', label: 'Да' },
    { value: 'false', label: 'Нет' },
  ],
  width: options.width ?? 80,
  minWidth: options.minWidth ?? 20,
  render: (value: unknown) => {
    const boolValue = Boolean(value);
    return (
      <span
        className={`fde-status ${boolValue ? 'fde-status-positive' : 'fde-status-neutral'}`}
        title={boolValue ? 'Да' : 'Нет'}
      >
        {boolValue ? 'Да' : 'Нет'}
      </span>
    );
  },
});

export const createActionsColumn = <T,>(
  menuItems: (row: T) => MenuItem<T>[],
  options: { width?: number; minWidth?: number } = {},
): Column<T> => ({
  key: 'actions' as keyof T,
  title: 'Действия',
  sortable: false,
  filterable: false,
  width: options.width ?? 100,
  minWidth: options.minWidth ?? 20,
  render: (_value: unknown, row: T) => <MenuActions menuItems={menuItems(row)} row={row} />,
});
