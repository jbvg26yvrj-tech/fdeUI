import { apiClient } from '../../../shared/api/apiClient';
import type {
  PipelineSessionsResponseDto,
  PipelineSessionDetailsDto,
  StatusDto,
} from '../types/types';
import type { TableParams } from '../../../shared/ui/table/types/type';

/**
 * Hardcoded session statuses matching fde-api contract.
 * fde-api does not expose a /sessions/statuses endpoint.
 */
const SESSION_STATUSES: StatusDto[] = [
  { code: 'PREPARE', displayName: 'Подготовка', ordinal: 0 },
  { code: 'ACTIVE', displayName: 'Выполняется', ordinal: 1 },
  { code: 'SUCCESS', displayName: 'Успешно', ordinal: 2 },
  { code: 'FAILED', displayName: 'Ошибка', ordinal: 3 },
  { code: 'ABORTED', displayName: 'Прервано', ordinal: 4 },
];

export const pipelineSessionsApi = {
  async getPipelineSessionsWithParams(params?: TableParams): Promise<PipelineSessionsResponseDto> {
    const queryString = apiClient.getQueryParamsString(params);
    const url = `/sessions${queryString ? `?${queryString}` : ''}`;
    return apiClient.get<PipelineSessionsResponseDto>(url);
  },

  async getPipelineSessionDetails(sessionId: string): Promise<PipelineSessionDetailsDto> {
    return apiClient.get<PipelineSessionDetailsDto>(`/sessions/${sessionId}`);
  },

  /** Returns hardcoded statuses (fde-api has no /statuses endpoint). */
  async getAllStatuses(): Promise<StatusDto[]> {
    return Promise.resolve(SESSION_STATUSES);
  },
};
