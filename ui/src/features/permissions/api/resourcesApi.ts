import type { TableMeta, TableParams } from '../../../shared/ui/table/types/type';
import { apiClient } from '../../../shared/api/apiClient';
import type { ResourceApiResponse, ResourceDto } from '../types/types';

export const fetchResources = async (params?: TableParams): Promise<ResourceApiResponse> => {
  const queryString = apiClient.getQueryParamsString(params);
  const url = `/resources${queryString ? `?${queryString}` : ''}`;
  return apiClient.get<ResourceApiResponse>(url);
};

export const resourcesApi = {
  async getAllResources(): Promise<ResourceDto[]> {
    return apiClient.get<ResourceDto[]>('/resources/list');
  },
  async getResourcesByType(resourceType: string): Promise<ResourceDto[]> {
    return apiClient.get<ResourceDto[]>(`/resources/type/${resourceType}`);
  },
};

export const mapServerResponseToTableMeta = (response: ResourceApiResponse): TableMeta => {
  return {
    pagination: {
      page: response.page,
      size: response.size,
      totalElements: response.totalElements,
      totalPages: response.totalPages,
    },
    filters: {},
    sort: null,
  };
};
