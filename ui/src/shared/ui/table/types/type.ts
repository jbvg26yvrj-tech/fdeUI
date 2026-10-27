import React from 'react';

export type MenuAction =
  | 'delete'
  | 'edit'
  | 'sessions'
  | 'view'
  | 'run'
  | 'stop'
  | 'analytics'
  | 'download';

export interface MenuItem<T> {
  action: MenuAction;
  label: string;
  onClick: (row: T) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  show?: boolean;
}

export interface DateTimeFilterValue {
  value: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'between';
  precision: 'DATE' | 'SECOND' | 'MILLISECOND' | 'MICROSECOND';
}

export interface Column<T> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'select' | 'checkbox' | 'datetime' | 'cron';
  filterOptions?: Array<{ value: string; label: string }>;
  render?: (value: unknown, row: T) => React.ReactNode;
  width?: number;
  minWidth?: number;
  menuActions?: MenuItem<T>[];
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  serverMeta?: TableMeta;
  onTableChange?: TableChangeCallback;
  pageSize?: number;
  initialPage?: number;
  rowClassName?: (row: T) => string;
  className?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  onRowDoubleClick?: (row: T) => void;
  showResetButton?: boolean;
  resizable?: boolean;
  onColumnResize?: (columnKey: string, newWidth: number) => void;
  resizeSensitivity?: number;
  minColumnWidth?: number;
  loading?: boolean;
  globalMenuActions?: MenuItem<T>[];
  caption?: string;
  onToggleColumnVisibility?: (columnKey: string) => void;
  columnWidths?: Record<string, number>;
  initialFilters?: Record<string, any>;
  initialSort?: {
    field: string;
    order: 'asc' | 'desc';
  } | null;
  rowKey?: keyof T | ((row: T) => string | number);
  // Новые поля для карточного режима
  showFilters?: boolean;
  showPagination?: boolean;
  displayMode?: 'table' | 'cards';
  renderCard?: (item: T) => React.ReactNode;
}

export interface TableParams {
  pagination: {
    page: number;
    size: number;
  };
  sort: {
    field: string;
    order: 'asc' | 'desc';
  } | null;
  filters: Record<string, any> | null;
}

export interface ServerResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface TableMeta {
  pagination: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
  filters: Record<string, any>;
  sort: {
    field: string;
    order: 'asc' | 'desc';
  } | null;
}

export type TableChangeCallback = (params: TableParams) => void;
