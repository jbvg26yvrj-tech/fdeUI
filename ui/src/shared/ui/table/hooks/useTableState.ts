import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { TableMeta, TableParams } from '../types/type';

interface UseTableStateProps {
  initialPageSize?: number;
  initialPage?: number;
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
  initialPage,
  serverMeta,
  onTableChange,
  initialFilters = {},
  initialSort = null,
}: UseTableStateProps) => {
  const [currentPage, setCurrentPage] = useState(initialPage ?? (serverMeta ? serverMeta.pagination.page + 1 : 1));
  const [sortField, setSortField] = useState(initialSort?.field || '');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSort?.order || 'asc');
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);
  const [inputValues, setInputValues] = useState<Record<string, any>>(initialFilters);

  // Флаг для отслеживания, была ли уже применена начальная инициализация
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const initialSignature = JSON.stringify([initialFilters, initialSort, initialPage]);
  useEffect(() => {
    // A parent echoing our applied filter must not replace drafts in other fields.
    if (JSON.stringify(filtersRef.current) !== JSON.stringify(initialFilters)) {
      filtersRef.current = initialFilters;
      setFilters(initialFilters);
      setInputValues(initialFilters);
    }
    setSortField(initialSort?.field || '');
    setSortDirection(initialSort?.order || 'asc');
    setCurrentPage(initialPage ?? (serverMeta ? serverMeta.pagination.page + 1 : 1));
    // Synchronize when async persisted state arrives, not on every equivalent object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSignature]);

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
        filters: { ...filtersRef.current },
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
      const newFilters = { ...filtersRef.current, [field]: value };
      filtersRef.current = newFilters;

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
    filtersRef.current = resetFilters;
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
