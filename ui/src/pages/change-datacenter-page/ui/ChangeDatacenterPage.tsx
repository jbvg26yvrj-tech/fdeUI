import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { fetchPipelines, mapServerResponseToTableMeta } from '../../../features/pipeline/pipelines-table/api/pipelinesTableApi';
import { pipelinesCrudApi } from '../../../features/pipeline/api/pipelinesCrudApi';
import { schedulesApi } from '../../../features/pipeline/api/schedulesApi';
import { triggersApi } from '../../../features/pipeline/api/triggersApi';
import { ConfirmationModal } from '../../../shared/components/ConfirmationModal';
import StepProgressModal from './StepProgressModal';
import type { StepItem, ItemResult } from './StepProgressModal';
import type { SimplePipelineData } from '../../../features/pipeline/types/Types';
import type { Column } from '../../../shared/ui/table/types/type';
import Table from '../../../shared/ui/table/Table';
import { TableWithStates } from '../../../shared/ui/table/components/TableStates';
import { SYS_TABLE_RESOURCES } from '../../../shared/resources';
import { useTableData } from '../../../shared/ui/table/hooks/useTableData';
import { ApiError } from '../../../shared/api/ApiError';
import { Button } from '../../../shared/ui/Button';
import {
  createTextColumn,
  createCheckboxColumn,
} from '../../../shared/ui/table/lib/columnFactory';

const DATACENTER_OPTIONS = [
  { value: 'SP', label: 'SP (SouthPort)' },
  { value: 'SC', label: 'SC (SberCloud)' },
];

type WizardStep = 'select' | 'confirm' | 'stop' | 'trigger' | 'changeDc' | 'restore';

const ChangeDatacenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedDc, setSelectedDc] = useState<'SC' | 'SP'>('SP');

  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>('select');
  const [savedSchedules, setSavedSchedules] = useState<Map<string, string>>(new Map());
  const [stepItems, setStepItems] = useState<StepItem[]>([]);
  const [isPreparingWizard, setIsPreparingWizard] = useState(false);

  // Pipeline name map for display
  const [pipelineNames, setPipelineNames] = useState<Map<string, string>>(new Map());

  const {
    data,
    isLoading,
    error,
    serverMeta,
    savedState,
    loadServerData,
    handleTableChange,
    permissionsLoading,
    isLoadingState,
  } = useTableData<SimplePipelineData>({
    resourceCode: SYS_TABLE_RESOURCES.TABLE_PIPELINES.code,
    fetchData: async (params) => {
      const response = await fetchPipelines(params);
      return {
        data: response.content,
        meta: mapServerResponseToTableMeta(response),
      };
    },
    defaultPageSize: 20,
    onDataLoaded: (loaded) => {
      // Keep pipeline names in sync for display in wizard steps
      setPipelineNames(prev => {
        const next = new Map(prev);
        loaded.forEach(p => next.set(p.id, p.pipelineName));
        return next;
      });
    },
  });

  const isValidationError = error instanceof ApiError && error.status === 400;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllOnPage = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      data.forEach(p => next.add(p.id));
      return next;
    });
  }, [data]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const getItemName = (id: string) => pipelineNames.get(id) || id.substring(0, 8);

  const buildStepItems = useCallback((): StepItem[] => {
    return Array.from(selectedIds).map(id => ({
      id,
      label: getItemName(id),
    }));
  }, [selectedIds, pipelineNames]);

  // --- Wizard start: fetch schedules, then go to confirm ---
  const startWizard = useCallback(async () => {
    setIsPreparingWizard(true);
    const schedules = new Map<string, string>();
    const ids = Array.from(selectedIds);

    for (const id of ids) {
      try {
        const schedule = await schedulesApi.getSchedule(id);
        if (schedule?.cronExpression) {
          schedules.set(id, schedule.cronExpression);
        }
      } catch {
        // No schedule for this pipeline — that's fine
      }
    }

    setSavedSchedules(schedules);
    setStepItems(buildStepItems());
    setIsPreparingWizard(false);
    setWizardStep('confirm');
  }, [selectedIds, buildStepItems]);

  // --- Step handlers ---
  const handleStopExecute = useCallback(async (id: string): Promise<ItemResult> => {
    if (!savedSchedules.has(id)) return 'skipped';
    try {
      await schedulesApi.deleteSchedule(id);
      return 'success';
    } catch (err) {
      throw err;
    }
  }, [savedSchedules]);

  const handleTriggerExecute = useCallback(async (id: string): Promise<ItemResult> => {
    try {
      await triggersApi.manualTrigger(id);
      return 'success';
    } catch (err) {
      throw err;
    }
  }, []);

  const handleChangeDc = useCallback(async () => {
    try {
      const result = await pipelinesCrudApi.bulkChangeDatacenter(
        selectedDc,
        Array.from(selectedIds),
      );
      toast.success(`ЦОД изменён на ${result.datacenter}. Обновлено: ${result.updatedCount}`);
      setWizardStep('restore');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Ошибка при смене ЦОД';
      toast.error(message);
    }
  }, [selectedDc, selectedIds]);

  const handleRestoreExecute = useCallback(async (id: string): Promise<ItemResult> => {
    const cron = savedSchedules.get(id);
    if (!cron) return 'skipped';
    try {
      await schedulesApi.createSchedule({ pipelineId: id, cronExpression: cron });
      return 'success';
    } catch (err) {
      throw err;
    }
  }, [savedSchedules]);

  const handleWizardComplete = useCallback(() => {
    setWizardStep('select');
    setSelectedIds(new Set());
    loadServerData();
  }, [loadServerData]);

  const handleCancelWizard = useCallback(() => {
    setWizardStep('select');
  }, []);

  // --- Step items filtered for schedules (stop/restore only run for those with schedules) ---
  const scheduleStepItems = stepItems.filter(item => savedSchedules.has(item.id));

  const columns: Column<SimplePipelineData>[] = [
    {
      key: '_select' as keyof SimplePipelineData,
      title: '',
      sortable: false,
      filterable: false,
      width: 50,
      render: (_value: unknown, row: SimplePipelineData) => (
        <input
          type='checkbox'
          checked={selectedIds.has(row.id)}
          onChange={() => toggleSelect(row.id)}
          className='w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 cursor-pointer'
        />
      ),
    },
    createTextColumn('pipelineName', 'Название', { width: 200 }),
    createTextColumn('clientFrom', 'От клиента', { width: 150 }),
    createTextColumn('clientTo', 'К клиенту', { width: 150 }),
    createTextColumn('primaryDatacenter', 'Датацентр', { width: 120 }),
    createCheckboxColumn('allOrNothing', 'Всё или ничего', { width: 120 }),
  ];

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <button
            onClick={() => navigate('/pipelines')}
            className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors'
            title='Назад к маршрутам'
          >
            <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
            </svg>
          </button>
          <h1 className='text-xl font-semibold text-gray-900 dark:text-white'>
            Смена ЦОД
          </h1>
        </div>
      </div>

      {/* Controls */}
      <div className='flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3'>
        <div className='flex items-center gap-3'>
          <span className='text-sm text-gray-600 dark:text-gray-400'>
            Выбрано: <span className='font-semibold text-gray-900 dark:text-white'>{selectedIds.size}</span>
          </span>
          <Button variant='outlined' size='sm' onClick={selectAllOnPage} disabled={isLoading}>
            Выбрать все на странице
          </Button>
          <Button variant='outlined' size='sm' onClick={deselectAll} disabled={selectedIds.size === 0}>
            Снять выбор
          </Button>
        </div>
        <div className='flex items-center gap-3'>
          <span className='text-sm text-gray-600 dark:text-gray-400'>Новый ЦОД:</span>
          <select
            value={selectedDc}
            onChange={e => setSelectedDc(e.target.value as 'SC' | 'SP')}
            className='px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500'
          >
            {DATACENTER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <Button
            variant='primary'
            size='sm'
            onClick={startWizard}
            disabled={selectedIds.size === 0 || isPreparingWizard}
          >
            {isPreparingWizard ? 'Загрузка...' : 'Сменить ЦОД'}
          </Button>
        </div>
      </div>

      {/* Table */}
      <TableWithStates
        permissionsLoading={permissionsLoading}
        isLoadingState={isLoadingState}
        error={error}
        onRetry={() => loadServerData()}
        entityName='маршруты'
        isLoadingData={false}
        isValidationError={isValidationError}
      >
        <Table<SimplePipelineData>
          data={data}
          columns={columns}
          loading={isLoading}
          onTableChange={handleTableChange}
          serverMeta={serverMeta}
          initialFilters={savedState?.filters}
          initialSort={
            savedState?.sortBy
              ? { field: savedState.sortBy, order: savedState.sortOrder || 'asc' }
              : null
          }
          showFilters={true}
          showPagination={true}
          caption='Смена ЦОД'
          rowKey='id'
        />
      </TableWithStates>

      {/* === Wizard Modals === */}

      {/* Step 0: Confirm start */}
      <ConfirmationModal
        isOpen={wizardStep === 'confirm'}
        onClose={handleCancelWizard}
        onConfirm={() => setWizardStep('stop')}
        title='Смена ЦОД — Подтверждение'
        confirmText='Начать'
        message={
          <div className='space-y-3 text-sm'>
            <p>
              Выбрано маршрутов: <span className='font-semibold'>{selectedIds.size}</span>.
              Новый ЦОД: <span className='font-semibold'>{selectedDc}</span>.
            </p>
            <p>Будет выполнено последовательно:</p>
            <ol className='list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400'>
              <li>Остановить расписания ({scheduleStepItems.length} маршрутов с расписанием)</li>
              <li>Запустить маршруты принудительно ({stepItems.length})</li>
              <li>Сменить ЦОД на {selectedDc}</li>
              <li>Восстановить расписания ({scheduleStepItems.length})</li>
            </ol>
          </div>
        }
        icon={
          <div className='mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30'>
            <svg className='h-5 w-5 text-amber-600 dark:text-amber-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z' />
            </svg>
          </div>
        }
      />

      {/* Step 1: Stop schedules */}
      <StepProgressModal
        isOpen={wizardStep === 'stop'}
        title='Шаг 1/4 — Остановка расписаний'
        items={scheduleStepItems.length > 0 ? scheduleStepItems : []}
        onExecute={handleStopExecute}
        onComplete={() => setWizardStep('trigger')}
        onCancel={handleCancelWizard}
        nextLabel='Далее'
      />

      {/* Step 2: Manual trigger */}
      <StepProgressModal
        isOpen={wizardStep === 'trigger'}
        title='Шаг 2/4 — Принудительный запуск'
        items={stepItems}
        onExecute={handleTriggerExecute}
        onComplete={() => setWizardStep('changeDc')}
        onCancel={handleCancelWizard}
        skipLabel='Пропустить'
        nextLabel='Далее'
      />

      {/* Step 3: Change DC */}
      <ConfirmationModal
        isOpen={wizardStep === 'changeDc'}
        onClose={handleCancelWizard}
        onConfirm={handleChangeDc}
        title='Шаг 3/4 — Смена ЦОД'
        confirmText='Сменить ЦОД'
        message={
          <p className='text-center'>
            Сменить ЦОД на <span className='font-semibold'>{selectedDc}</span> для{' '}
            <span className='font-semibold'>{selectedIds.size}</span> маршрутов?
          </p>
        }
      />

      {/* Step 4: Restore schedules */}
      <StepProgressModal
        isOpen={wizardStep === 'restore'}
        title='Шаг 4/4 — Восстановление расписаний'
        items={scheduleStepItems.length > 0 ? scheduleStepItems : []}
        onExecute={handleRestoreExecute}
        onComplete={handleWizardComplete}
        nextLabel='Готово'
      />
    </div>
  );
};

export default ChangeDatacenterPage;
