import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '../../Button';
import { Input } from '../../Input';
import { getFilterTypeIcon } from './FilterTypeIcon';
import { parseCronExpression } from '../lib/cron';
import { CronEditor } from './CronEditor';
import { DateTimeFilter } from './DateTimeFilter';
import type { Column } from '../types/type';

const hasValue = (value: any): boolean => {
  if (value == null) return false;
  if (typeof value === 'object') return hasValue(value.value);
  return String(value).trim() !== '';
};

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
    return Object.keys(initialFilters).some(key => hasValue(initialFilters[key]));
  });
  const [activeFilterFields, setActiveFilterFields] = useState<string[]>(() => {
    return Object.keys(initialFilters).filter(key => hasValue(initialFilters[key]));
  });
  const [isAddFilterPopupOpen, setIsAddFilterPopupOpen] = useState(false);

  const addFilterButtonRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const filterTimeouts = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const latestOnFilterChange = useRef(onFilterChange);
  latestOnFilterChange.current = onFilterChange;
  const [resetVersion, setResetVersion] = useState(0);
  const cancelPending = useCallback((field?: string) => {
    if (field !== undefined) {
      clearTimeout(filterTimeouts.current.get(field));
      filterTimeouts.current.delete(field);
    } else {
      filterTimeouts.current.forEach(clearTimeout);
      filterTimeouts.current.clear();
    }
  }, []);

  // Applied values can be echoed while another selected field is still being edited.
  const initialActiveFieldsKey = JSON.stringify(
    Object.keys(initialFilters)
      .filter(key => hasValue(initialFilters[key]))
      .sort(),
  );
  useEffect(() => {
    const newActiveFields: string[] = JSON.parse(initialActiveFieldsKey);
    setActiveFilterFields(selected => Array.from(new Set([...selected, ...newActiveFields])));
  }, [initialActiveFieldsKey]);

  const debouncedFilter = useCallback(
    (field: string, value: any) => {
      cancelPending(field);
      filterTimeouts.current.set(
        field,
        setTimeout(() => {
          filterTimeouts.current.delete(field);
          latestOnFilterChange.current(field, value);
        }, 1000),
      );
    },
    [cancelPending],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>, field: string, value: any) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        cancelPending(field);
        latestOnFilterChange.current(field, value);
      }
    },
    [cancelPending],
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

      cancelPending(field);
      onInputValueChange(field, '');
      onFilterChange(field, '');
    },
    [cancelPending, onFilterChange, onInputValueChange],
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

  useEffect(() => () => cancelPending(), [cancelPending]);

  const filterableColumns = columns.filter(column => column.filterable === true);
  const keys = filterableColumns.map(column => String(column.key));
  const preferred =
    keys.includes('clientFrom') && keys.includes('clientTo')
      ? ['pipelineName', 'id', 'clientFrom', 'clientTo', 'primaryDatacenter']
      : keys.includes('pipelineId')
        ? ['id', 'pipelineId', 'status']
        : [];
  const quickFields = preferred.filter(field => keys.includes(field));
  const advancedFields = activeFilterFields.filter(field => !quickFields.includes(field));
  const availableFilterFields = filterableColumns
    .filter(
      column =>
        !quickFields.includes(String(column.key)) &&
        !activeFilterFields.includes(String(column.key)),
    )
    .map(column => ({
      value: String(column.key),
      label: column.title,
      type: column.filterType || 'text',
    }));
  const appliedColumns = filterableColumns.filter(column => hasValue(filters[String(column.key)]));
  const hasDrafts = Object.values(inputValues).some(hasValue);
  const resetFilters = () => {
    cancelPending();
    setResetVersion(version => version + 1);
    setActiveFilterFields([]);
    setIsFiltersExpanded(false);
    setIsAddFilterPopupOpen(false);
    Object.keys(inputValues).forEach(field => onInputValueChange(field, ''));
    onReset?.();
  };

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
              aria-label={column.title}
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
          <select
            id={`filter-${field}`}
            aria-label={column.title}
            value={inputValues[field] || ''}
            onChange={e => handleInputChange(field, e.target.value)}
            className='fde-input w-full rounded border px-3 py-1 text-sm'
          >
            <option value=''>Все</option>
            {(column.filterOptions || []).map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
            id={`filter-${field}`}
            aria-label={column.title}
            placeholder={field === 'id' || field === 'pipelineId' ? 'UUID' : column.title}
            value={inputValues[field] || ''}
            onChange={e => handleInputChange(field, e.target.value)}
            onKeyDown={e => handleKeyDown(e, field, (e.target as HTMLInputElement).value)}
            inputSize='sm'
            className='w-full text-xs'
          />
        );
    }
  };

  const renderField = (field: string, advanced = false) => {
    const column = filterableColumns.find(column => String(column.key) === field);
    if (!column) return null;
    return (
      <div
        key={`${field}-${resetVersion}`}
        className='fde-table-filter-field min-w-0 rounded-md p-2'
      >
        <div className='flex items-center justify-between mb-1'>
          <label htmlFor={`filter-${field}`} className='text-xs font-medium'>
            {column.title}
          </label>
          {advanced && (
            <Button
              type='button'
              variant='text'
              size='sm'
              aria-label={`Удалить фильтр: ${column.title}`}
              onClick={() => removeFilterField(field)}
            >
              ×
            </Button>
          )}
        </div>
        {renderFilterInput(column, field)}
      </div>
    );
  };

  return (
    <div className='fde-table-filters p-4'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
        <h1 className='fde-table-title text-lg font-semibold'>{caption}</h1>
        <div className='flex flex-wrap items-center gap-2'>
          {advancedFields.length > 0 && (
            <Button
              type='button'
              variant='outlined'
              size='sm'
              aria-expanded={isFiltersExpanded}
              onClick={() => setIsFiltersExpanded(value => !value)}
            >
              Дополнительные фильтры
            </Button>
          )}
          {availableFilterFields.length > 0 && (
            <div className='relative'>
              <span ref={addFilterButtonRef}>
                <Button
                  type='button'
                  variant='outlined'
                  size='sm'
                  aria-expanded={isAddFilterPopupOpen}
                  onClick={() => setIsAddFilterPopupOpen(value => !value)}
                >
                  Добавить фильтр
                </Button>
              </span>
              {isAddFilterPopupOpen && (
                <div
                  ref={popupRef}
                  onKeyDown={event => {
                    if (event.key === 'Escape') {
                      setIsAddFilterPopupOpen(false);
                      addFilterButtonRef.current?.querySelector('button')?.focus();
                    }
                  }}
                  className='absolute right-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-48 max-w-[90vw] max-h-80 overflow-auto py-1'
                >
                  {availableFilterFields.map(field => (
                    <button
                      type='button'
                      key={field.value}
                      onClick={() => addFilterField(field.value)}
                      className='w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3'
                    >
                      <span aria-hidden='true'>{getFilterTypeIcon(field.type)}</span>
                      {field.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {sortDropdown}
          {showResetButton && onReset && (
            <Button
              type='button'
              variant='outlined'
              size='sm'
              onClick={resetFilters}
              disabled={
                !hasActiveState &&
                !hasDrafts &&
                appliedColumns.length === 0 &&
                advancedFields.length === 0
              }
              aria-label='Сбросить фильтры'
            >
              Сбросить
            </Button>
          )}
        </div>
      </div>
      {quickFields.length > 0 && (
        <div className='fde-quick-filters grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 mt-3'>
          {quickFields.map(field => renderField(field))}
        </div>
      )}
      {filterableColumns.length > 0 && (
        <p className='fde-filter-help text-xs mt-2'>
          Фильтры применяются автоматически. Enter — применить сразу. Дополнительные поля —
          «Добавить фильтр».
        </p>
      )}
      {appliedColumns.length > 0 && (
        <div className='mt-3'>
          <p className='text-xs mb-2' aria-live='polite'>
            Активные фильтры: {appliedColumns.length}
          </p>
          <div className='fde-filter-chips flex flex-wrap gap-2'>
            {appliedColumns.map(column => {
              const field = String(column.key);
              const value = filters[field];
              const display =
                typeof value === 'object'
                  ? `${value.operator || ''} ${value.value}`
                  : column.filterOptions?.find(option => option.value === String(value))?.label ||
                    (column.filterType === 'checkbox'
                      ? String(value) === 'true'
                        ? 'Да'
                        : 'Нет'
                      : String(value));
              return (
                <button
                  type='button'
                  key={field}
                  className='fde-filter-chip'
                  aria-label={`Убрать фильтр: ${column.title}`}
                  onClick={() => removeFilterField(field)}
                >
                  {column.title}: {display} <span aria-hidden='true'>×</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {isFiltersExpanded && advancedFields.length > 0 && (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3'>
          {advancedFields.map(field => renderField(field, true))}
        </div>
      )}
    </div>
  );
};
