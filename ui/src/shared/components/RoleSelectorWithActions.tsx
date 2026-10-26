import React, { useState, useEffect, useRef } from 'react';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { CardsIcon, TableIcon } from '../ui/table/lib/icons';

interface RoleSelectorWithActionsProps {
  roles: Array<{ id: string; name: string; code: string }>;
  selectedRoleId: string;
  onRoleChange: (roleId: string) => void;
  onAddClick: () => void;
  addButtonText: string;
  displayMode: 'table' | 'cards';
  onDisplayModeChange: (mode: 'table' | 'cards') => void;
  disabled?: boolean;
}

export const RoleSelectorWithActions: React.FC<RoleSelectorWithActionsProps> = ({
  roles,
  selectedRoleId,
  onRoleChange,
  onAddClick,
  addButtonText,
  displayMode,
  onDisplayModeChange,
  disabled = false,
}) => {
  const [isNarrow, setIsNarrow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        // Порог, при котором элементы перестают помещаться в одну строку (можно подстроить)
        setIsNarrow(width < 600);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`flex gap-3 ${isNarrow ? 'flex-col' : 'flex-row items-center justify-between'}`}
    >
      {/* Селект роли */}
      <div className={isNarrow ? 'w-full' : 'w-full sm:w-96'}>
        <Select
          value={selectedRoleId}
          onChange={e => onRoleChange(e.target.value)}
          disabled={disabled || roles.length === 0}
          options={roles.map(role => ({
            value: role.id,
            label: `${role.name} (${role.code})`,
          }))}
        />
      </div>

      {/* Кнопка действия и переключатели режимов */}
      <div className={`flex items-center gap-3 ${isNarrow ? 'justify-between w-full' : ''}`}>
        <Button variant='primary' size='sm' onClick={onAddClick} disabled={disabled}>
          {addButtonText}
        </Button>
        <div className='flex space-x-1'>
          <button
            onClick={() => onDisplayModeChange('table')}
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
            onClick={() => onDisplayModeChange('cards')}
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
    </div>
  );
};
