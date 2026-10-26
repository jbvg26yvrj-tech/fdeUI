import React from 'react';
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
  return (
    <div className={`space-y-4 ${className}`}>
      <div className='flex justify-between items-center'>
        <div className='flex items-center space-x-2'>
          {headerActions}
        </div>
        <div className='flex space-x-1'>
        <button
          onClick={() => setDisplayMode('table')}
          className={`p-2 rounded-md transition-colors ${
            displayMode === 'table'
              ? 'bg-blue-100 dark:bg-blue-900'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title='Таблица'
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
        >
          <CardsIcon active={displayMode === 'cards'} />
        </button>
        </div>
      </div>

      {isLoading ? (displayMode === 'table' ? skeletonTable : skeletonCards) : children()}
    </div>
  );
};
