import type { TableMeta, TableParams } from '../../../shared/ui/table/types/type';
import { apiClient } from '../../../shared/api/apiClient';
import type { UserDto } from '../../auth/types/types';
import type { UserApiResponse } from '../types/types';

/**
 * fde-api role-users endpoints:
 * GET  /api/v1/roles/{roleId}/users -> UserResponse[] (NOT paginated)
 * POST /api/v1/roles/{roleId}/users -> {targetId: uuid}
 * DELETE /api/v1/roles/{roleId}/users/{userId} -> 204
 */

export const fetchUsers = async (
  params?: TableParams,
  roleId?: string,
): Promise<UserApiResponse> => {
  const queryString = apiClient.getQueryParamsString(params);
  const url = `/roles/${roleId}/users${queryString ? `?${queryString}` : ''}`;
  return apiClient.get<UserApiResponse>(url);
};

export const roleUserApi = {
  /** Get users assigned to a role. Returns array. */
  async getAssignedUsers(roleId?: string): Promise<UserDto[]> {
    if (!roleId) return [];
    return apiClient.get<UserDto[]>(`/roles/${roleId}/assignedusers`);
  },
  async getRoleUsers(roleId?: string): Promise<UserDto[]> {
    if (!roleId) return [];
    return apiClient.get<UserDto[]>(`/roles/${roleId}/users`);
  },

  /** Add a single user to a role */
  async addUserToRole(roleId: string, userId: string): Promise<void> {
    return apiClient.post(`/roles/${roleId}/users`, { targetId: userId });
  },

  /** Add multiple users to a role (calls API sequentially for each user) */
  async addUsersToRole(roleId: string, userIds: string[]): Promise<void> {
    for (const userId of userIds) {
      await apiClient.post(`/roles/${roleId}/users`, { targetId: userId });
    }
  },

  /** Remove a single user from a role */
  async removeUserFromRole(roleId: string, userId: string): Promise<void> {
    return apiClient.delete(`/roles/${roleId}/users/${userId}`);
  },

  /** Remove multiple users from a role (calls API sequentially for each user) */
  async removeUsersFromRole(roleId: string, userIds: string[]): Promise<void> {
    for (const userId of userIds) {
      await apiClient.delete(`/roles/${roleId}/users/${userId}`);
    }
  },
};

/**
 * Convert array response to TableMeta for table component compatibility.
 */
/*
export const mapRoleUsersArrayToTableMeta = (data: UserDto[]): TableMeta => {
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

export const mapServerResponseToTableMeta = (response: UserApiResponse): TableMeta => {
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
