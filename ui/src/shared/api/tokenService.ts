import { getFullApiUrl } from '../../config/apiConfig';
import { ApiError } from './ApiError';

interface TokenRefreshResponse {
  accessToken: string;
  user?: unknown;
}

class TokenService {
  private refreshTimeout: number = 10000; // 10 секунд
  private refreshPromise: Promise<string> | null = null; // Для блокировки конкурентных запросов
  private isRefreshing: boolean = false; // Флаг обновления

  async refreshToken(): Promise<string> {
    // Если уже обновляем токен, возвращаем существующий промис
    if (this.isRefreshing && this.refreshPromise) {
      // Refresh already in progress, reuse existing promise
      return this.refreshPromise;
    }

    this.isRefreshing = true;

    // Создаем новый промис для обновления
    this.refreshPromise = this.performTokenRefresh().finally(() => {
      this.isRefreshing = false;
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async performTokenRefresh(): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.refreshTimeout);

      const accessToken = this.getToken();

      // Refresh token передается автоматически через httpOnly cookie (credentials: 'include').
      // Expired access token передаем в Authorization header, чтобы бэкенд извлек userId.
      const response = await fetch(getFullApiUrl('/api/v1/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Обрабатываем пустой ответ для refresh endpoint
        const text = await response.text();
        let errorMessage = `Token refresh failed: ${response.status}`;

        if (text) {
          try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.message || errorMessage;
          } catch {
            // Ignore JSON parse error, use default message
          }
        }

        if (response.status === 401) {
          throw new ApiError('Refresh token expired', 401, 'REFRESH_TOKEN_EXPIRED');
        }

        throw new ApiError(errorMessage, response.status);
      }

      const data: TokenRefreshResponse = await response.json();

      if (!data.accessToken) {
        throw new ApiError('No access token in refresh response');
      }

      // Сохраняем новый access token
      this.setToken(data.accessToken);

      return data.accessToken;
    } catch (error) {
      console.error('Token refresh error:', error);

      // Если таймаут или сетевая ошибка
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Token refresh timeout', 408, 'REFRESH_TIMEOUT');
      }

      this.clearTokens();
      throw error;
    }
  }

  getToken(): string | null {
    try {
      return sessionStorage.getItem('accessToken');
    } catch {
      return null;
    }
  }

  setToken(token: string): void {
    try {
      sessionStorage.setItem('accessToken', token);
    } catch (error) {
      console.error('Error saving token:', error);
      throw new Error('Failed to save authentication token');
    }
  }

  clearTokens(): void {
    try {
      sessionStorage.removeItem('accessToken');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }
}

export const tokenService = new TokenService();
