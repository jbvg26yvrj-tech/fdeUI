import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { fetchPipelines, mapServerResponseToTableMeta } from '../api/pipelinesTableApi';
import { pipelinesCrudApi } from '../../api/pipelinesCrudApi';
import { triggersApi } from '../../api/triggersApi';
import { fetchPipelinesDetails } from '../../pipelines-details/api/PipelinesDetailsApi';
import { PipelineFormModal, type PipelineFormSaveValues } from '../../components/PipelineFormModal';
import { ConfirmationModal } from '../../../../shared/components/ConfirmationModal';
import type { SimplePipelineData, PipelineData } from '../../types/Types';
import type { Column } from '../../../../shared/ui/table/types/type';
import Table from '../../../../shared/ui/table/Table';
import { TableWithStates } from '../../../../shared/ui/table/components/TableStates';
import { SYS_TABLE_RESOURCES } from '../../../../shared/resources';
import { useTableData } from '../../../../shared/ui/table/hooks/useTableData';
import { ApiError } from '../../../../shared/api/ApiError';
import { loadScheduleSummaries, type ScheduleSummary } from '../../api/scheduleSummaries';
import { ScheduleSummaryLabel } from '../../components/ScheduleSummaryLabel';
import { userContextApi } from '../../../../shared/api/userContextApi';
import { SkeletonTable } from '../../../../shared/components/SkeletonTable';
import { SkeletonCards } from './SkeletonCards';
import { PipelineCard } from './PipelinesCard';
import { useViewMode } from '../../../../shared/hooks/useViewMode';
import { ViewModeLayout } from '../../../../shared/components/ViewModeLayout';
import { Button } from '../../../../shared/ui/Button';
import {
  createTextColumn,
  createDateTimeColumn,
  createActionsColumn,
  createCheckboxColumn,
} from '../../../../shared/ui/table/lib/columnFactory';

const TABLE_ID = 'pipelines';

interface PipelinesTableProps {
  onToggleColumnVisibility?: (columnKey: string) => void;
  columnWidths?: Record<string, number>;
  onColumnResize?: (columnKey: string, newWidth: number) => void;
}

