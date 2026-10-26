// src/features/session-progress/ui/SessionProgressTable.tsx
// Session progress (file-level tracking) is not available in fde-api.
// This component displays an informational message instead.

import React from 'react';

interface SessionProgressTableProps {
  onToggleColumnVisibility?: (columnKey: string) => void;
  columnWidths?: Record<string, number>;
  onColumnResize?: (columnKey: string, newWidth: number) => void;
}

export const SessionProgressTable: React.FC<SessionProgressTableProps> = () => {
  return (
    <div className='p-8 text-center'>
      <div className='max-w-md mx-auto'>
        <div className='mb-4'>
          <svg
            className='w-16 h-16 mx-auto text-gray-400 dark:text-gray-500'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={1.5}
              d='M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
            />
          </svg>
        </div>
        <h3 className='text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2'>
          Прогресс сессий недоступен
        </h3>
        <p className='text-sm text-gray-500 dark:text-gray-400'>
          Детальный прогресс обработки файлов пока не поддерживается в текущей версии API.
          Информация о задачах сессии доступна на странице сессий.
        </p>
      </div>
    </div>
  );
};
