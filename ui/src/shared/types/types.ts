export interface TableProps<T> {
  onRowClick?: (record: T) => void;
  onToggleColumnVisibility?: (columnKey: string) => void;
  columnWidths?: Record<string, number>;
  onColumnResize?: (columnKey: string, newWidth: number) => void;
  userPermissions?: string[];
}

export interface TableApiResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
