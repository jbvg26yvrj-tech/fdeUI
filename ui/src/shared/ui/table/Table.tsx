import React, { useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { Pagination } from './components/Pagination';
import { TableHeader } from './components/TableHeader';
import { TableBody } from './components/TableBody';
import { useTableState } from './hooks/useTableState';
import { useColumnResize } from './hooks/useColumnResize';
import { TableFilters } from './components/TableFilters';
import { SortDropdown } from './components/SortDropdown';
import type { TableProps } from './types/type';

export const Table = <T extends object>({
  columns,
  data,
  serverMeta,
  onTableChange,
  pageSize = 10,
  className,
  emptyMessage = 'Нет данных для отображения',
  onRowClick,
  onRowDoubleClick,
  showResetButton = true,
  resizable = true,
  onColumnResize,
  resizeSensitivity = 1,
  minColumnWidth = 10,
  loading = false,
  caption = '',
  onToggleColumnVisibility,
  columnWidths: externalColumnWidths,
  initialFilters = {},
  initialSort = null,
  rowKey,
  showFilters = true,
  showPagination = true,
  displayMode = 'table',
  renderCard,
}: TableProps<T>) => {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const tableState = useTableState({
    initialPageSize: pageSize,
    serverMeta,
    onTableChange,
    initialFilters,
    initialSort,
  });

  const {
    currentPage,
    sortField,
    sortDirection,
    filters,
    inputValues,
    handleSort,
    handlePageChange,
    handleFilterChange,
    handleReset,
    setInputValues,
    setSortField,
    setSortDirection,
    setCurrentPage,
    getTableParams,
  } = tableState;

  const columnResize = useColumnResize({
    columns,
    resizable,
    minColumnWidth,
    resizeSensitivity,
    onColumnResize,
  });

  const { columnWidths, isResizing, startResize } = columnResize;

  const handleInputValueChange = useCallback(
    (field: string, value: string) => {
      setInputValues(prev => ({ ...prev, [field]: value }));
    },
    [setInputValues],
  );

  // Сортировка для карточек (явное указание направления)
  const handleCardSort = useCallback(
    (field: string, direction: 'asc' | 'desc') => {
      const pagination = serverMeta?.pagination || {
        page: 0,
        size: pageSize,
        totalElements: 0,
        totalPages: 0,
      };
      onTableChange?.(
        getTableParams({
          pagination: { ...pagination, page: 1 },
          sort: { field, order: direction },
        }),
      );
      setSortField(field);
      setSortDirection(direction);
      setCurrentPage(1);
    },
    [
      serverMeta,
      pageSize,
      onTableChange,
      getTableParams,
      setSortField,
      setSortDirection,
      setCurrentPage,
    ],
  );

  // Колонки, доступные для сортировки
  const sortableColumns = columns
    .filter(col => col.sortable)
    .map(col => ({ field: col.key as string, label: col.title }));

  useEffect(() => {
    columnResize.initializeWidths();
  }, [columnResize]);

  const displayData = data;
  const totalPages = serverMeta?.pagination.totalPages || 0;
  const totalCount = serverMeta?.pagination.totalElements || 0;
  const numberPage =
    serverMeta?.pagination?.page !== undefined ? serverMeta.pagination.page + 1 : currentPage;

  const visibleColumns = columns;
  const finalColumnWidths = externalColumnWidths || columnWidths;

  const hasActiveFilters = Object.keys(filters).some(key => filters[key] !== '');
  const hasActiveSort = sortField !== '';
  const hasActiveState = hasActiveFilters || hasActiveSort;

  // Дефолтный рендер карточки на основе колонок (если renderCard не передан)
  const defaultRenderCard = (item: T) => (
    <div className='border rounded-lg p-4 shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'>
      {columns.map(col => (
        <div key={col.key as string} className='text-sm'>
          <span className='font-medium text-gray-600 dark:text-gray-400'>{col.title}:</span>{' '}
          <span className='text-gray-900 dark:text-gray-100'>
            {col.render
              ? col.render((item as any)[col.key], item)
              : String((item as any)[col.key] ?? '-')}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div
      ref={tableContainerRef}
      className={clsx(
        'w-full bg-white dark:bg-gray-900 rounded-lg shadow min-w-0 flex flex-col',
        className,
        isResizing && 'select-none',
      )}
    >
      {/* Верхняя панель: фильтры и, в карточном режиме, сортировка */}
      <div className='border-b border-gray-200 dark:border-gray-700'>
        {showFilters && (
          <TableFilters
            columns={columns}
            filters={filters}
            inputValues={inputValues}
            onFilterChange={handleFilterChange}
            onInputValueChange={handleInputValueChange}
            onReset={handleReset}
            showResetButton={showResetButton} // ← убрано && hasActiveState
            hasActiveState={hasActiveState}
            caption={caption}
            onToggleColumnVisibility={onToggleColumnVisibility}
            initialFilters={initialFilters}
            sortDropdown={
              sortableColumns.length > 0 ? (
                <SortDropdown
                  options={sortableColumns}
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSortChange={handleCardSort}
                />
              ) : null
            }
          />
        )}
      </div>

      {/* Контент: таблица или карточки */}
      <div className={clsx('flex-1', displayMode === 'cards' ? 'p-4' : '')}>
        {loading && (
          <div className='absolute inset-0 bg-white dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-50 flex items-center justify-center z-10'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400'></div>
          </div>
        )}

        {displayMode === 'table' ? (
          <div className='overflow-x-auto min-w-0'>
            <table
              className='min-w-full divide-y divide-gray-200 table-fixed'
              style={{ tableLayout: 'fixed', width: '99%', minWidth: '99%' }}
            >
              <colgroup>
                {visibleColumns.map(column => {
                  const columnKey = column.key as string;
                  const currentWidth = finalColumnWidths[columnKey] || column.width || 150;
                  return (
                    <col
                      key={columnKey}
                      style={{
                        width: `${currentWidth}px`,
                        minWidth: `${column.minWidth || minColumnWidth}px`,
                        maxWidth: `${currentWidth}px`,
                      }}
                    />
                  );
                })}
              </colgroup>
              <TableHeader
                columns={visibleColumns}
                sortField={sortField}
                sortDirection={sortDirection}
                handleSort={handleSort}
                resizable={resizable}
                isResizing={isResizing}
                startResize={startResize}
                columnWidths={finalColumnWidths}
                minColumnWidth={minColumnWidth}
              />
              <TableBody
                columns={visibleColumns}
                data={displayData}
                onRowClick={onRowClick}
                onRowDoubleClick={onRowDoubleClick}
                isResizing={isResizing}
                columnWidths={finalColumnWidths}
                minColumnWidth={minColumnWidth}
                emptyMessage={emptyMessage}
                rowKey={rowKey}
              />
            </table>
          </div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {displayData.length > 0 ? (
              displayData.map((item, index) => {
                const key = rowKey
                  ? typeof rowKey === 'function'
                    ? rowKey(item)
                    : String(item[rowKey] as any)
                  : index;
                return (
                  <div key={key}>{renderCard ? renderCard(item) : defaultRenderCard(item)}</div>
                );
              })
            ) : (
              <div className='col-span-full text-center py-8 text-gray-500 dark:text-gray-400'>
                {emptyMessage}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Пагинация (липкая снизу) */}
      {showPagination && (
        <div className='bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700'>
          <Pagination
            currentPage={numberPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default Table;
