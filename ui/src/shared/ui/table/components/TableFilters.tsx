import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '../../Button';
import { Input } from '../../Input';
import { Select } from '../../Select';
import { getFilterTypeIcon } from './FilterTypeIcon';
import { parseCronExpression } from '../lib/cron';
import { CronEditor } from './CronEditor';
import { DateTimeFilter } from './DateTimeFilter';
import type { Column } from '../types/type';

interface TableFiltersProps<T> {
  columns: Column<T>[];
  filters: Record<string, any>;
  inputValues: Record<string, any>;
  onFilterChange: (field: string, value: any) => void;
  onInputValueChange: (field: string, value: any) => void;
  onReset?: () => void;
  showResetButton?: boolean;
  emptyMessage?: string;
  hasActiveState?: boolean;
  caption?: string;
  onToggleColumnVisibility?: (columnKey: string) => void;
  initialFilters?: Record<string, any>;
  sortDropdown?: React.ReactNode;
}

export const TableFilters = <T,>({
  columns,
  filters,
  inputValues,
  onFilterChange,
  onInputValueChange,
  onReset,
  showResetButton = true,
  hasActiveState = false,
  caption = '',
  initialFilters = {},
  sortDropdown,
}: TableFiltersProps<T>) => {
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(() => {
    return Object.keys(initialFilters).some(key => initialFilters[key] !== '');
  });
  const [activeFilterFields, setActiveFilterFields] = useState<string[]>(() => {
    return Object.keys(initialFilters).filter(key => initialFilters[key] !== '');
  });
  const [isAddFilterPopupOpen, setIsAddFilterPopupOpen] = useState(false);

  const addFilterButtonRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Синхронизация с пропом initialFilters при его изменении
  useEffect(() => {
    const newActiveFields = Object.keys(initialFilters).filter(key => initialFilters[key] !== '');
    setActiveFilterFields(newActiveFields);
    setIsFiltersExpanded(newActiveFields.length > 0);
  }, [initialFilters]);

  const debouncedFilter = useCallback(
    (field: string, value: any) => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
      filterTimeoutRef.current = setTimeout(() => {
        onFilterChange(field, value);
      }, 1000);
    },
    [onFilterChange],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>, field: string, value: any) => {
      if (event.key === 'Enter') {
        if (filterTimeoutRef.current) {
          clearTimeout(filterTimeoutRef.current);
          filterTimeoutRef.current = null;
        }
        onFilterChange(field, value);
      }
    },
    [onFilterChange],
  );

  const handleInputChange = useCallback(
    (field: string, value: any) => {
      onInputValueChange(field, value);
      debouncedFilter(field, value);
    },
    [debouncedFilter, onInputValueChange],
  );

  const handleCheckboxChange = useCallback(
    (field: string, checked: boolean) => {
      const value = checked ? 'true' : 'false';
      onInputValueChange(field, value);
      onFilterChange(field, value);
    },
    [onFilterChange, onInputValueChange],
  );

  const addFilterField = useCallback(
    (field: string) => {
      if (!activeFilterFields.includes(field)) {
        setActiveFilterFields(prev => [...prev, field]);
        onInputValueChange(field, '');
        if (!isFiltersExpanded) {
          setIsFiltersExpanded(true);
        }
      }
      setIsAddFilterPopupOpen(false);
    },
    [activeFilterFields, isFiltersExpanded, onInputValueChange],
  );

  const removeFilterField = useCallback(
    (field: string) => {
      setActiveFilterFields(prev => prev.filter(f => f !== field));

      const newInputValues = { ...inputValues };
      delete newInputValues[field];
      Object.keys(newInputValues).forEach(key => {
        onInputValueChange(key, newInputValues[key]);
      });

      onFilterChange(field, '');
    },
    [inputValues, onFilterChange, onInputValueChange],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        addFilterButtonRef.current &&
        !addFilterButtonRef.current.contains(event.target as Node)
      ) {
        setIsAddFilterPopupOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, []);

  const filterableColumns = columns.filter(column => column.filterable === true);

  const availableFilterFields = filterableColumns
    .filter(column => !activeFilterFields.includes(column.key as string))
    .map(column => ({
      value: column.key as string,
      label: column.title,
      type: column.filterType || 'text',
    }));

  const CronFilterWrapper: React.FC<{ field: string }> = ({ field }) => {
    const inputRef = useRef<HTMLDivElement>(null);
    const [triggerRect, setTriggerRect] = useState<DOMRect | undefined>(undefined);

    const updateTriggerRect = () => {
      if (inputRef.current) {
        setTriggerRect(inputRef.current.getBoundingClientRect());
      }
    };

    useEffect(() => {
      updateTriggerRect();
      window.addEventListener('resize', updateTriggerRect);
      window.addEventListener('scroll', updateTriggerRect, true);
      return () => {
        window.removeEventListener('resize', updateTriggerRect);
        window.removeEventListener('scroll', updateTriggerRect, true);
      };
    }, []);

    return (
      <div ref={inputRef}>
        <CronEditor
          value={inputValues[field] || ''}
          onChange={value => handleInputChange(field, value)}
          triggerRect={triggerRect}
        />
        {inputValues[field] && (
          <div className='text-xs text-green-600 dark:text-green-400 mt-1 p-1 bg-green-50 dark:bg-green-900/20 rounded'>
            {parseCronExpression(inputValues[field])}
          </div>
        )}
      </div>
    );
  };

  const renderFilterInput = (column: Column<T>, field: string) => {
    switch (column.filterType) {
      case 'checkbox':
        return (
          <div className='flex items-center space-x-2 h-6'>
            <input
              type='checkbox'
              id={`filter-checkbox-${field}`}
              checked={filters[field] === 'true'}
              onChange={e => handleCheckboxChange(field, e.target.checked)}
              className='h-3 w-3 text-blue-600 dark:text-blue-400 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400'
            />
            <label
              htmlFor={`filter-checkbox-${field}`}
              className='text-xs text-gray-700 dark:text-gray-300 cursor-pointer whitespace-nowrap'
            >
              {filters[field] === 'true' ? 'Да' : 'Нет'}
            </label>
          </div>
        );

      case 'select':
        return (
          <Select
            options={column.filterOptions || []}
            placeholder={`Фильтр...`}
            value={inputValues[field] || ''}
            onChange={e => handleInputChange(field, (e.target as HTMLSelectElement).value)}
            inputSize='sm'
            className='w-full text-xs'
          />
        );

      case 'datetime':
        return (
          <DateTimeFilter
            field={field}
            value={filters[field] || null}
            onChange={(field, value) => handleInputChange(field, value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
              handleKeyDown(e, field, inputValues[field])
            }
          />
        );

      case 'cron':
        return <CronFilterWrapper field={field} />;

      default:
        return (
          <Input
            placeholder={`Фильтр...`}
            value={inputValues[field] || ''}
            onChange={e => handleInputChange(field, e.target.value)}
            onKeyDown={e => handleKeyDown(e, field, (e.target as HTMLInputElement).value)}
            inputSize='sm'
            className='w-full text-xs'
          />
        );
    }
  };

  return (
    <div className='fde-table-filters p-4'>
      {/* Адаптивная строка с заголовком и кнопками */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
        {/* Левая часть: заголовок и индикатор */}
        <div className='flex items-center space-x-3 flex-wrap'>
          <h1 className='fde-table-title text-lg font-semibold'>{caption}</h1>
          <div className='text-sm text-gray-600 dark:text-gray-400'>
            {hasActiveState && (
              <span className='text-blue-600 dark:text-blue-400'>Фильтры / сортировка</span>
            )}
          </div>
        </div>

        {/* Правая часть: группа кнопок с возможностью переноса */}
        <div className='flex flex-wrap items-center gap-2'>
          {(filterableColumns.length > 0 || activeFilterFields.length > 0) && (
            <Button
              variant='outlined'
              size='sm'
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              aria-expanded={isFiltersExpanded}
              title={isFiltersExpanded ? 'Скрыть фильтры' : 'Показать фильтры'}
              icon={
                <svg
                  className={`w-4 h-4 transition-transform ${isFiltersExpanded ? 'rotate-180' : ''}`}
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M19 9l-7 7-7-7'
                  />
                </svg>
              }
            >
              Фильтры
            </Button>
          )}

          {availableFilterFields.length > 0 && (
            <div className='relative'>
              <span ref={addFilterButtonRef}>
                {/* Кнопка "Добавить фильтр" */}
                <Button
                  variant='outlined'
                  size='sm'
                  onClick={() => setIsAddFilterPopupOpen(!isAddFilterPopupOpen)}
                  icon={
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={1.5}
                        d='M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.586V4z'
                      />
                    </svg>
                  }
                >
                  Добавить фильтр
                </Button>
              </span>

              {isAddFilterPopupOpen && availableFilterFields.length > 0 && (
                <div
                  ref={popupRef}
                  className='absolute mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-48 max-w-[90vw] overflow-x-auto py-1'
                  style={{ left: '50%', transform: 'translateX(-50%)' }}
                >
                  {availableFilterFields.map(field => (
                    <button
                      key={field.value}
                      className='w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 whitespace-nowrap'
                      onClick={() => addFilterField(field.value)}
                    >
                      <span className='text-gray-500 dark:text-gray-400'>
                        {getFilterTypeIcon(field.type)}
                      </span>
                      <span className='flex-1 text-sm text-gray-700 dark:text-gray-300'>
                        {field.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {sortDropdown}

          {/* Кнопка "Сбросить" теперь всегда видна, но отключается при отсутствии активных фильтров/сортировки */}
          {showResetButton && onReset && (
            <Button
              variant='outlined'
              size='sm'
              onClick={() => {
                setActiveFilterFields([]);
                onReset();
              }}
              disabled={!hasActiveState}
              icon={
                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  {/* Иконка фильтра (воронка) */}
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={1.5}
                    d='M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.586V4z'
                  />
                  {/* Крестик в правом нижнем углу */}
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={1.8}
                    d='M18 18 L22 22 M22 18 L18 22'
                  />
                </svg>
              }
              title='Сбросить фильтры'
              aria-label='Сбросить фильтры'
            />
          )}
        </div>
      </div>

      {/* Область активных фильтров (без изменений) */}
      {(filterableColumns.length > 0 || activeFilterFields.length > 0) && (
        <div
          className={`overflow-hidden transition-all duration-300 ${
            isFiltersExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className='flex justify-between items-center mb-3 pt-3'>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              Фильтрация данных{' '}
              {activeFilterFields.length > 0 && `(${activeFilterFields.length} активных)`}
            </h4>
          </div>

          {activeFilterFields.length > 0 ? (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2'>
              {activeFilterFields.map(field => {
                const column = columns.find(col => col.key === field);
                if (!column) return null;

                return (
                  <div
                    key={field}
                    className='fde-table-filter-field min-w-0 relative group rounded-md p-2 min-h-[64px]'
                  >
                    <div className='flex items-center justify-between mb-1'>
                      <label
                        title={column.title}
                        className='block text-xs font-medium text-gray-600 dark:text-gray-400 truncate'
                      >
                        {column.title}
                      </label>
                      <Button
                        variant='text'
                        size='sm'
                        onClick={() => removeFilterField(field)}
                        title={`Удалить фильтр: ${column.title}`}
                        aria-label={`Удалить фильтр: ${column.title}`}
                        className='opacity-70 hover:opacity-100 transition-opacity p-1'
                        icon={
                          <svg
                            className='w-3 h-3'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M6 18L18 6M6 6l12 12'
                            />
                          </svg>
                        }
                      />
                    </div>

                    {renderFilterInput(column, field)}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className='fde-table-filter-empty flex items-center gap-2 py-2 text-sm'>
              <svg
                className='w-4 h-4 shrink-0'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.586V4z'
                />
              </svg>
              <p>Нет активных фильтров</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
