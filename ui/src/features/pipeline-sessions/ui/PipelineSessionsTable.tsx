import React, { useCallback, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useListReturn } from '../../../shared/hooks/useListReturn';
import { toast } from 'sonner';
import { pipelineSessionsApi } from '../api/pipelineSessionsApi';
import { triggersApi } from '../../pipeline/api/triggersApi';
import type {
  PipelineSessionPageDto,
  PipelineSessionsResponseDto,
  StatusDto,
} from '../types/types';
import { TERMINAL_STATUSES } from '../types/types';
import type { Column, TableParams, MenuItem } from '../../../shared/ui/table/types/type';
import Table from '../../../shared/ui/table/Table';
import { TableWithStates } from '../../../shared/ui/table/components/TableStates';
import { SYS_TABLE_RESOURCES } from '../../../shared/resources';
import { useTableData } from '../../../shared/ui/table/hooks/useTableData';
import { ApiError } from '../../../shared/api/ApiError';
import { ConfirmationModal } from '../../../shared/components/ConfirmationModal';
import { SkeletonTable } from '../../../shared/components/SkeletonTable';
import { SessionCard } from './PipelinesSessionCard';
import { SkeletonCards } from '../../pipeline/pipelines-table/ui/SkeletonCards';
import { useViewMode } from '../../../shared/hooks/useViewMode';
import { ViewModeLayout } from '../../../shared/components/ViewModeLayout';
import {
  createTextColumn,
  createDateTimeColumn,
  createSelectColumn,
  createActionsColumn,
} from '../../../shared/ui/table/lib/columnFactory';
import { useStatuses } from '../../../shared/hooks/useStatuses';
import { useUrlFilterParam } from '../../../shared/hooks/useUrlFilterParam';

const TABLE_ID = 'sessions';

interface PipelineSessionsTableProps {
  onToggleColumnVisibility?: (columnKey: string) => void;
  columnWidths?: Record<string, number>;
  onColumnResize?: (columnKey: string, newWidth: number) => void;
}