export const PipelinesTable: React.FC<PipelinesTableProps> = ({
  onToggleColumnVisibility,
  columnWidths,
  onColumnResize,
}) => {
  const { displayMode, setDisplayMode } = useViewMode(TABLE_ID);
  const navigate = useNavigate();

  // Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState<'create' | 'edit'>('create');
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Delete confirmation state
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    pipeline: SimplePipelineData | null;
  }>({
    isOpen: false,
    pipeline: null,
  });

  // Trigger (run) confirmation state
  const [triggerModalState, setTriggerModalState] = useState<{
    isOpen: boolean;
    pipeline: SimplePipelineData | null;
  }>({
    isOpen: false,
    pipeline: null,
  });

  // Schedule status per pipeline
  const [scheduleMap, setScheduleMap] = useState<Record<string, ScheduleSummary>>({});
  const scheduleAbortRef = useRef<AbortController | null>(null);

  // Datacenter bulk change — admin check for button visibility
  const isAdmin = userContextApi.getCachedContext()?.roleCodes?.includes('ADMIN') ?? false;

  const handleViewPipelineDetails = useCallback((pipeline: SimplePipelineData) => {
    window.open(`/pipelines/${pipeline.id}`, '_blank');
  }, []);

  const handleViewPipelineSessions = useCallback((pipeline: SimplePipelineData) => {
    window.open(`/sessions?pipelineId=${pipeline.id}`, '_blank');
  }, []);

  const {
    data,
    isLoading,
    serverMeta,
    handleTableChange,
    savedState,
    permissions,
    permissionsLoading,
    isLoadingState,
    error,
    loadServerData,
  } = useTableData<SimplePipelineData>({
    resourceCode: SYS_TABLE_RESOURCES.TABLE_PIPELINES.code,
    fetchData: async params => {
      const idFilter = params?.filters?.id;
      if (idFilter && typeof idFilter === 'string' && idFilter.trim() !== '') {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(idFilter.trim())) {
          throw new ApiError('Неверный формат идентификатора пайплайна (UUID)', 400);
        }
      }
      const response = await fetchPipelines(params);
      return {
        data: response.content,
        meta: mapServerResponseToTableMeta(response),
      };
    },
  });

  const isValidationError = error instanceof ApiError && error.status === 400;

  // Load schedule status for each visible pipeline
  useEffect(() => {
    scheduleAbortRef.current?.abort();
    const controller = new AbortController();
    scheduleAbortRef.current = controller;
    setScheduleMap({});
    if (permissions?.canScheduleGet && data.length) {
      void loadScheduleSummaries(data.map(p => p.id), controller.signal).then(map => {
        if (!controller.signal.aborted) setScheduleMap(map);
      });
    }
    return () => controller.abort();
  }, [data, permissions?.canScheduleGet]);

  // --- CRUD handlers ---

  const handleCreatePipeline = useCallback(() => {
    setSelectedPipeline(null);
    setFormModalMode('create');
    setIsFormModalOpen(true);
  }, []);

  const handleEditPipeline = useCallback(async (pipeline: SimplePipelineData) => {
    try {
      setActionLoading(true);
      const fullPipeline = await fetchPipelinesDetails(pipeline.id);
      setSelectedPipeline(fullPipeline);
      setFormModalMode('edit');
      setIsFormModalOpen(true);
    } catch (err) {
      console.error('Failed to load pipeline details:', err);
      toast.error('Не удалось загрузить данные пайплайна');
    } finally {
      setActionLoading(false);
    }
  }, []);

  const handleDeletePipeline = useCallback((pipeline: SimplePipelineData) => {
    setDeleteModalState({ isOpen: true, pipeline });
  }, []);

  const handleTriggerPipeline = useCallback((pipeline: SimplePipelineData) => {
    setTriggerModalState({ isOpen: true, pipeline });
  }, []);

  const refreshAfterCreate = useRef(false);

  const handleFormSave = async (values: PipelineFormSaveValues): Promise<PipelineData | undefined> => {
    if (!isAdmin) return;
    setActionLoading(true);
    try {
      const tasksPayload = values.tasks.map(t => ({
        taskOrder: t.taskOrder,
        typeCode: t.typeCode,
        props: Object.fromEntries(
          t.props.filter(p => p.key.trim() !== '').map(p => [p.key, p.value]),
        ),
      }));

      const payload = {
        pipelineName: values.pipelineName,
        clientFrom: values.clientFrom,
        clientTo: values.clientTo,
        primaryDatacenter: values.primaryDatacenter || 'SP',
        allOrNothing: values.allOrNothing,
        tasks: tasksPayload,
      };

      if (formModalMode === 'create') {
        const created = await pipelinesCrudApi.createPipeline(payload);
        refreshAfterCreate.current = true;
        return created;
      } else if (selectedPipeline) {
        await pipelinesCrudApi.updatePipeline(selectedPipeline.id, payload);
        toast.success('Пайплайн успешно обновлен');
      }

      setIsFormModalOpen(false);
      loadServerData();
    } catch (err) {
      if (formModalMode === 'create') throw err;
      console.error('Pipeline save error:', err);
      const message =
        err instanceof ApiError ? err.message : 'Произошла ошибка при сохранении пайплайна';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!isAdmin || !deleteModalState.pipeline) return;
    try {
      await pipelinesCrudApi.deletePipeline(deleteModalState.pipeline.id);
      toast.success('Пайплайн успешно удален');
      setDeleteModalState({ isOpen: false, pipeline: null });
      loadServerData();
    } catch (err) {
      console.error('Pipeline delete error:', err);
      const message =
        err instanceof ApiError ? err.message : 'Произошла ошибка при удалении пайплайна';
      toast.error(message);
    }
  };

  const handleConfirmTrigger = async () => {
    if (!isAdmin || !triggerModalState.pipeline) return;
    try {
      const result = await triggersApi.manualTrigger(triggerModalState.pipeline.id);
      toast.success(`Пайплайн запущен. Сессия: ${result.sessionId}`);
      setTriggerModalState({ isOpen: false, pipeline: null });
    } catch (err) {
      console.error('Pipeline trigger error:', err);
      const message =
        err instanceof ApiError ? err.message : 'Произошла ошибка при запуске пайплайна';
      toast.error(message);
    }
  };


  const columns: Column<SimplePipelineData>[] = [
    createTextColumn('id', 'ID пайплайна', { width: 120 }),
    createTextColumn('pipelineName', 'Название', { width: 180 }),
    createTextColumn('clientFrom', 'От клиента', { width: 150 }),
    createTextColumn('clientTo', 'К клиенту', { width: 150 }),
    createTextColumn('primaryDatacenter', 'Датацентр', { width: 120 }),
    createCheckboxColumn('allOrNothing', 'Всё или ничего', { width: 120 }),

    {
      key: 'tasksCount',
      title: 'Задачи',
      sortable: false,
      filterable: false,
      width: 90,
      render: (value: unknown) => String(value ?? 0),
    },
    {
      key: 'schedule' as keyof SimplePipelineData,
      title: 'Расписание',
      sortable: false,
      filterable: false,
      width: 140,
      render: (_value: unknown, row: SimplePipelineData) => {
        return <ScheduleSummaryLabel summary={scheduleMap[row.id]} />;
      },
    },
    createDateTimeColumn('createdAt', 'Создан', { width: 100 }),
    createActionsColumn(row => [
      {
        action: 'view',
        label: 'Просмотр',
        onClick: () => handleViewPipelineDetails(row),
        disabled: !permissions?.canPipelineDetails,
      },
      {
        action: 'sessions',
        label: 'Сессии',
        onClick: () => handleViewPipelineSessions(row),
        disabled: !permissions?.canPipelineSessions,
      },
      {
        action: 'edit',
        label: 'Редактировать',
        onClick: () => handleEditPipeline(row),
        disabled: !permissions?.canPipelineUpdate,
      },
      {
        action: 'delete',
        label: 'Удалить',
        onClick: () => handleDeletePipeline(row),
        disabled: !permissions?.canPipelineDelete,
      },
      {
        action: 'run',
        label: 'Запустить',
        onClick: () => handleTriggerPipeline(row),
        disabled: !permissions?.canTriggerManual,
      },
    ]),
  ];

  const activeFilterCount = Object.keys(savedState?.filters || {}).length;
  const skeletonRowCount = serverMeta?.pagination?.size || 8;

  const renderCard = useCallback(
    (pipeline: SimplePipelineData) => (
      <PipelineCard
        pipeline={pipeline}
        scheduleSummary={scheduleMap[pipeline.id]}
        permissions={permissions}
        onViewDetails={handleViewPipelineDetails}
        onViewSessions={handleViewPipelineSessions}
        onEdit={handleEditPipeline}
        onDelete={handleDeletePipeline}
        onTrigger={handleTriggerPipeline}
      />
    ),
    [
      permissions,
      scheduleMap,
      handleViewPipelineDetails,
      handleViewPipelineSessions,
      handleEditPipeline,
      handleDeletePipeline,
      handleTriggerPipeline,
    ],
  );

  return (
    <TableWithStates
      permissionsLoading={permissionsLoading}
      isLoadingState={isLoadingState}
      error={error}
      onRetry={() => loadServerData()}
      entityName='пайплайны'
      isLoadingData={false}
      isValidationError={isValidationError}
    >
      <ViewModeLayout
        displayMode={displayMode}
        setDisplayMode={setDisplayMode}
        isLoading={isLoading}
        headerActions={
          <div className='flex gap-2'>
            {isAdmin && (
              <Button
                variant='outlined'
                size='sm'
                onClick={() => navigate('/change-datacenter')}
              >
                Сменить ЦОД
              </Button>
            )}
            {permissions?.canPipelineCreate && (
              <Button variant='primary' size='sm' onClick={handleCreatePipeline}>
                Создать пайплайн
              </Button>
            )}
          </div>
        }
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
            columns={columns}
            data={data}
            serverMeta={serverMeta}
            onTableChange={handleTableChange}
            displayMode={displayMode}
            renderCard={renderCard}
            showFilters={true}
            showPagination={true}
            loading={isLoading}
            caption='Пайплайны'
            initialFilters={savedState?.filters}
            initialSort={
              savedState?.sortBy
                ? { field: savedState.sortBy, order: savedState.sortOrder || 'asc' }
                : null
            }
            rowKey='id'
            onToggleColumnVisibility={onToggleColumnVisibility}
            columnWidths={columnWidths}
            onColumnResize={onColumnResize}
          />
        )}
      </ViewModeLayout>

      <PipelineFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          if (refreshAfterCreate.current) {
            refreshAfterCreate.current = false;
            void loadServerData();
          }
        }}
        onSave={handleFormSave}
        pipeline={selectedPipeline}
        mode={formModalMode}
        isLoading={actionLoading}
      />

      <ConfirmationModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, pipeline: null })}
        onConfirm={handleConfirmDelete}
        title='Подтверждение удаления'
        message={
          <>
            Вы уверены, что хотите удалить пайплайн{' '}
            <span className='font-medium text-gray-700 dark:text-gray-300'>
              {deleteModalState.pipeline?.pipelineName || ''}
            </span>
            ? Это действие нельзя отменить.
          </>
        }
        confirmText='Удалить'
        icon={
          <div className='mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30'>
            <svg
              className='h-5 w-5 text-red-600 dark:text-red-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
              />
            </svg>
          </div>
        }
      />

      <ConfirmationModal
        isOpen={triggerModalState.isOpen}
        onClose={() => setTriggerModalState({ isOpen: false, pipeline: null })}
        onConfirm={handleConfirmTrigger}
        title='Подтверждение запуска'
        message={
          <>
            Запустить пайплайн{' '}
            <span className='font-medium text-gray-700 dark:text-gray-300'>
              {triggerModalState.pipeline?.pipelineName || ''}
            </span>
            ?
          </>
        }
        confirmText='Запустить'
        icon={
          <div className='mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30'>
            <svg
              className='h-5 w-5 text-green-600 dark:text-green-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z'
              />
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          </div>
        }
      />
    </TableWithStates>
  );
};

export default PipelinesTable;
