import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import { collectMatchingPipelines, prepareSchedules, restoreSchedule, stopSchedule } from './selection';
import type { TableParams } from '../../../shared/ui/table/types/type';
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

  const requestParams = useRef<TableParams>({ pagination: { page: 1, size: 20 }, filters: {}, sort: null });
  const collection = useRef<AbortController | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [wizardIds, setWizardIds] = useState<string[]>([]);
  const [wizardDc, setWizardDc] = useState<'SC' | 'SP'>('SP');
  const changingDatacenter = useRef(false);
  useEffect(() => () => { collection.current?.abort(); }, []);

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
      if (params) requestParams.current = params;
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

  const selectionLocked = isCollecting || isPreparingWizard || wizardStep !== 'select';
  const onTableChange = (params: TableParams) => {
    if (isPreparingWizard || wizardStep !== 'select') return;
    if (JSON.stringify(requestParams.current.filters) !== JSON.stringify(params.filters)) {
      collection.current?.abort();
      collection.current = null;
      setIsCollecting(false);
      setSelectedIds(new Set());
    }
    requestParams.current = params;
    handleTableChange(params);
  };
  const selectAllMatching = async () => {
    if (selectionLocked || isLoading || error) return;
    const controller = new AbortController();
    collection.current = controller;
    setIsCollecting(true);
    const params = structuredClone(requestParams.current);
    try {
      const rows = await collectMatchingPipelines(params, serverMeta?.pagination.totalElements || 0, params => fetchPipelines(params, controller.signal), controller.signal);
      if (collection.current !== controller || controller.signal.aborted) return;
      setSelectedIds(new Set(rows.map(row => row.id)));
      setPipelineNames(prev => new Map([...prev, ...rows.map(row => [row.id, row.pipelineName] as const)]));
    } catch (err) {
      if (!controller.signal.aborted) toast.error(err instanceof Error ? err.message : 'Не удалось собрать маршруты. Предыдущий выбор сохранён.');
    } finally {
      if (collection.current === controller) {
        collection.current = null;
        setIsCollecting(false);
      }
    }
  };
  const cancelCollection = () => {
    collection.current?.abort();
    collection.current = null;
    setIsCollecting(false);
  };

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

  const getItemName = useCallback((id: string) => pipelineNames.get(id) || id.substring(0, 8), [pipelineNames]);

  // Freeze the reviewed IDs and destination before any schedule preparation.
  const startWizard = useCallback(async () => {
    if (selectionLocked || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const dc = selectedDc;
    setIsPreparingWizard(true);
    try {
      const schedules = await prepareSchedules(ids, schedulesApi.getSchedule);
      setSavedSchedules(schedules);
      setWizardIds(ids);
      setWizardDc(dc);
      setStepItems(ids.map(id => ({ id, label: getItemName(id) })));
      setWizardStep('confirm');
    } catch (err) {
      setSavedSchedules(new Map());
      setStepItems([]);
      setWizardIds([]);
      toast.error(`Не удалось загрузить расписания. Смена ЦОД не начата. ${err instanceof Error ? err.message : ''}`);
    } finally {
      setIsPreparingWizard(false);
    }
  }, [selectedIds, selectedDc, selectionLocked, getItemName]);

  // --- Step handlers ---
  const handleStopExecute = useCallback(async (id: string): Promise<ItemResult> => {
    if (!savedSchedules.has(id)) return 'skipped';
    await stopSchedule(id, schedulesApi.deleteSchedule);
    return 'success';
  }, [savedSchedules]);

  const handleTriggerExecute = useCallback(async (id: string): Promise<ItemResult> => {
    await triggersApi.manualTrigger(id);
    return 'success';
  }, []);

  const handleChangeDc = useCallback(async () => {
    if (wizardIds.length === 0 || changingDatacenter.current) return;
    changingDatacenter.current = true;
    try {
      const result = await pipelinesCrudApi.bulkChangeDatacenter(
        wizardDc,
        [...wizardIds],
      );
      toast.success(`ЦОД изменён на ${result.datacenter}. Обновлено: ${result.updatedCount}`);
      setWizardStep('restore');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Ошибка при смене ЦОД';
      toast.error(message);
    } finally {
      changingDatacenter.current = false;
    }
  }, [wizardDc, wizardIds]);

  const handleRestoreExecute = useCallback(async (id: string): Promise<ItemResult> => {
    const cron = savedSchedules.get(id);
    if (!cron) return 'skipped';
    await restoreSchedule(id, cron, schedulesApi.getSchedule, schedulesApi.createSchedule);
    return 'success';
  }, [savedSchedules]);

  const handleWizardComplete = useCallback(() => {
    setWizardStep('select');
    setSelectedIds(new Set());
    loadServerData();
  }, [loadServerData]);

  const handleCancelWizard = useCallback(() => {
    if (changingDatacenter.current) return;
    // After schedule changes, leaving the flow must first restore saved schedules.
    setWizardStep(wizardStep === 'confirm' ? 'select' : 'restore');
  }, [wizardStep]);

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
          disabled={selectionLocked || isLoading || !!error}
          aria-label={`Выбрать ${row.pipelineName}`}
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
          <Button variant='outlined' size='sm' onClick={selectAllOnPage} disabled={isLoading || selectionLocked || !!error}>
            Выбрать все на странице
          </Button>
          <Button variant='outlined' size='sm' onClick={selectAllMatching} disabled={isLoading || selectionLocked || !!error || !serverMeta?.pagination.totalElements}>
            Выбрать все {serverMeta?.pagination.totalElements || 0} по фильтрам
          </Button>
          {isCollecting && <Button variant='outlined' size='sm' onClick={cancelCollection}>Отменить сбор</Button>}
          <Button variant='outlined' size='sm' onClick={deselectAll} disabled={selectedIds.size === 0 || selectionLocked}>
            Снять выбор
          </Button>
        </div>
        <div className='flex items-center gap-3'>
          <span className='text-sm text-gray-600 dark:text-gray-400'>Новый ЦОД:</span>
          <select
            disabled={selectionLocked}
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
            disabled={selectedIds.size === 0 || selectionLocked || isLoading || !!error}
          >
            {isPreparingWizard ? 'Загрузка...' : 'Сменить ЦОД'}
          </Button>
        </div>
      </div>

      {isCollecting && <p role='status'>Собираем и проверяем все маршруты по фильтрам. Действия доступны после завершения.</p>}
      <label className='flex items-center gap-2 text-sm'>
        Маршрутов на странице
        <select aria-label='Маршрутов на странице' disabled={selectionLocked || isLoading} value={serverMeta?.pagination.size || 20}
          onChange={event => onTableChange({ ...requestParams.current, pagination: { page: 1, size: Number(event.target.value) } })}>
          {[20, 50, 100, 200].map(size => <option key={size} value={size}>{size}</option>)}
        </select>
      </label>
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
          onTableChange={onTableChange}
          pageSize={serverMeta?.pagination.size || 20}
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
              Выбрано маршрутов: <span className='font-semibold'>{wizardIds.length}</span>.
              Новый ЦОД: <span className='font-semibold'>{wizardDc}</span>.
            </p>
            <p>Не закрывайте и не перезагружайте страницу до восстановления расписаний. После перезагрузки сохранённые расписания недоступны для автоматического восстановления.</p>
            <p>Будет выполнено последовательно:</p>
            <ol className='list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400'>
              <li>Остановить расписания ({scheduleStepItems.length} маршрутов с расписанием)</li>
              <li>Запустить маршруты принудительно ({stepItems.length})</li>
              <li>Сменить ЦОД на {wizardDc}</li>
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
        allowRetry={false}
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
        cancelText='Восстановить расписания и завершить'
        confirmText='Сменить ЦОД'
        message={
          <p className='text-center'>
            Сменить ЦОД на <span className='font-semibold'>{wizardDc}</span> для{' '}
            <span className='font-semibold'>{wizardIds.length}</span> маршрутов?
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
