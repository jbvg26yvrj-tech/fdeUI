// Session progress API is not available in fde-api.
// File-level progress tracking does not exist in the new backend.
// This module is kept as a stub for backwards compatibility.

import type {
  SessionProgressResponseDto,
  SessionProgressDetailsDto,
  FileStatusDto,
} from '../types/types';
import type { TableParams } from '../../../shared/ui/table/types/type';

export const sessionProgressApi = {
  async getSessionProgressWithParams(_params?: TableParams): Promise<SessionProgressResponseDto> {
    throw new Error('Session progress API is not available in fde-api');
  },

  async getSessionProgressDetails(_id: number): Promise<SessionProgressDetailsDto> {
    throw new Error('Session progress API is not available in fde-api');
  },

  async getAllFileStatuses(): Promise<FileStatusDto[]> {
    return Promise.resolve([]);
  },

  async getFileStatusByName(_statusName: string): Promise<FileStatusDto> {
    throw new Error('Session progress API is not available in fde-api');
  },

  async getFileStatusByCode(_code: number): Promise<FileStatusDto> {
    throw new Error('Session progress API is not available in fde-api');
  },
};
