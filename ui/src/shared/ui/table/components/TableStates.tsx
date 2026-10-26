import React, { type ReactNode } from 'react';

interface LoadingStateProps {
  message: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message }) => (
  <div className='flex justify-center items-center p-12 bg-white dark:bg-gray-900'>
    <div className='text-lg text-gray-600 dark:text-gray-400'>{message}</div>
  </div>
);

interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
  entityName?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  entityName = 'данных',
}) => (
  <div className='p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded'>
    <strong>Ошибка:</strong> Не удалось загрузить {entityName}. {error.message}
    <button
      onClick={onRetry}
      className='ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800'
    >
      Повторить
    </button>
  </div>
);

interface TableWithStatesProps {
  permissionsLoading: boolean;
  isLoadingState: boolean;
  error: Error | null;
  onRetry: () => void;
  children: ReactNode;
  entityName: string;
  isLoadingData?: boolean;
  /** Флаг, указывающий, что ошибка связана с неверными параметрами (400) и не должна скрывать контент */
  isValidationError?: boolean;
}

export const TableWithStates: React.FC<TableWithStatesProps> = ({
  permissionsLoading,
  isLoadingState,
  error,
  onRetry,
  children,
  entityName,
  isLoadingData,
  isValidationError = false,
}) => {
  if (permissionsLoading) {
    return <LoadingState message='Загрузка прав доступа...' />;
  }
  if (isLoadingState) {
    return <LoadingState message='Загрузка сохраненных фильтров...' />;
  }

  // Если есть ошибка, и это не валидационная — показываем ErrorState, скрывая контент
  if (error && !isValidationError) {
    return <ErrorState error={error} onRetry={onRetry} entityName={entityName} />;
  }

  // В остальных случаях показываем контент
  // Если есть валидационная ошибка, добавляем баннер сверху
  return (
    <>
      {error && isValidationError && (
        <div className='mb-4 p-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 rounded'>
          <div className='flex items-center justify-between'>
            <div>
              <strong className='font-semibold'>Ошибка в параметрах запроса:</strong>
              <span className='ml-2'>{error.message}</span>
            </div>
          </div>
          <p className='text-sm mt-2'>
            Пожалуйста, исправьте значение фильтра и нажмите "Повторить" или измените фильтр
            автоматически (после изменения он применится с задержкой).
          </p>
        </div>
      )}
      {children}
      {isLoadingData && (
        <div className='absolute inset-0 bg-white dark:bg-gray-900 bg-opacity-50 flex items-center justify-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500' />
        </div>
      )}
    </>
  );
};

export function createTableWithStatesProps(
  entityName: string,
  states: {
    permissionsLoading: boolean;
    isLoadingState: boolean;
    error: Error | null;
    onRetry: () => void;
    isValidationError?: boolean;
  },
) {
  return { entityName, ...states };
}
