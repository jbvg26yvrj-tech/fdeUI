import React, { useRef } from 'react';
import '../ui/table/table.css';
import { TableIcon, CardsIcon } from '../ui/table/lib/icons';

interface ViewModeLayoutProps {
  displayMode: 'table' | 'cards';
  setDisplayMode: (mode: 'table' | 'cards') => void;
  isLoading: boolean;
  skeletonTable: React.ReactNode;
  skeletonCards: React.ReactNode;
  children: () => React.ReactNode; // функция, возвращающая контент (например, Table)
  className?: string;
  headerActions?: React.ReactNode;
}

export const ViewModeLayout: React.FC<ViewModeLayoutProps> = ({
  displayMode,
  setDisplayMode,
  isLoading,
  skeletonTable,
  skeletonCards,
  children,
  className = '',
  headerActions,
}) => {
  const hasLoaded = useRef(false);
  if (!isLoading) hasLoaded.current = true;
  return (
    <div className={`fde-view-layout min-w-0 space-y-3 ${className}`}>
      <div className='flex flex-wrap justify-between items-center gap-3'>
        <div className='flex flex-wrap items-center gap-2'>{headerActions}</div>
        <div className='fde-view-switch flex space-x-1' role='group' aria-label='Вид данных'>
          <button
            onClick={() => setDisplayMode('table')}
            className={`p-2 rounded-md transition-colors ${
              displayMode === 'table'
                ? 'bg-blue-100 dark:bg-blue-900'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title='Таблица'
            aria-label='Таблица'
            aria-pressed={displayMode === 'table'}
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
            aria-label='Карточки'
            aria-pressed={displayMode === 'cards'}
          >
            <CardsIcon active={displayMode === 'cards'} />
          </button>
        </div>
      </div>

      {isLoading && !hasLoaded.current ? (displayMode === 'table' ? skeletonTable : skeletonCards) : children()}
    </div>
  );
};
