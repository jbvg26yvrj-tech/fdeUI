import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { schedulesApi } from '../api/schedulesApi';
import { parseCronExpression } from '../../../shared/ui/table/lib/cron';
import { usePermissions } from '../../../shared/hooks/usePermissions';
import { ConfirmationModal } from '../../../shared/components/ConfirmationModal';
import { Button } from '../../../shared/ui/Button';
import { Modal } from '../../../shared/ui/Modal';
import { ApiError } from '../../../shared/api/ApiError';
import type { ScheduleData } from '../types/ScheduleTypes';

interface ScheduleSectionProps {
  pipelineId: string;
}

const COMMON_CRON_VALUES = [
  { value: '0 */5 * * * ?', label: 'Каждые 5 минут' },
  { value: '0 */10 * * * ?', label: 'Каждые 10 минут' },
  { value: '0 */30 * * * ?', label: 'Каждые 30 минут' },
  { value: '0 0 * * * ?', label: 'Каждый час' },
  { value: '0 0 0 * * ?', label: 'Ежедневно в полночь' },
  { value: '0 0 12 * * ?', label: 'Ежедневно в полдень' },
  { value: '0 0 9 * * MON-FRI', label: 'В будни в 9:00' },
  { value: '0 0 0 1 * ?', label: 'В первый день месяца' },
];

