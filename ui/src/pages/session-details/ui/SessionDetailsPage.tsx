import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pipelineSessionsApi } from '../../../features/pipeline-sessions/api/pipelineSessionsApi';
import type {
  PipelineSessionDetailsDto,
  TaskSessionDto,
  ProcessedFileDto,
} from '../../../features/pipeline-sessions/types/types';
import { formatFileSize, formatDuration } from '../../../shared/utils/formatUtils';
import { LoadingState, ErrorState } from '../../../shared/ui/table/components/TableStates';
import ProtectedPage from '../../../shared/components/ProtectedPage';

/** Maps status code to Tailwind badge classes */
const getStatusBadgeClasses = (status: string): string => {
  const map: Record<string, string> = {
    PREPARE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
    ACTIVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
    SUCCESS: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
    FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
    ABORTED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    SKIPPED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  };
  return map[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
};

/** Maps session status to Russian label */
const getStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    PREPARE: 'Подготовка',
    ACTIVE: 'Выполняется',
    SUCCESS: 'Успешно',
    FAILED: 'Ошибка',
    ABORTED: 'Прервано',
  };
  return map[status] || status;
};

/** Maps file status to Russian label */
const getFileStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    SUCCESS: 'Успешно',
    FAILED: 'Ошибка',
    SKIPPED: 'Пропущен',
  };
  return map[status] || status;
};

const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ru-RU');
};

/** Collapsible task section showing processed files */
const TaskSection = ({ task }: { task: TaskSessionDto }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasFiles = task.processedFiles && task.processedFiles.length > 0;
  const taskIcon = task.isDone ? (
    <span className='text-green-500' title='Завершено'>&#10003;</span>
  ) : (
    <span className='text-gray-400' title='Не завершено'>&#9744;</span>
  );

  return (
    <div className='border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className='w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'
      >
        <div className='flex items-center gap-3 min-w-0'>
          <span className='text-lg'>{taskIcon}</span>
          <span className='font-medium text-gray-900 dark:text-white'>
            Шаг {task.taskOrder}: {task.typeCode}
          </span>
          {hasFiles && (
            <span className='text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap'>
              {task.totalFiles ?? 0} файл.
              {task.totalBytes != null && task.totalBytes > 0
                ? `, ${formatFileSize(task.totalBytes)}`
                : ''}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform flex-shrink-0 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
        </svg>
      </button>

      {isExpanded && (
        <div className='border-t border-gray-200 dark:border-gray-700'>
          {hasFiles ? (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead className='bg-gray-50 dark:bg-gray-800'>
                  <tr>
                    <th className='px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Имя файла
                    </th>
                    <th className='px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Размер
                    </th>
                    <th className='px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Статус
                    </th>
                    <th className='px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Ошибка
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                  {task.processedFiles!.map((file: ProcessedFileDto, index: number) => (
                    <tr key={index} className='hover:bg-gray-50 dark:hover:bg-gray-700/30'>
                      <td className='px-4 py-2 text-gray-900 dark:text-gray-200 font-mono text-xs break-all'>
                        {(file.fileName || '').split('/').pop()}
                      </td>
                      <td className='px-4 py-2 text-right text-gray-700 dark:text-gray-300 whitespace-nowrap'>
                        {formatFileSize(file.fileSize)}
                      </td>
                      <td className='px-4 py-2 text-center'>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(file.status)}`}
                        >
                          {getFileStatusLabel(file.status)}
                        </span>
                      </td>
                      <td className='px-4 py-2 text-red-600 dark:text-red-400 text-xs max-w-xs truncate'>
                        {file.errorMessage || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className='p-4 text-center text-gray-500 dark:text-gray-400 text-sm'>
              Нет обработанных файлов
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SessionDetailsContent = ({ id }: { id: string }) => {
  const navigate = useNavigate();
  const [data, setData] = useState<PipelineSessionDetailsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await pipelineSessionsApi.getPipelineSessionDetails(id);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные сессии');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return <LoadingState message='Загрузка данных сессии...' />;
  }

  if (error) {
    return (
      <ErrorState error={new Error(error)} onRetry={loadData} entityName='данные сессии' />
    );
  }

  if (!data) {
    return (
      <div className='flex justify-center items-center p-12'>
        <div className='text-lg text-gray-600 dark:text-gray-400'>Сессия не найдена</div>
      </div>
    );
  }

  const duration = formatDuration(data.startDt, data.updatedAt);

  return (
    <div className='space-y-6'>
      {/* Back button */}
      <button
        onClick={() => navigate('/sessions')}
        className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors'
      >
        <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M15 19l-7-7 7-7'
          />
        </svg>
        Назад к сессиям
      </button>

      {/* Session header */}
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
        <div className='flex flex-wrap items-start justify-between gap-4 mb-4'>
          <div>
            <h1 className='text-xl font-bold text-gray-900 dark:text-white'>
              {data.pipelineName || 'Без названия'}
            </h1>
            <p className='text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono'>
              ID: {data.id}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClasses(data.status)}`}
          >
            {getStatusLabel(data.status)}
          </span>
        </div>

        {/* Info grid */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          <div className='flex flex-col space-y-1'>
            <span className='text-xs font-medium text-gray-500 dark:text-gray-400'>
              Время начала
            </span>
            <span className='text-sm text-gray-900 dark:text-gray-200'>
              {formatDateTime(data.startDt)}
            </span>
          </div>
          <div className='flex flex-col space-y-1'>
            <span className='text-xs font-medium text-gray-500 dark:text-gray-400'>
              Длительность
            </span>
            <span className='text-sm text-gray-900 dark:text-gray-200'>{duration || '-'}</span>
          </div>
          <div className='flex flex-col space-y-1'>
            <span className='text-xs font-medium text-gray-500 dark:text-gray-400'>
              Файлов
            </span>
            <span className='text-sm font-semibold text-gray-900 dark:text-gray-200'>
              {data.totalFiles ?? 0}
            </span>
          </div>
          <div className='flex flex-col space-y-1'>
            <span className='text-xs font-medium text-gray-500 dark:text-gray-400'>
              Объём
            </span>
            <span className='text-sm font-semibold text-gray-900 dark:text-gray-200'>
              {formatFileSize(data.totalBytes ?? 0)}
            </span>
          </div>
        </div>

        {/* Error message */}
        {data.errorMessage && (
          <div className='mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <p className='text-sm text-red-700 dark:text-red-400'>
              <span className='font-medium'>Ошибка:</span> {data.errorMessage}
            </p>
          </div>
        )}
      </div>

      {/* Tasks list */}
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold text-gray-800 dark:text-white'>
            Задачи ({data.tasks?.length || 0})
          </h2>
        </div>

        {data.tasks && data.tasks.length > 0 ? (
          <div className='space-y-3'>
            {data.tasks.map((task: TaskSessionDto) => (
              <TaskSection key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
            Нет задач в данной сессии
          </div>
        )}
      </div>
    </div>
  );
};

const SessionDetailsPage = () => {
  const { id } = useParams();

  if (!id) {
    return <div className='p-8 text-center text-red-600'>Ошибка: ID сессии не указан</div>;
  }

  return (
    <ProtectedPage
      pages={['sessions']}
      permissions={['page.sessions']}
      pageName='SessionDetailsPage'
    >
      <SessionDetailsContent id={id} />
    </ProtectedPage>
  );
};

export default SessionDetailsPage;
