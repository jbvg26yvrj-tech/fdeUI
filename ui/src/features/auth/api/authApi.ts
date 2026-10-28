import { apiClient } from '../../../shared/api/apiClient';
import { ApiError } from '../../../shared/api/ApiError';

import type {
  AuthRequestDto,
  AuthResponseDto,
  ChangePasswordRequest,
  ChangePasswordResponse,
  RegistrationRequestDto,
  UserDto,
} from '../types/types';

export const authApi = {
  async providers(): Promise<{ ldapEnabled: boolean; registrationEnabled: boolean }> {
    return apiClient.get('/auth/providers');
  },
  async registration(request: RegistrationRequestDto): Promise<UserDto> {
    return apiClient.post<UserDto>('/auth/registration', request);
  },

  async login(request: AuthRequestDto): Promise<AuthResponseDto> {
    return apiClient.post<AuthResponseDto>('/auth/login', request);
  },

  async changePassword(request: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    return apiClient.post<ChangePasswordResponse>('/auth/change-password', request);
  },

  async logout(): Promise<void> {
    return apiClient.post('/auth/logout');
  },

  async refresh(): Promise<AuthResponseDto> {
    return apiClient.post<AuthResponseDto>('/auth/refresh');
  },

  async validateToken(): Promise<boolean> {
    try {
      await apiClient.get('/auth/validate');
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return false;
      }
      return true;
    }
  },
};
