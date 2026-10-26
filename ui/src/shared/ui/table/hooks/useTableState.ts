import { useState, useCallback, useMemo, useRef } from 'react';
import type { TableMeta, TableParams } from '../types/type';

interface UseTableStateProps {
  initialPageSize?: number;
  serverMeta?: TableMeta;
  onTableChange?: (params: TableParams) => void;
  initialFilters?: Record<string, any>;
  initialSort?: {
    field: string;
    order: 'asc' | 'desc';
  } | null;
}

export const useTableState = ({
  initialPageSize = 10,
  serverMeta,
  onTableChange,
  initialFilters = {},
  initialSort = null,
}: UseTableStateProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState(initialSort?.field || '');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSort?.order || 'asc');
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);
  const [inputValues, setInputValues] = useState<Record<string, any>>(initialFilters);

  // Флаг для отслеживания, была ли уже применена начальная инициализация
  const hasInitializedRef = useRef(false);

  const isServerMode = true;

  const meta = useMemo((): TableMeta => {
    if (isServerMode && serverMeta) {
      return serverMeta;
    }

    return {
      pagination: {
        page: currentPage,
        size: initialPageSize,
        totalElements: 0,
        totalPages: 0,
      },
      filters,
      sort: sortField ? { field: sortField, order: sortDirection } : null,
    };
  }, [isServerMode, serverMeta, currentPage, initialPageSize, filters, sortField, sortDirection]);

  const getTableParams = useCallback(
    (updates: Partial<TableParams> = {}): TableParams => {
      const baseParams: TableParams = {
        pagination: {
          page: currentPage,
          size: initialPageSize,
        },
        sort: sortField ? { field: sortField, order: sortDirection } : null,
        filters: { ...filters },
      };
      return { ...baseParams, ...updates };
    },
    [currentPage, initialPageSize, sortField, sortDirection, filters],
  );

  const handleSort = useCallback(
    (field: string) => {
      const newSortField = field;
      const newSortDirection =
        sortField === field ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc';

      onTableChange?.(
        getTableParams({
          pagination: { ...meta.pagination, page: 1 },
          sort: { field: newSortField, order: newSortDirection },
        }),
      );

      setSortField(newSortField);
      setSortDirection(newSortDirection);
      setCurrentPage(1);
    },
    [sortField, sortDirection, onTableChange, meta.pagination, getTableParams],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      onTableChange?.(
        getTableParams({
          pagination: { ...meta.pagination, page },
        }),
      );
      setCurrentPage(page);
    },
    [onTableChange, meta.pagination, getTableParams],
  );

  const handleFilterChange = useCallback(
    (field: string, value: any) => {
      const newFilters = { ...filters, [field]: value };

      onTableChange?.(
        getTableParams({
          pagination: { ...meta.pagination, page: 1 },
          filters: newFilters,
        }),
      );

      setFilters(newFilters);
      setInputValues(prev => ({ ...prev, [field]: value }));
      setCurrentPage(1);
    },
    [filters, onTableChange, meta.pagination, getTableParams],
  );

  const handleReset = useCallback(() => {
    const resetFilters = {};
    onTableChange?.(
      getTableParams({
        pagination: { ...meta.pagination, page: 1 },
        sort: null,
        filters: resetFilters,
      }),
    );
    setFilters(resetFilters);
    setSortField('');
    setSortDirection('asc');
    setInputValues({});
    setCurrentPage(1);
  }, [onTableChange, meta.pagination, getTableParams]);

  // Применяем initialFilters только один раз: либо при первом рендере, либо при первой загрузке непустых фильтров
  if (!hasInitializedRef.current && Object.keys(initialFilters).length > 0) {
    setFilters(initialFilters);
    setInputValues(initialFilters);
    setCurrentPage(1);
    hasInitializedRef.current = true;
  }

  return {
    // State
    currentPage,
    sortField,
    sortDirection,
    filters,
    inputValues,

    // Actions
    setCurrentPage,
    setSortField,
    setSortDirection,
    setFilters,
    setInputValues,

    // Handlers
    handleSort,
    handlePageChange,
    handleFilterChange,
    handleReset,

    // Derived state
    isServerMode,
    meta,
    getTableParams,
  };
};
