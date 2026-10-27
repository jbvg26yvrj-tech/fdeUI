import { clsx } from 'clsx';
import { getCronHint } from '../lib/cron';
import type { Column } from '../types/type';
import { MenuActions } from './MenuActions';

interface TableBodyProps<T extends object> {
  columns: Column<T>[];
  rowClassName?: (row: T) => string;
  data: T[];
  onRowClick?: (row: T) => void;
  onRowDoubleClick?: (row: T) => void;
  isResizing: boolean;
  columnWidths: Record<string, number>;
  minColumnWidth: number;
  emptyMessage: string;
  rowKey?: keyof T | ((row: T) => string | number);
}

export const TableBody = <T extends object>({
  columns,
  data,
  onRowClick,
  onRowDoubleClick,
  isResizing,
  columnWidths,
  minColumnWidth,
  emptyMessage,
  rowKey,
  rowClassName,
}: TableBodyProps<T>) => {
  return (
    <tbody className='fde-table-body'>
      {data.length > 0 ? (
        data.map((row, index) => {
          const key = rowKey
            ? typeof rowKey === 'function'
              ? rowKey(row)
              : String(row[rowKey] as any)
            : index;

          return (
            <tr
              key={key}
              className={clsx(
                'fde-table-row transition-colors duration-150',
                rowClassName?.(row),
                onRowDoubleClick && 'cursor-pointer',
                isResizing && 'pointer-events-none',
              )}
              onClick={() => onRowClick && onRowClick(row)}
              onDoubleClick={() => onRowDoubleClick?.(row)}
            >
              {columns.map(column => {
                const columnKey = column.key as string;
                const currentWidth = columnWidths[columnKey] || column.width || 150;
                const columnMinWidth = column.minWidth ?? minColumnWidth;
                const isCollapsed = currentWidth <= columnMinWidth + 20;

                if (column.menuActions) {
                  return (
                    <td
                      key={columnKey}
                      className='fde-table-cell px-4 py-3 whitespace-nowrap text-sm'
                      style={{
                        width: `${currentWidth}px`,
                        minWidth: `${columnMinWidth}px`,
                        maxWidth: `${currentWidth}px`,
                      }}
                    >
                      <div className='flex items-center justify-center'>
                        <MenuActions menuItems={column.menuActions} row={row} />
                      </div>
                    </td>
                  );
                }

                const cellValue = (row as Record<string, unknown>)[column.key as string];
                const stringValue = String(cellValue || '');

                let cellTitle = stringValue;
                if (column.filterType === 'cron' && !isCollapsed) {
                  cellTitle = getCronHint(cellValue);
                }

                return (
                  <td
                    key={columnKey}
                    className='fde-table-cell px-4 py-3 whitespace-nowrap text-sm'
                    style={{
                      width: `${currentWidth}px`,
                      minWidth: `${columnMinWidth}px`,
                      maxWidth: `${currentWidth}px`,
                    }}
                    title={isCollapsed ? undefined : cellTitle}
                  >
                    {isCollapsed ? (
                      <div className='flex items-center justify-center w-full h-full relative'>
                        <div
                          className='absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 h-5 bg-blue-400 dark:bg-blue-500 rounded-sm opacity-70'
                          style={{ width: '2px', minWidth: '2px', maxWidth: '2px' }}
                        ></div>
                      </div>
                    ) : (
                      <div className='truncate min-w-0' style={{ minWidth: '0' }}>
                        {column.render ? column.render(cellValue, row) : stringValue}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })
      ) : (
        <tr>
          <td colSpan={columns.length} className='fde-table-empty px-4 py-12 text-center text-sm'>
            {emptyMessage}
          </td>
        </tr>
      )}
    </tbody>
  );
};
