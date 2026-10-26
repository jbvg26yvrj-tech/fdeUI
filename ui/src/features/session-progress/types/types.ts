// src/features/session-progress/types/types.ts
// NOTE: Session progress (file-level tracking) is not available in fde-api.
// These types are kept for backwards compatibility but the API calls are stubbed.

export interface FileStatusDto {
  code: string;
  displayName: string;
  ordinal: number;
}

export interface SessionProgressPageDto {
  id: number;
  sessionId: string;
  fileName: string;
  taskOrder: number;
  taskName: string;
  fileStatus: string; // имя enum (для обратной совместимости)
  fileStatusCode?: number; // числовой код
  fileStatusName?: string; // имя enum (дублирует fileStatus)
  fileStatusDisplayName?: string; // русское название
  hash: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionProgressDetailsDto {
  id: number;
  sessionId: string;
  fileName: string;
  taskOrder: number;
  fileStatus: string;
  fileStatusCode?: number;
  fileStatusName?: string;
  fileStatusDisplayName?: string;
  hash: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionProgressResponseDto {
  data: SessionProgressPageDto[];
  meta: {
    pagination: {
      page: number;
      limit: number;
      totalElements: number;
      totalPages: number;
    };
    filters: {
      sessionId: string | null;
      fileName: string | null;
      taskOrder: string | null;
      fileStatus: string | null; // имя enum
      hash: string | null;
      createdAtFrom: string | null;
      createdAtTo: string | null;
      updatedAtFrom: string | null;
      updatedAtTo: string | null;
    };
    sort: {
      field: string;
      order: 'asc' | 'desc';
    };
  };
}
