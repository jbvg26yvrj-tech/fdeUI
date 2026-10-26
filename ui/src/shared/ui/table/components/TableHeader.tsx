import { clsx } from 'clsx';
import { ChevronUpDownIcon, ArrowUpIcon, ArrowDownIcon } from '../lib/icons';
import type { Column } from '../types/type';

interface TableHeaderProps<T> {
  columns: Column<T>[];
  sortField: string;
  sortDirection: 'asc' | 'desc';
  handleSort: (columnKey: string) => void;
  resizable: boolean;
  isResizing: boolean;
  startResize: (columnKey: string, e: React.MouseEvent) => void;
  columnWidths: Record<string, number>;
  minColumnWidth: number;
}

export const TableHeader = <T,>({
  columns,
  sortField,
  sortDirection,
  handleSort,
  resizable,
  isResizing,
  startResize,
  columnWidths,
  minColumnWidth,
}: TableHeaderProps<T>) => {
  return (
    <thead className='bg-gray-50 dark:bg-gray-800'>
      <tr>
        {columns.map(column => {
          const columnKey = column.key as string;
          const currentWidth = columnWidths[columnKey] || column.width || 150;
          const columnMinWidth = column.minWidth ?? minColumnWidth;
          const isCollapsed = currentWidth <= columnMinWidth + 20;

          return (
            <th
              key={columnKey}
              scope='col'
              style={{
                width: `${currentWidth}px`,
                minWidth: `${columnMinWidth}px`,
                maxWidth: `${currentWidth}px`,
              }}
              className={clsx(
                'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group',
                column.sortable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700',
                isResizing && 'pointer-events-none',
              )}
              onClick={() => column.sortable && handleSort(columnKey)}
            >
              <div
                className='flex items-center justify-between min-w-0 h-full'
                style={{ minWidth: '0' }}
              >
                {isCollapsed ? (
                  <div
                    className='flex items-center justify-center w-full h-full relative'
                    title={column.title}
                  >
                    <div
                      className='absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 bg-blue-500 dark:bg-blue-400 rounded-sm opacity-80 shadow-sm'
                      style={{ width: '3px', minWidth: '3px', maxWidth: '3px' }}
                    ></div>
                  </div>
                ) : (
                  <>
                    <span
                      className='truncate flex-1 min-w-0'
                      style={{ minWidth: '0' }}
                      title={column.title}
                    >
                      {column.title}
                    </span>
                    {column.sortable && (
                      <span className='ml-1 flex-shrink-0'>
                        {sortField === column.key ? (
                          sortDirection === 'asc' ? (
                            <ArrowUpIcon className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                          ) : (
                            <ArrowDownIcon className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                          )
                        ) : (
                          <ChevronUpDownIcon className='w-4 h-4' />
                        )}
                      </span>
                    )}
                  </>
                )}
              </div>

              {resizable && (
                <div
                  className={clsx(
                    'absolute right-0 top-0 h-full w-3 cursor-col-resize bg-transparent transition-colors z-10',
                    'hover:bg-blue-300 dark:hover:bg-blue-600 active:bg-blue-500 dark:active:bg-blue-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600',
                    isResizing && 'bg-blue-500 dark:bg-blue-700',
                  )}
                  onMouseDown={e => startResize(columnKey, e)}
                  style={{ userSelect: 'none', cursor: 'col-resize', right: '-6px', width: '12px' }}
                />
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
};
