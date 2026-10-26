import { getFullApiUrl } from '../../config/apiConfig';
import type { TableParams } from '../ui/table/types/type';
import { ApiError } from './ApiError';
import { tokenService } from './tokenService';

interface ErrorResponse {
  error?: string;
  message?: string;
  details?: string;
  code?: string;
}

class ApiClient {
  private requestTimeout: number;

  constructor() {
    this.requestTimeout = 30000;
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const text = await response.text();

    if (!text) {
      // 204 No Content is a valid success response (e.g., logout)
      if (response.status === 204 || (response.ok && response.status >= 200 && response.status < 300)) {
        return undefined as T;
      }
      if (response.status === 401) {
        throw new ApiError('Authentication required', 401, 'AUTH_REQUIRED');
      }
      throw new ApiError('Empty response from server', response.status, 'EMPTY_RESPONSE');
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      console.error('Failed to parse JSON response:', text);
      throw new ApiError('Invalid JSON response', response.status, 'INVALID_JSON', text);
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    try {
      const data = await this.parseResponse<T>(response);

      if (this.isAuthenticationError(data)) {
        throw new ApiError(
          (data as ErrorResponse).message || 'Authentication required',
          401,
          'AUTH_ERROR',
        );
      }

      if (!response.ok) {
        const errorData = data as ErrorResponse;
        throw new ApiError(
          errorData.message || `HTTP Error: ${response.status} ${response.statusText}`,
          response.status,
          errorData.error || errorData.code,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw error;
      }

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        response.status,
        'RESPONSE_PARSE_ERROR',
      );
    }
  }

  private isAuthenticationError(data: unknown): boolean {
    if (typeof data !== 'object' || data === null) return false;

    const errorData = data as ErrorResponse;
    return (errorData.error === 'UNAUTHORIZED' ||
      errorData.message?.toLowerCase().includes('authentication') ||
      errorData.message?.toLowerCase().includes('token') ||
      errorData.message?.toLowerCase().includes('unauthorized')) as boolean;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = tokenService.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  private shouldTriggerLogout(error: unknown): boolean {
    if (!(error instanceof ApiError) || error.status === undefined) return false;

    const logoutStatuses = [400, 401, 403];
    return logoutStatuses.includes(error.status);
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include',
        mode: 'cors',
        signal: controller.signal,
        headers: {
          ...this.getHeaders(),
          ...(options.headers as Record<string, string>),
        },
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408, 'TIMEOUT');
      }

      if (error instanceof TypeError) {
        console.error('Network error details:', error.message);
        throw new ApiError(
          `Network error: ${error.message}. Please check if the server is running and accessible.`,
          0,
          'NETWORK_ERROR',
        );
      }

      throw error;
    }
  }

  private async requestWithRefresh<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const makeRequest = async (): Promise<Response> => {
      const url = getFullApiUrl(endpoint);
      // Headers intentionally omitted from logs to avoid exposing tokens

      try {
        return await this.fetchWithTimeout(url, {
          ...options,
          headers: this.getHeaders(),
        });
      } catch (error) {
        console.error(`Request failed: ${url}`, error);
        throw error;
      }
    };

    try {
      let response = await makeRequest();
      let responseData: T;

      try {
        responseData = await this.handleResponse<T>(response);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401 && tokenService.getToken()) {
          try {
            await tokenService.refreshToken();

            response = await makeRequest();
            responseData = await this.handleResponse<T>(response);
          } catch (refreshError) {
            console.error('❌ Token refresh failed:', refreshError);

            if (this.shouldTriggerLogout(refreshError)) {
              this.triggerLogout();
            }
            throw refreshError;
          }
        } else {
          throw error;
        }
      }

      return responseData;
    } catch (error) {
      console.error(`❌ Final request failure: ${endpoint}`, error);
      throw error;
    }
  }

  private triggerLogout(): void {
    window.dispatchEvent(new CustomEvent('authTokenRefreshFailed'));
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.requestWithRefresh<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.requestWithRefresh<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.requestWithRefresh<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.requestWithRefresh<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.requestWithRefresh<T>(endpoint, { method: 'DELETE' });
  }

  async deleteWithBody<T>(endpoint: string, data?: any): Promise<T> {
    const config: RequestInit = {
      method: 'DELETE',
    };

    if (data) {
      config.body = JSON.stringify(data);
      config.headers = {
        'Content-Type': 'application/json',
        ...this.getHeaders(),
      };
    }

    return this.requestWithRefresh<T>(endpoint, config);
  }

  /**
   * Преобразует TableParams в строку запроса.
   * Для фильтров с типом "datetime" (объект { value, operator, precision })
   * генерирует два параметра: {field}={value} и {field}Operator={operator}.
   */
  getQueryParamsString(
    params?: TableParams,
    additionalParams?: Record<string, string | undefined>,
  ): string {
    const queryParams = new URLSearchParams();

    if (params) {
      // Пагинация (fde-api использует page + size)
      if (params.pagination) {
        queryParams.append('page', (params.pagination.page - 1).toString());
        queryParams.append('size', params.pagination.size.toString());
      }

      // Сортировка (fde-api формат: sort=field,order)
      if (params.sort) {
        queryParams.append('sort', `${params.sort.field},${params.sort.order}`);
      }

      // Фильтры – специальная обработка для дат
      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          if (value === '' || value === null || value === undefined) {
            return;
          }

          // Проверяем, является ли значение объектом даты
          if (
            typeof value === 'object' &&
            value !== null &&
            'value' in value &&
            'operator' in value
          ) {
            // 👇 datetime фильтр – два параметра
            queryParams.append(key, value.value as string);
            queryParams.append(`${key}Operator`, value.operator as string);
          } else {
            // 👇 обычный фильтр (строка, число, булево)
            queryParams.append(key, String(value));
          }
        });
      }
    }

    // Дополнительные параметры (например, для контекста)
    if (additionalParams) {
      Object.entries(additionalParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });
    }

    return queryParams.toString();
  }

  normalizeFilters(filters: Record<string, string | null>): Record<string, string> {
    const normalized: Record<string, string> = {};
    for (const key in filters) {
      normalized[key] = filters[key] ?? '';
    }
    return normalized;
  }
}

export const apiClient = new ApiClient();
