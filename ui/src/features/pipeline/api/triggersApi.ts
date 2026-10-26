import { apiClient } from '../../../shared/api/apiClient';

export interface ManualTriggerResponse {
  sessionId: string;
  pipelineId: string;
}

export interface StopTriggerResponse {
  sessionId: string;
}

export const triggersApi = {
  manualTrigger: async (pipelineId: string): Promise<ManualTriggerResponse> => {
    return apiClient.post<ManualTriggerResponse>('/triggers/manual', { pipelineId });
  },

  stopTrigger: async (sessionId: string): Promise<StopTriggerResponse> => {
    return apiClient.post<StopTriggerResponse>('/triggers/stop', { sessionId });
  },
};
