import { apiClient } from '../../../../shared/api/apiClient';
import type { PipelineData } from '../../types/Types';

export const fetchPipelinesDetails = async (id: string): Promise<PipelineData> => {
  return apiClient.get<PipelineData>(`/pipelines/${id}`);
};
