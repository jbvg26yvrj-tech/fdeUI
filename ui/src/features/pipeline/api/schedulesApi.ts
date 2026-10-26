import { apiClient } from '../../../shared/api/apiClient';
import type { ScheduleData, CreateScheduleRequest, UpdateScheduleRequest } from '../types/ScheduleTypes';

export const schedulesApi = {
  getSchedule: async (pipelineId: string): Promise<ScheduleData> => {
    return apiClient.get<ScheduleData>(`/schedules/${pipelineId}`);
  },

  createSchedule: async (data: CreateScheduleRequest): Promise<ScheduleData> => {
    return apiClient.post<ScheduleData>('/schedules', data);
  },

  updateSchedule: async (pipelineId: string, data: UpdateScheduleRequest): Promise<ScheduleData> => {
    return apiClient.put<ScheduleData>(`/schedules/${pipelineId}`, data);
  },

  deleteSchedule: async (pipelineId: string): Promise<void> => {
    return apiClient.delete<void>(`/schedules/${pipelineId}`);
  },
};
