import { apiClient } from '../../../shared/api/apiClient';
import type { TableApiResponse } from '../../../shared/types/Types';
import type { UserDto, CreateUserRequest, UpdateUserRequest } from '../types/types';

export type UsersApiResponse = TableApiResponse<UserDto>;

export const usersApi = {
  async getUsersWithParams(params?: any): Promise<UsersApiResponse> {
    const queryParams = new URLSearchParams();

    if (params) {
      if (params.pagination) {
        queryParams.append('page', (params.pagination.page - 1).toString());
        queryParams.append('size', params.pagination.size.toString());
      }

      if (params.sort) {
        queryParams.append('sort', `${params.sort.field},${params.sort.order}`);
      }

      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          if (typeof value === 'string' && value !== '') {
            queryParams.append(key, value);
          }
        });
      }
    }

    const queryString = queryParams.toString();
    const url = `/users${queryString ? `?${queryString}` : ''}`;

    return apiClient.get<UsersApiResponse>(url);
  },

  async getUsers(): Promise<UserDto[]> {
    const response = await apiClient.get<UsersApiResponse>('/users?size=10000');
    return response.content;
  },

  async getUserById(userId: string): Promise<UserDto> {
    return apiClient.get<UserDto>(`/users/${userId}`);
  },

  async createUser(userData: CreateUserRequest): Promise<UserDto> {
    return apiClient.post<UserDto>('/users', userData);
  },

  async updateUser(userId: string, userData: UpdateUserRequest): Promise<UserDto> {
    return apiClient.put<UserDto>(`/users/${userId}`, userData);
  },

  async deleteUser(userId: string): Promise<void> {
    return apiClient.delete(`/users/${userId}`);
  },
};
