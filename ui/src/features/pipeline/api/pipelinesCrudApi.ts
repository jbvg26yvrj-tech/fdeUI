import { apiClient } from '../../../shared/api/apiClient';
import type { PipelineData, SimplePipelineData } from '../types/Types';
import type { TaskType } from '../types/TaskTypes';

export interface CreateTaskRequest {
  taskOrder: number;
  typeCode: TaskType;
  props: Record<string, string>;
}

export interface CreatePipelineRequest {
  pipelineName: string;
  clientFrom: string;
  clientTo: string;
  primaryDatacenter?: string;
  allOrNothing?: boolean;
  tasks: CreateTaskRequest[];
}

export interface UpdatePipelineRequest {
  pipelineName?: string;
  clientFrom?: string;
  clientTo?: string;
  primaryDatacenter?: string;
  allOrNothing?: boolean;
  tasks?: CreateTaskRequest[];
}

export const pipelinesCrudApi = {
  createPipeline: async (data: CreatePipelineRequest): Promise<PipelineData> => {
    return apiClient.post<PipelineData>('/pipelines', data);
  },

  updatePipeline: async (id: string, data: UpdatePipelineRequest): Promise<PipelineData> => {
    return apiClient.put<PipelineData>(`/pipelines/${id}`, data);
  },

  deletePipeline: async (id: string): Promise<void> => {
    return apiClient.delete<void>(`/pipelines/${id}`);
  },

  getTaskProps: async (typeCode: string): Promise<{ required: string[]; optional: string[] }> => {
    const data = await apiClient.get<Record<string, string[]>>(`/pipelines/task-props/${typeCode}`);
    return {
      required: data.required || [],
      optional: data.optional || [],
    };
  },

  bulkChangeDatacenter: async (
    datacenter: string,
    pipelineIds: string[],
  ): Promise<{ updatedCount: number; datacenter: string }> => {
    return apiClient.patch<{ updatedCount: number; datacenter: string }>('/pipelines/datacenter', {
      datacenter,
      pipelineIds,
    });
  },
};

export interface PipelineReusePage {
  content: SimplePipelineData[];
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
}

// Reuse only records returned by the existing permission- and client-scoped API.
export const pipelineReuseApi = {
  search: (query = '', page = 0): Promise<PipelineReusePage> => {
    const params = new URLSearchParams({ page: String(page), size: '100', sort: 'pipelineName,asc' });
    if (query.trim()) params.set('pipelineName', query.trim());
    return apiClient.get<PipelineReusePage>(`/pipelines?${params.toString()}`);
  },
  get: (id: string): Promise<PipelineData> =>
    apiClient.get<PipelineData>(`/pipelines/${encodeURIComponent(id)}`),
};
