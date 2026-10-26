import { apiClient } from '../../../shared/api/apiClient';
import type { TableMeta, TableParams } from '../../../shared/ui/table/types/type';
import type {
  RoleDto,
  CreateRoleRequest,
  UpdateRoleRequest,
  RoleApiResponse,
} from '../types/types';

export const fetchRoles = async (params?: TableParams): Promise<RoleApiResponse> => {
  const queryString = apiClient.getQueryParamsString(params);
  const url = `/roles${queryString ? `?${queryString}` : ''}`;
  return apiClient.get<RoleApiResponse>(url);
};

export const rolesApi = {
  /** GET /api/v1/roles -> RoleDto[] (NOT paginated) */
  async getRoles(): Promise<RoleDto[]> {
    return apiClient.get<RoleDto[]>('/roles');
  },

  async getUserRoles(): Promise<RoleDto[]> {
    console.log('Запрашиваю роли');
    const ret = await apiClient.get<RoleDto[]>('/roles/all');
    console.log('Найдено ролей = ', ret.length);
    return ret;
  },

  async getUserRoleById(id: string): Promise<RoleDto> {
    return apiClient.get<RoleDto>(`/roles/${id}`);
  },

  async createUserRole(request: CreateRoleRequest): Promise<RoleDto> {
    return apiClient.post<RoleDto>('/roles', request);
  },

  async updateUserRole(id: string, request: UpdateRoleRequest): Promise<RoleDto> {
    return apiClient.put<RoleDto>(`/roles/${id}`, request);
  },

  async deleteUserRole(id: string): Promise<void> {
    return apiClient.delete(`/roles/${id}`);
  },
};

export const mapServerResponseToTableMeta = (response: RoleApiResponse): TableMeta => {
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
