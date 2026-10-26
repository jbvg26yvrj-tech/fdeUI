import type { TableMeta, TableParams } from '../../../shared/ui/table/types/type';
import { apiClient } from '../../../shared/api/apiClient';
import type { ResourceDto, ResourceApiResponse } from '../types/types';

/**
 * fde-api role-resources endpoints:
 * GET    /api/v1/roles/{roleId}/resources -> ResourceResponse[] (NOT paginated)
 * POST   /api/v1/roles/{roleId}/resources -> {targetId: uuid}
 * DELETE /api/v1/roles/{roleId}/resources/{resourceId} -> 204
 */

export const fetchResources = async (
  params?: TableParams,
  roleId?: string,
): Promise<ResourceApiResponse> => {
  const queryString = apiClient.getQueryParamsString(params);
  const url = `/roles/${roleId}/resources${queryString ? `?${queryString}` : ''}`;
  return apiClient.get<ResourceApiResponse>(url);
};

export const roleResourceApi = {
  async getAssignedPermissions(roleId?: string): Promise<ResourceDto[]> {
    if (!roleId) return [];
    return apiClient.get<ResourceDto[]>(`/roles/${roleId}/resources/list`);
  },

  /** Get resources assigned to a role. Returns array. */
  async getPermissions(roleId?: string): Promise<ResourceDto[]> {
    if (!roleId) return [];
    return apiClient.get<ResourceDto[]>(`/roles/${roleId}/resources`);
  },

  async getPermissionsForRole(roleId: string): Promise<ResourceDto[]> {
    return apiClient.get<ResourceDto[]>(`/roles/${roleId}/resources`);
  },

  /** Add a single resource to a role */
  async addResourceToRole(roleId: string, resourceId: string): Promise<void> {
    return apiClient.post(`/roles/${roleId}/resources`, { targetId: resourceId });
  },

  /** Add multiple resources to a role (calls API sequentially) */
  async addResourcesToRole(roleId: string, request: { resourceIds: string[] }): Promise<void> {
    for (const resourceId of request.resourceIds) {
      await apiClient.post(`/roles/${roleId}/resources`, { targetId: resourceId });
    }
  },

  /** Remove a single resource from a role */
  async removeResourceFromRole(roleId: string, resourceId: string): Promise<void> {
    return apiClient.delete(`/roles/${roleId}/resources/${resourceId}`);
  },

  /** Remove multiple resources from a role (calls API sequentially) */
  async removeResourcesFromRole(roleId: string, request: { resourceIds: string[] }): Promise<void> {
    for (const resourceId of request.resourceIds) {
      await apiClient.delete(`/roles/${roleId}/resources/${resourceId}`);
    }
  },
};

/**
 * Convert array response to TableMeta for table component compatibility.
 */
export const mapRoleResourcesArrayToTableMeta = (data: ResourceDto[]): TableMeta => {
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
