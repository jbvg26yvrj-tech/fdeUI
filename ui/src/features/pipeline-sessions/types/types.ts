// Типы, соответствующие новому ответу сервера
export interface DateFilterDto {
  eq?: string;
  ne?: string;
  gt?: string;
  lt?: string;
  gte?: string;
  lte?: string;
}

export type SessionStatus = 'PREPARE' | 'ACTIVE' | 'SUCCESS' | 'FAILED' | 'ABORTED';

/** Statuses that represent a completed session — no further actions allowed */
export const TERMINAL_STATUSES: SessionStatus[] = ['SUCCESS', 'FAILED', 'ABORTED'];

export interface PipelineSessionPageDto {
  id: string;
  pipelineId: string;
  pipelineName: string;
  replicaId: string;
  status: SessionStatus;
  startDt: string;
  createdAt: string;
  updatedAt?: string;
  errorMessage?: string;
}

export interface ProcessedFileDto {
  fileName: string;
  sourceFileName?: string;
  fileSize: number;
  status: string; // SUCCESS, FAILED, SKIPPED
  errorMessage?: string;
  createdAt: string;
}

export interface TaskSessionDto {
  id: string;
  taskOrder: number;
  typeCode: string;
  isDone: boolean;
  processedFiles?: ProcessedFileDto[];
  totalFiles?: number;
  totalBytes?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface PipelineSessionDetailsDto {
  id: string;
  pipelineId: string;
  pipelineName: string;
  replicaId: string;
  status: SessionStatus;
  startDt: string;
  createdAt: string;
  updatedAt?: string;
  errorMessage?: string;
  tasks: TaskSessionDto[];
  totalFiles?: number;
  totalBytes?: number;
}

export interface PipelineSessionsResponseDto {
  content: PipelineSessionPageDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type StatusDto = {
  code: string;
  displayName: string;
  ordinal: number;
};
