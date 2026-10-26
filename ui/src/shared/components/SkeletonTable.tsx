import React from 'react';
import type { Column } from '../ui/table/types/type';

interface SkeletonTableProps {
  columns: Column<any>[];
  activeFilterCount?: number;
  rowCount?: number;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  columns,
  activeFilterCount = 0,
  rowCount = 5,
}) => {
  const hasActiveFilters = activeFilterCount > 0;
  const filterableColumns = columns.filter(col => col.filterable);
  const availableFilterFieldsCount = filterableColumns.length;

  return (
    <div className='w-full bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden'>
      {/* Верхняя панель с заголовком и кнопками */}
      <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex justify-between items-center mb-2'>
          <div className='flex items-center space-x-3'>
            {/* Заголовок-скелетон с shimmer */}
            <div className='h-6 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer w-32'></div>
            {hasActiveFilters && (
              <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer w-24'></div>
            )}
          </div>

          <div className='flex items-center space-x-2'>
            {/* Кнопка "Показать фильтры" */}
            {filterableColumns.length > 0 && (
              <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer w-32'></div>
            )}

            {/* Кнопка "Добавить фильтр" */}
            {availableFilterFieldsCount > 0 && (
              <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer w-32'></div>
            )}

            {/* Кнопка "Сбросить" (только если есть активные фильтры) */}
            {hasActiveFilters && (
              <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer w-24'></div>
            )}
          </div>
        </div>

        {/* Блок фильтров */}
        {hasActiveFilters ? (
          <div className='mt-4'>
            <div className='flex justify-between items-center mb-3'>
              <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer w-40'></div>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2'>
              {Array.from({ length: activeFilterCount }).map((_, idx) => (
                <div key={idx} className='bg-gray-50 dark:bg-gray-800 rounded-md p-2 min-h-[64px]'>
                  <div className='flex items-center justify-between mb-1'>
                    <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer w-20'></div>
                    <div className='h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer'></div>
                  </div>
                  <div className='h-6 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer w-full'></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Заглушка "Нет активных фильтров"
          <div className='mt-4 text-center py-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
            <div className='flex flex-col items-center'>
              <div className='w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer mb-2'></div>
              <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer w-40 mb-1'></div>
              <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer w-64'></div>
            </div>
          </div>
        )}
      </div>

      {/* Таблица */}
      <div className='overflow-x-auto'>
        <table
          className='min-w-full divide-y divide-gray-200 table-fixed'
          style={{ tableLayout: 'fixed', width: '100%' }}
        >
          <colgroup>
            {columns.map((col, idx) => (
              <col
                key={idx}
                style={{
                  width: col.width ? `${col.width}px` : '150px',
                  minWidth: col.minWidth ? `${col.minWidth}px` : '10px',
                }}
              />
            ))}
          </colgroup>
          <thead className='bg-gray-50 dark:bg-gray-800'>
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className='px-4 py-3 text-left'
                  style={{
                    width: col.width ? `${col.width}px` : '150px',
                    minWidth: col.minWidth ? `${col.minWidth}px` : '10px',
                  }}
                >
                  <div className='flex items-center justify-between'>
                    <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer w-3/4'></div>
                    {col.sortable && (
                      <div className='h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer ml-1'></div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className='bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700'>
            {Array.from({ length: rowCount }).map((_, rowIdx) => (
              <tr key={rowIdx}>
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    className='px-4 py-3 whitespace-nowrap'
                    style={{
                      width: col.width ? `${col.width}px` : '150px',
                      minWidth: col.minWidth ? `${col.minWidth}px` : '10px',
                    }}
                  >
                    <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer w-full'></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      <div className='px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between'>
        <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer w-48'></div>
        <div className='flex space-x-1'>
          <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer w-16'></div>
          <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer w-10'></div>
          <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer w-10'></div>
          <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer w-10'></div>
          <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer w-10'></div>
          <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer w-16'></div>
        </div>
      </div>
    </div>
  );
};