export const ScheduleSection = ({ pipelineId }: ScheduleSectionProps) => {
  const { permissions } = usePermissions();

  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Modal states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [cronValue, setCronValue] = useState('0 */10 * * * ?');
  const [isSaving, setIsSaving] = useState(false);

  const [isCollapsed, setIsCollapsed] = useState(false);

  const loadSchedule = useCallback(async () => {
    setIsLoading(true);
    setNotFound(false);
    try {
      const data = await schedulesApi.getSchedule(pipelineId);
      setSchedule(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setSchedule(null);
        setNotFound(true);
      } else {
        console.error('Failed to load schedule:', err);
        toast.error('Не удалось загрузить расписание');
      }
    } finally {
      setIsLoading(false);
    }
  }, [pipelineId]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const handleOpenCreate = () => {
    setCronValue('0 */10 * * * ?');
    setEditorMode('create');
    setIsEditorOpen(true);
  };

  const handleOpenEdit = () => {
    if (schedule) {
      setCronValue(schedule.cronExpression);
    }
    setEditorMode('edit');
    setIsEditorOpen(true);
  };

  const handleSave = async () => {
    if (!cronValue.trim()) {
      toast.error('Cron-выражение не может быть пустым');
      return;
    }

    setIsSaving(true);
    try {
      if (editorMode === 'create') {
        const created = await schedulesApi.createSchedule({
          pipelineId,
          cronExpression: cronValue,
        });
        setSchedule(created);
        setNotFound(false);
        toast.success('Расписание успешно создано');
      } else {
        const updated = await schedulesApi.updateSchedule(pipelineId, {
          cronExpression: cronValue,
        });
        setSchedule(updated);
        toast.success('Расписание успешно обновлено');
      }
      setIsEditorOpen(false);
    } catch (err) {
      console.error('Failed to save schedule:', err);
      const message =
        err instanceof ApiError ? err.message : 'Произошла ошибка при сохранении расписания';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await schedulesApi.deleteSchedule(pipelineId);
      setSchedule(null);
      setNotFound(true);
      toast.success('Расписание удалено');
    } catch (err) {
      console.error('Failed to delete schedule:', err);
      const message =
        err instanceof ApiError ? err.message : 'Произошла ошибка при удалении расписания';
      toast.error(message);
    }
  };

  return (
    <>
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden'>
        {/* Header */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className='w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
        >
          <div className='flex items-center gap-3'>
            <h2 className='text-lg font-semibold text-gray-800 dark:text-white'>Расписание</h2>
            {!isLoading && schedule && schedule.active && (
              <span className='bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 text-xs font-medium px-2 py-0.5 rounded-full'>
                Активно
              </span>
            )}
            {!isLoading && schedule && !schedule.active && (
              <span className='bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 text-xs font-medium px-2 py-0.5 rounded-full'>
                Приостановлено
              </span>
            )}
            {!isLoading && notFound && (
              <span className='bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium px-2 py-0.5 rounded-full'>
                Не задано
              </span>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${
              isCollapsed ? '' : 'rotate-180'
            }`}
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M19 9l-7 7-7-7'
            />
          </svg>
        </button>

        {/* Collapsible content */}
        <div
          style={{ maxHeight: isCollapsed ? 0 : 9999 }}
          className='transition-all duration-300 ease-in-out overflow-hidden'
        >
          <div className='px-4 pb-4'>
            {isLoading && (
              <div className='flex items-center gap-2 py-4'>
                <div className='animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent' />
                <span className='text-sm text-gray-500 dark:text-gray-400'>
                  Загрузка расписания...
                </span>
              </div>
            )}

            {!isLoading && schedule && (
              <div className='space-y-3'>
                {/* Cron info */}
                <div className='bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3'>
                  <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                    <div className='flex-1'>
                      <div className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                        {parseCronExpression(schedule.cronExpression)}
                      </div>
                      <div className='text-xs font-mono text-gray-500 dark:text-gray-400 mt-1'>
                        {schedule.cronExpression}
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      {permissions?.canScheduleUpdate && (
                        <Button variant='outlined' size='sm' onClick={handleOpenEdit}>
                          Редактировать
                        </Button>
                      )}
                      {permissions?.canScheduleDelete && (
                        <Button
                          variant='outlinedError'
                          size='sm'
                          onClick={() => setIsDeleteOpen(true)}
                        >
                          Удалить
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isLoading && notFound && (
              <div className='py-4 text-center'>
                <div className='text-gray-400 dark:text-gray-500 text-sm mb-3'>
                  Расписание не установлено
                </div>
                {permissions?.canScheduleCreate && (
                  <Button variant='primary' size='sm' onClick={handleOpenCreate}>
                    Создать расписание
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cron Editor Modal */}
      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editorMode === 'create' ? 'Создание расписания' : 'Редактирование расписания'}
        variant='custom'
        size='sm'
        footer={
          <div className='flex justify-end space-x-2'>
            <Button
              variant='outlined'
              size='sm'
              onClick={() => setIsEditorOpen(false)}
              disabled={isSaving}
            >
              Отмена
            </Button>
            <Button variant='primary' size='sm' onClick={handleSave} disabled={isSaving}>
              {isSaving
                ? 'Сохранение...'
                : editorMode === 'create'
                  ? 'Создать'
                  : 'Сохранить'}
            </Button>
          </div>
        }
      >
        <div className='space-y-4'>
          {/* Cron input */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Cron-выражение
            </label>
            <input
              type='text'
              value={cronValue}
              onChange={e => setCronValue(e.target.value)}
              placeholder='0 0/10 * * * ?'
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'
              autoFocus
            />
            <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
              Формат: секунды минуты часы день_месяца месяц день_недели
            </p>
          </div>

          {/* Preview */}
          <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3'>
            <div className='text-sm text-green-700 dark:text-green-300'>
              {parseCronExpression(cronValue)}
            </div>
          </div>

          {/* Common presets */}
          <div>
            <label className='block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2'>
              Часто используемые:
            </label>
            <div className='grid grid-cols-1 gap-1 max-h-40 overflow-y-auto'>
              {COMMON_CRON_VALUES.map((item, index) => (
                <button
                  key={index}
                  type='button'
                  className={`text-left p-2 text-xs rounded border transition-colors ${
                    cronValue === item.value
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-600'
                      : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setCronValue(item.value)}
                >
                  <div className='font-mono text-blue-600 dark:text-blue-400'>{item.value}</div>
                  <div className='text-gray-600 dark:text-gray-400'>{item.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title='Удаление расписания'
        message='Вы уверены, что хотите удалить расписание для этого пайплайна? Автоматический запуск будет прекращен.'
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
    </>
  );
};
