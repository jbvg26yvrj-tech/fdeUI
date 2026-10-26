import type { TableMeta, TableParams } from '../../../shared/ui/table/types/type';
import { apiClient } from '../../../shared/api/apiClient';
import type { RoleRlsDto, RlsFilter, RlsApiResponse } from '../types/types';
import { ApiError } from '../../../shared/api/ApiError';

export const fetchRoleRls = async (
  params?: TableParams,
  roleId?: string,
): Promise<RlsApiResponse> => {
  const queryString = apiClient.getQueryParamsString(params);
  const url = `/roles/${roleId}/rls${queryString ? `?${queryString}` : ''}`;
  return apiClient.get<RlsApiResponse>(url);
};

/**
 * fde-api RLS endpoints:
 * GET    /api/v1/roles/{roleId}/rls -> [{roleId, resourceId, resourceCode, filter, createdAt, updatedAt}]
 * POST   /api/v1/roles/{roleId}/rls/{resourceId} -> {filter: string}
 * DELETE /api/v1/roles/{roleId}/rls/{resourceId} -> 204
 */
export const roleRlsApi = {
  /** Get RLS rules for a role. Returns array. */
  async getRoleRls(_params?: any, roleId?: string): Promise<RoleRlsDto[]> {
    if (!roleId) return [];
    return apiClient.get<RoleRlsDto[]>(`/roles/${roleId}/rls`);
  },

  async getRlsFiltersByRole(roleId: string): Promise<RoleRlsDto[]> {
    return apiClient.get<RoleRlsDto[]>(`/roles/${roleId}/rls`);
  },

  async getRlsFilter(roleId: string, resourceId: string): Promise<RoleRlsDto | null> {
    try {
      const items = await this.getRlsFiltersByRole(roleId);
      return items.find(item => item.resourceId === resourceId) || null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async saveRlsFilter(roleId: string, resourceId: string, filter: RlsFilter): Promise<RoleRlsDto> {
    return apiClient.post<RoleRlsDto>(`/roles/${roleId}/rls/${resourceId}`, {
      filter: JSON.stringify(filter),
    });
  },

  async deleteRlsFilter(id: string): Promise<void> {
    return apiClient.delete(`/rls/${id}`);
  },
};

/**
 * Convert array response to TableMeta for table component compatibility.
 */
/*
export const mapRoleRlsArrayToTableMeta = (data: RoleRlsDto[]): TableMeta => {
  return {
    pagination: {
      page: 0,
      size: data.length,
      totalElements: data.length,
      totalPages: 1,
    },
    filters: {},
    sort: null,
  };
};
*/
export const mapServerResponseToTableMeta = (response: RlsApiResponse): TableMeta => {
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
