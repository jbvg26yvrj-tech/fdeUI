import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../../Button';
import { ChevronUpDownIcon, ArrowUpIcon, ArrowDownIcon } from '../lib/icons';

interface SortOption {
  field: string;
  label: string;
}

interface SortDropdownProps {
  options: SortOption[];
  currentField: string | null;
  currentDirection: 'asc' | 'desc' | null;
  onSortChange: (field: string, direction: 'asc' | 'desc') => void;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({
  options,
  currentField,
  currentDirection,
  onSortChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFieldClick = (field: string) => {
    if (field === currentField) {
      const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
      onSortChange(field, newDirection);
    } else {
      onSortChange(field, 'asc');
    }
    setIsOpen(false);
  };

  //const activeLabel = options.find(opt => opt.field === currentField)?.label;

  return (
    <div className='relative' ref={dropdownRef}>
      <Button
        variant='outlined'
        size='sm'
        onClick={() => setIsOpen(!isOpen)}
        icon={<ChevronUpDownIcon className='w-4 h-4' />}
      >
        {/*activeLabel ? `Сортировка: ${activeLabel}` : 'Сортировка'*/}
      </Button>

      {isOpen && (
        <div
          className='absolute mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-48 max-w-[90vw] overflow-x-auto py-1'
          style={{ left: '50%', transform: 'translateX(-50%)' }}
        >
          {options.map(option => {
            const isActive = option.field === currentField;
            return (
              <button
                key={option.field}
                className='w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between whitespace-nowrap'
                onClick={() => handleFieldClick(option.field)}
              >
                <span className='text-sm text-gray-700 dark:text-gray-300'>{option.label}</span>
                {isActive && (
                  <span className='ml-2 text-blue-600 dark:text-blue-400'>
                    {currentDirection === 'asc' ? (
                      <ArrowUpIcon className='w-4 h-4' />
                    ) : (
                      <ArrowDownIcon className='w-4 h-4' />
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
