import type { TableMeta, TableParams } from '../../../../shared/ui/table/types/type';
import { apiClient } from '../../../../shared/api/apiClient';
import type { PipelineApiResponse } from '../types/Type';

export const fetchPipelines = async (params?: TableParams): Promise<PipelineApiResponse> => {
  const queryString = apiClient.getQueryParamsString(params);
  const url = `/pipelines${queryString ? `?${queryString}` : ''}`;
  return apiClient.get<PipelineApiResponse>(url);
};

export const mapServerResponseToTableMeta = (response: PipelineApiResponse): TableMeta => {
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
