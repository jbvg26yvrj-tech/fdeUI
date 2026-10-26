import React, { useCallback } from 'react';
import Table from '../../../shared/ui/table/Table';
import {
  fetchResources,
  mapServerResponseToTableMeta,
} from '../../../features/permissions/api/resourcesApi';
import type { ResourceDto } from '../../../features/permissions/types/types';
import { TableWithStates } from '../../../shared/ui/table/components/TableStates';
import { SYS_TABLE_RESOURCES } from '../../../shared/resources';
import type { Column } from '../../../shared/ui/table/types/type';
import type { TableProps } from '../../../shared/types/Types';
import { useTableData } from '../../../shared/ui/table/hooks/useTableData';
import { SkeletonTable } from '../../../shared/components/SkeletonTable';

import { CardsIcon, TableIcon } from '../../../shared/ui/table/lib/icons';
import { useViewMode } from '../../../shared/hooks/useViewMode';
import { ResourceCard } from './ResourceCard';
import { SkeletonCards } from '../../../features/pipeline/pipelines-table/ui/SkeletonCards';
import {
  createTextColumn,
  createDateTimeColumn,
  createSelectColumn,
} from '../../../shared/ui/table/lib/columnFactory';

export const ResourcesTable: React.FC<TableProps<ResourceDto>> = ({
  onToggleColumnVisibility,
  columnWidths,
  onColumnResize,
}) => {
  const { displayMode, setDisplayMode } = useViewMode('resources');

  const {
    data,
    isLoading,
    serverMeta,
    handleTableChange,
    savedState,
    permissionsLoading,
    isLoadingState,
    error,
    loadServerData,
  } = useTableData<ResourceDto>({
    resourceCode: SYS_TABLE_RESOURCES.TABLE_RESOURCES.code,
    fetchData: async params => {
      const response = await fetchResources(params);
      return {
        data: response.content,
        meta: mapServerResponseToTableMeta(response),
      };
    },
  });

  const resourceTypeOptions = [
    { value: 'PAGE', label: 'Страница' },
    { value: 'BUTTON', label: 'Кнопка' },
    { value: 'API', label: 'API' },
    { value: 'TABLE', label: 'Таблица' },
    { value: 'MENU', label: 'Меню' },
    { value: 'GLOBAL', label: 'Глобальный' },
  ];

  const typeLabels: Record<string, string> = {
    PAGE: 'Страница',
    BUTTON: 'Кнопка',
    API: 'API',
    TABLE: 'Таблица',
    MENU: 'Меню',
    GLOBAL: 'Глобальный',
  };

  const columns: Column<ResourceDto>[] = [
    createTextColumn('code', 'Код', { width: 150 }),
    createTextColumn('name', 'Название', { width: 200 }),
    {
      ...createSelectColumn('type', 'Тип', resourceTypeOptions, { width: 120 }),
      render: (value: unknown) => {
        return (
          <div
            className='truncate min-w-0 dark:text-gray-100'
            title={String(value)}
            style={{ minWidth: '0' }}
          >
            {typeLabels[String(value)] || String(value)}
          </div>
        );
      },
    },
    createTextColumn('description', 'Описание', { width: 250 }),
    createDateTimeColumn('createdAt', 'Создан', { width: 120 }),
  ];

  const activeFilterCount = Object.keys(savedState?.filters || {}).length;
  const skeletonRowCount = serverMeta?.pagination?.size || 8;

  const renderCard = useCallback(
    (resource: ResourceDto) => <ResourceCard resource={resource} />,
    [],
  );

  return (
    <TableWithStates
      permissionsLoading={permissionsLoading}
      isLoadingState={isLoadingState}
      error={error}
      onRetry={() => loadServerData()}
      entityName='ресурсы'
      isLoadingData={false}
    >
      <div className='relative w-full p-4 space-y-4'>
        <div className='flex justify-between items-start'>
          <h2 className='text-lg font-semibold text-gray-800 dark:text-white'>
            Ресурсы приложения
          </h2>
          <div className='flex space-x-1'>
            <button
              onClick={() => setDisplayMode('table')}
              className={`p-2 rounded-md transition-colors ${
                displayMode === 'table'
                  ? 'bg-blue-100 dark:bg-blue-900'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title='Таблица'
            >
              <TableIcon active={displayMode === 'table'} />
            </button>
            <button
              onClick={() => setDisplayMode('cards')}
              className={`p-2 rounded-md transition-colors ${
                displayMode === 'cards'
                  ? 'bg-blue-100 dark:bg-blue-900'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title='Карточки'
            >
              <CardsIcon active={displayMode === 'cards'} />
            </button>
          </div>
        </div>

        {isLoading ? (
          displayMode === 'table' ? (
            <SkeletonTable
              columns={columns}
              activeFilterCount={activeFilterCount}
              rowCount={skeletonRowCount}
            />
          ) : (
            <SkeletonCards
              columns={columns}
              activeFilterCount={activeFilterCount}
              rowCount={skeletonRowCount}
            />
          )
        ) : (
          <Table
            serverMeta={serverMeta}
            onTableChange={handleTableChange}
            columns={columns}
            data={data}
            emptyMessage='Ресурсы не найдены'
            resizable={true}
            resizeSensitivity={1}
            minColumnWidth={20}
            className='w-full'
            caption='Список ресурсов'
            onToggleColumnVisibility={onToggleColumnVisibility}
            columnWidths={columnWidths}
            onColumnResize={onColumnResize}
            initialFilters={savedState?.filters || {}}
            initialSort={
              savedState?.sortBy
                ? {
                    field: savedState.sortBy,
                    order: savedState.sortOrder || 'asc',
                  }
                : null
            }
            displayMode={displayMode}
            renderCard={renderCard}
          />
        )}
      </div>
    </TableWithStates>
  );
};