export const PipelineSessionsTable: React.FC<PipelineSessionsTableProps> = ({
  onToggleColumnVisibility,
  columnWidths,
  onColumnResize,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [pipelineId, clearPipelineId] = useUrlFilterParam('pipelineId');
  const { displayMode, setDisplayMode } = useViewMode(TABLE_ID);

  // Stop session confirmation state
  const [stopModalState, setStopModalState] = useState<{
    isOpen: boolean;
    session: PipelineSessionPageDto | null;
  }>({
    isOpen: false,
    session: null,
  });

  const mapToOptions = useCallback(
    (statuses: StatusDto[]) => statuses.map(s => ({ value: s.code, label: s.displayName })),
    [],
  );
  const mapToMap = useCallback(
    (statuses: StatusDto[]) => statuses.reduce((acc, s) => ({ ...acc, [s.code]: s }), {}),
    [],
  );

  const {
    statusOptions,
    statusesMap: statuses,
    isLoading: isLoadingStatuses,
    reload: reloadStatuses,
  } = useStatuses({
    fetchStatuses: pipelineSessionsApi.getAllStatuses,
    mapToOptions,
    mapToMap,
  });


  const handleStopSession = useCallback((session: PipelineSessionPageDto) => {
    setStopModalState({ isOpen: true, session });
  }, []);

  const {
    data,
    isLoading,
    serverMeta,
    handleTableChange,
    savedState,
    initialPage,
    permissions,
    permissionsLoading,
    isLoadingState,
    error,
    loadServerData,
  } = useTableData<PipelineSessionPageDto>({
    resourceCode: SYS_TABLE_RESOURCES.TABLE_SESSIONS.code,
    navigationSearch: location.search,
    fetchData: async (params?: TableParams) => {
      const safeParams = params || {
        pagination: { page: 1, size: 10 },
        sort: { field: 'createdAt', order: 'desc' },
        filters: null,
      };

      const filtersWithPipelineId = pipelineId
        ? { ...safeParams.filters, pipelineId }
        : safeParams.filters;

      const response = await pipelineSessionsApi.getPipelineSessionsWithParams({
        ...safeParams,
        filters: filtersWithPipelineId,
      });

      return {
        data: response.content,
        meta: mapServerResponseToTableMeta(response),
      };
    },
    dependencies: [pipelineId],
  });

  const { remember, lastId, returnTo } = useListReturn(SYS_TABLE_RESOURCES.TABLE_SESSIONS.code, isLoading || isLoadingState || permissionsLoading || isLoadingStatuses);
  const handleViewSessionDetails = useCallback((session: PipelineSessionPageDto) => {
    remember(session.id);
    navigate(`/sessions/${session.id}`, { state: { returnTo } });
  }, [navigate, remember, returnTo]);

  const isValidationError = error instanceof ApiError && error.status === 400;

  const getStatusConfig = useCallback(
    (statusCode: string) => {
      const statusColorMap: Record<string, string> = {
        PREPARE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
        ACTIVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
        SUCCESS: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
        FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
        ABORTED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      };

      return {
        color:
          statusColorMap[statusCode] ||
          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
        label: statuses[statusCode]?.displayName || statusCode,
      };
    },
    [statuses],
  );

  const handleConfirmStop = async () => {
    if (!stopModalState.session) return;
    try {
      await triggersApi.stopTrigger(stopModalState.session.id);
      toast.success('Сессия остановлена');
      setStopModalState({ isOpen: false, session: null });
      loadServerData();
    } catch (err) {
      console.error('Session stop error:', err);
      const message =
        err instanceof ApiError ? err.message : 'Произошла ошибка при остановке сессии';
      toast.error(message);
    }
  };

  const columns: Column<PipelineSessionPageDto>[] = [
    { ...createTextColumn<PipelineSessionPageDto>('id', 'ID сессии', { width: 120 }), render: (value, row) => permissions?.canSessionProgressOpen ? <Link to={`/sessions/${row.id}`} state={{ returnTo }} onClick={() => remember(row.id)}>{String(value)}</Link> : String(value) },
    createTextColumn('pipelineId', 'ID пайплайна', { width: 120 }),
    createTextColumn('pipelineName', 'Название пайплайна', {
      width: 150,
      sortable: false,
      filterable: false,
    }),
    {
      ...createSelectColumn('status', 'Статус', statusOptions, { width: 150 }),
      render: (value: unknown) => {
        const statusCode = String(value || '');
        const config = getStatusConfig(statusCode);
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        );
      },
    },
    createDateTimeColumn('startDt', 'Время начала', { width: 150 }),
    createDateTimeColumn('createdAt', 'Создана', { width: 150 }),
    createDateTimeColumn('updatedAt', 'Обновлена', { width: 150 }),
    createActionsColumn(row => {
      const isTerminal = TERMINAL_STATUSES.includes(row.status);
      const actions: MenuItem<PipelineSessionPageDto>[] = [];
      actions.push({
        action: 'view',
        label: 'Подробности',
        disabled: !permissions?.canSessionProgressOpen,
        onClick: () => handleViewSessionDetails(row),
      });
      if (!isTerminal) {
        actions.push({
          action: 'stop',
          label: 'Остановить',
          onClick: () => handleStopSession(row),
          disabled: !permissions?.canTriggerStop,
        });
      }
      return actions;
    }),
  ];

  const activeFilterCount = Object.keys(savedState?.filters || {}).length;
  const skeletonRowCount = serverMeta?.pagination?.size || 8;

  const renderCard = useCallback(
    (session: PipelineSessionPageDto) => {
      const config = getStatusConfig(session.status);
      return (
        <SessionCard
          session={session}
          onNavigate={() => remember(session.id)}
          returnTo={returnTo}
          permissions={permissions}
          onViewProgress={handleViewSessionDetails}
          onStop={handleStopSession}
          statusDisplayName={config.label}
        />
      );
    },
    [permissions, handleViewSessionDetails, handleStopSession, getStatusConfig, remember, returnTo],
  );

  return (
    <TableWithStates
      permissionsLoading={permissionsLoading}
      isLoadingState={isLoadingState}
      error={error}
      onRetry={() => {
        loadServerData();
        reloadStatuses();
      }}
      entityName='сессии пайплайнов'
      isLoadingData={false}
      isValidationError={isValidationError}
    >
      <div className='space-y-4'>
        {pipelineId && (
          <div className='mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg'>
            <div className='flex justify-between items-center'>
              <div>
                <h3 className='text-lg font-semibold text-blue-800 dark:text-blue-300'>
                  Сессии для пайплайна
                </h3>
                <p className='text-sm text-blue-600 dark:text-blue-400 mt-1'>
                  Pipeline ID:{' '}
                  <code className='bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded dark:text-blue-200'>
                    {pipelineId}
                  </code>
                </p>
              </div>
              <button
                onClick={clearPipelineId}
                className='px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-50 dark:hover:bg-gray-700'
              >
                Показать всё
              </button>
            </div>
          </div>
        )}

        <ViewModeLayout
          displayMode={displayMode}
          setDisplayMode={setDisplayMode}
          isLoading={isLoading || isLoadingStatuses}
          skeletonTable={
            <SkeletonTable
              columns={columns}
              activeFilterCount={activeFilterCount}
              rowCount={skeletonRowCount}
            />
          }
          skeletonCards={
            <SkeletonCards
              columns={columns}
              activeFilterCount={activeFilterCount}
              rowCount={skeletonRowCount}
            />
          }
        >
          {() => (
            <Table
              loading={isLoading}
              serverMeta={serverMeta}
              initialPage={initialPage}
              pageSize={savedState?.pageSize || 10}
              rowClassName={row => row.id === lastId ? "fde-last-visited" : ""}
              onTableChange={handleTableChange}
              columns={columns}
              data={data}
              emptyMessage='Сессии пайплайнов не найдены'
              resizable={true}
              resizeSensitivity={1}
              minColumnWidth={10}
              className='w-full'
              caption={pipelineId ? `Сессии пайплайна` : 'Все сессии пайплайнов'}
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
        </ViewModeLayout>
      </div>

      <ConfirmationModal
        isOpen={stopModalState.isOpen}
        onClose={() => setStopModalState({ isOpen: false, session: null })}
        onConfirm={handleConfirmStop}
        title='Подтверждение остановки'
        message={
          <>
            Остановить сессию{' '}
            <span className='font-medium font-mono text-gray-700 dark:text-gray-300'>
              {stopModalState.session?.id || ''}
            </span>
            ?
          </>
        }
        confirmText='Остановить'
        icon={
          <div className='mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30'>
            <svg
              className='h-5 w-5 text-orange-600 dark:text-orange-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z'
              />
            </svg>
          </div>
        }
      />
    </TableWithStates>
  );
};

function mapServerResponseToTableMeta(response: PipelineSessionsResponseDto) {
  return {
    pagination: {
      page: response.page,
      size: response.size,
      totalElements: response.totalElements,
      totalPages: response.totalPages,
    },
    filters: {},
    sort: null,
  };
}
