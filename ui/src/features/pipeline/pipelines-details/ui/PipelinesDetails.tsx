import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPipelinesDetails } from '../api/PipelinesDetailsApi';
import { TasksAccordion, TaskItem, TaskHeader, TaskContent } from './components/TasksAccordion';
import { ScheduleSection } from '../../components/ScheduleSection';
import type { PipelineData, Task } from '../../types/Types';
import { ErrorState, LoadingState } from '../../../../shared/ui/table/components/TableStates';

// Вспомогательный компонент для безопасного отображения данных
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SafeDisplay = ({ value, className = '' }: { value: any; className?: string }) => {
  if (value === null || value === undefined) {
    return <span className={`text-gray-400 dark:text-gray-500 ${className}`}>N/A</span>;
  }

  if (typeof value === 'object') {
    return (
      <pre
        className={`text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded ${className} dark:text-gray-200`}
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          value
            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
        } ${className}`}
      >
        {value ? '🟢 Да' : '🔴 Нет'}
      </span>
    );
  }

  return <span className={`dark:text-gray-200 ${className}`}>{value}</span>;
};

export const PipelinesDetails = ({ id }: { id: string }) => {
  const [data, setData] = useState<PipelineData>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBasicInfoCollapsed, setIsBasicInfoCollapsed] = useState(false);
  const [allTasksExpanded, setAllTasksExpanded] = useState(false);

  const basicInfoContentRef = useRef<HTMLDivElement>(null);

  const loadServerData = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchPipelinesDetails(id);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServerData(id);
  }, [loadServerData, id]);

  const toggleBasicInfoCollapse = () => {
    setIsBasicInfoCollapsed(!isBasicInfoCollapsed);
  };

  const toggleAllTasks = () => {
    setAllTasksExpanded(!allTasksExpanded);
  };

  // Вычисляем высоту контента для плавной анимации
  const basicInfoContentHeight = isBasicInfoCollapsed
    ? 0
    : basicInfoContentRef.current?.scrollHeight || 0;

  if (isLoading) {
    // Используем единообразный компонент загрузки
    return <LoadingState message='Загрузка деталей пайплайна...' />;
  }

  if (error) {
    // Используем единообразный компонент ошибки с кнопкой повтора
    const errorObject = new Error(error);
    return (
      <ErrorState
        error={errorObject}
        onRetry={() => loadServerData(id)}
        entityName='детали пайплайна'
      />
    );
  }

  if (!data) {
    return (
      <div className='flex justify-center items-center p-12'>
        <div className='text-lg text-gray-600 dark:text-gray-400'>No data found</div>
      </div>
    );
  }

  return (
    <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700'>
      <div className='max-w-full mx-auto'>
        {/* Основная информация о пайплайне - Collapsible */}
        <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden'>
          {/* Заголовок с кнопкой сворачивания */}
          <button
            onClick={toggleBasicInfoCollapse}
            className='w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
          >
            <h2 className='text-lg font-semibold text-gray-800 dark:text-white'>
              Основная информация
            </h2>
            <svg
              className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${
                isBasicInfoCollapsed ? '' : 'rotate-180'
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
            ref={basicInfoContentRef}
            style={{ height: basicInfoContentHeight }}
            className='transition-all duration-300 ease-in-out overflow-hidden'
          >
            <div className='px-4 pb-4'>
              {/* Компактная сетка информации */}
              <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4'>
                <div className='flex flex-col space-y-1'>
                  <label className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                    Идентификатор
                  </label>
                  <SafeDisplay
                    value={data.id}
                    className='text-sm font-semibold text-gray-900 dark:text-white'
                  />
                </div>

                <div className='flex flex-col space-y-1'>
                  <label className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                    Название
                  </label>
                  <SafeDisplay
                    value={data.pipelineName}
                    className='text-sm font-semibold text-gray-900 dark:text-white'
                  />
                </div>

                <div className='flex flex-col space-y-1'>
                  <label className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                    От клиента
                  </label>
                  <SafeDisplay
                    value={data.clientFrom}
                    className='text-sm text-gray-800 dark:text-gray-200'
                  />
                </div>

                <div className='flex flex-col space-y-1'>
                  <label className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                    К клиенту
                  </label>
                  <SafeDisplay
                    value={data.clientTo}
                    className='text-sm text-gray-800 dark:text-gray-200'
                  />
                </div>

                <div className='flex flex-col space-y-1'>
                  <label className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                    Датацентр
                  </label>
                  <SafeDisplay
                    value={data.primaryDatacenter}
                    className='text-sm text-gray-800 dark:text-gray-200'
                  />
                </div>

                <div className='flex flex-col space-y-1'>
                  <label className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                    Создан
                  </label>
                  <SafeDisplay
                    value={
                      data.createdAt
                        ? new Date(data.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : null
                    }
                    className='text-sm text-gray-800 dark:text-gray-200'
                  />
                </div>

                <div className='flex flex-col space-y-1'>
                  <label className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                    Обновлен
                  </label>
                  <SafeDisplay
                    value={
                      data.updatedAt
                        ? new Date(data.updatedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : null
                    }
                    className='text-sm text-gray-800 dark:text-gray-200'
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Секция расписания */}
        <ScheduleSection pipelineId={id} />

        {/* Секция задач с аккордеоном */}
        <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
          {/* Изменено: добавлены flex-wrap и gap для адаптивности */}
          <div className='flex flex-wrap items-center justify-between gap-3 mb-6'>
            <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>Задачи (таски)</h2>
            <div className='flex flex-wrap items-center gap-3'>
              <span className='bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-sm font-medium px-3 py-1 rounded-full'>
                {data.tasks?.length || 0} задач
              </span>
              <button
                onClick={toggleAllTasks}
                className='bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium px-3 py-1 rounded transition-colors'
              >
                {allTasksExpanded ? 'Свернуть всё' : 'Развернуть всё'}
              </button>
            </div>
          </div>

          {data.tasks && data.tasks.length > 0 ? (
            <TasksAccordion forceExpandAll={allTasksExpanded}>
              {data.tasks.map((task: Task, index: number) => (
                <TaskItem key={task.id} index={index} task={task} isExpanded={allTasksExpanded}>
                  <TaskHeader />
                  <TaskContent />
                </TaskItem>
              ))}
            </TasksAccordion>
          ) : (
            <div className='text-center py-8'>
              <div className='text-gray-400 dark:text-gray-500 text-lg'>Нет задач</div>
              <div className='text-gray-500 dark:text-gray-400 text-sm mt-2'>
                В пайплайне нет задач (тасок)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PipelinesDetails;
