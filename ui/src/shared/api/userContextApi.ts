import type { ResourceCode, TableResourceCode } from '../resources';
import { apiClient } from './apiClient';
import { ApiError } from './ApiError';

export interface UserContextResponse {
  user: {
    authSource?: 'LOCAL' | 'LDAP';
    id: string;
    login: string;
    activated: boolean;
    passwordChangeRequired: boolean;
  };
  roleCodes: string[];
  resourceCodes: string[];
  rlsFilters: Record<string, string>;
  settings: Record<string, string>;
}

export interface UserContextRequest {
  // fde-api /user-context does not accept query params, kept for interface compat
}

class UserContextService {
  private contextCacheKey = 'userContext';
  private tableSettingsCacheKey = 'tableSettingsCache';
  private pendingRequest: Promise<UserContextResponse> | null = null;
  private generation = 0;

  async getUserContext(_request?: UserContextRequest): Promise<UserContextResponse> {
    if (this.pendingRequest) {
      return this.pendingRequest;
    }

    const generation = this.generation;
    try {
      const url = '/user-context';

      console.log('[UserContext] Загружаем контекст пользователя:', url);

      this.pendingRequest = apiClient
        .get<UserContextResponse>(url)
        .then(response => {
          if (generation !== this.generation) {
            throw new ApiError('User context changed; reload permissions', 409, 'CONTEXT_CHANGED');
          }
          this.cacheContext(response);
          return response;
        })
        .finally(() => {
          if (generation === this.generation) this.pendingRequest = null;
        });

      return await this.pendingRequest;
    } catch (error) {
      console.error('[UserContext] Ошибка загрузки контекста:', error);

      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch user context due to network error');
    }
  }

  private cacheContext(context: UserContextResponse): void {
    try {
      sessionStorage.setItem(this.contextCacheKey, JSON.stringify(context));
    } catch (error) {
      console.error('[UserContext] Ошибка сохранения кэша:', error);
    }
  }

  getCachedContext(): UserContextResponse | null {
    try {
      const cached = sessionStorage.getItem(this.contextCacheKey);
      if (!cached) {
        return null;
      }
      return JSON.parse(cached);
    } catch (error) {
      console.error('[UserContext] Ошибка чтения кэша:', error);
      this.clearCache();
      return null;
    }
  }

  // Получить настройки по коду ресурса
  getSettingByResourceCode(resourceCode: ResourceCode): any | null {
    try {
      const context = this.getCachedContext();
      if (!context || !context.settings) {
        return null;
      }

      const value = context.settings[resourceCode];
      if (value) {
        try {
          return typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
          return value;
        }
      }

      return null;
    } catch (error) {
      console.error('[UserContext] Ошибка получения настройки по коду ресурса:', error);
      return null;
    }
  }

  // Получить настройку таблицы по коду ресурса
  getTableSettingByResourceCode(tableCode: TableResourceCode): any | null {
    return this.getSettingByResourceCode(tableCode);
  }

  // Новый метод: сохранить настройку таблицы в отдельный кэш (session storage)
  cacheTableSettingByResourceCode(resourceCode: ResourceCode, data: any): void {
    try {
      const cachedTableSettings = this.getTableSettingsCache();

      cachedTableSettings[resourceCode] = {
        ...data,
        _cachedAt: new Date().toISOString(),
        _source: 'client_cache',
      };

      this.saveTableSettingsCache(cachedTableSettings);
      console.log(`[UserContext] Настройка сохранена в кэш: ${resourceCode}`);
    } catch (error) {
      console.error('[UserContext] Ошибка сохранения настройки в кэш:', error);
    }
  }

  // Новый метод: очистить кэш настройки
  clearTableSettingCacheByResourceCode(resourceCode: ResourceCode): void {
    try {
      const cachedTableSettings = this.getTableSettingsCache();

      if (cachedTableSettings[resourceCode]) {
        delete cachedTableSettings[resourceCode];
        this.saveTableSettingsCache(cachedTableSettings);
        console.log(`[UserContext] Кэш настройки ${resourceCode} очищен`);
      }
    } catch (error) {
      console.error('[UserContext] Ошибка очистки кэша настройки:', error);
    }
  }

  // Вспомогательные методы для работы с отдельным кэшем таблиц
  private getTableSettingsCache(): Record<string, any> {
    try {
      const cached = sessionStorage.getItem(this.tableSettingsCacheKey);
      if (!cached) {
        return {};
      }
      return JSON.parse(cached);
    } catch (error) {
      console.error('[UserContext] Ошибка чтения кэша таблиц:', error);
      return {};
    }
  }

  private saveTableSettingsCache(cache: Record<string, any>): void {
    try {
      sessionStorage.setItem(this.tableSettingsCacheKey, JSON.stringify(cache));
    } catch (error) {
      console.error('[UserContext] Ошибка сохранения кэша таблиц:', error);
    }
  }

  // Обновить настройку и кэш на сервере
  async updateTableSettingByResourceCode(resourceCode: ResourceCode, data: any): Promise<void> {
    try {
      // Обновляем настройку на сервере
      const { settingsApi } = await import('./settingsApi');
      await settingsApi.saveTableSetting(resourceCode, data);

      // Обновляем основной кэш контекста
      const context = this.getCachedContext();
      if (context && context.settings) {
        context.settings[resourceCode] = JSON.stringify(data);
        this.cacheContext(context);
      }

      // Также обновляем отдельный кэш таблиц
      this.cacheTableSettingByResourceCode(resourceCode, data);

      console.log('[UserContext] Настройка обновлена на сервере и в кэше');
    } catch (error) {
      console.error('[UserContext] Ошибка обновления настройки:', error);
      throw error;
    }
  }

  // Получить права пользователя (resource codes)
  getUserPermissions(): string[] {
    try {
      const context = this.getCachedContext();
      if (!context || !context.resourceCodes) {
        return [];
      }
      return context.resourceCodes;
    } catch (error) {
      console.error('[UserContext] Ошибка получения прав:', error);
      return [];
    }
  }

  // Проверить наличие прав
  hasPermission(permission: string): boolean {
    const permissions = this.getUserPermissions();
    return permissions.includes(permission);
  }

  // Проверить доступ к ресурсу
  hasResourceAccess(resourceCode: ResourceCode, action: string): boolean {
    return this.hasPermission(`${resourceCode}.${action}`);
  }

  // Проверить доступ к странице
  hasPageAccess(pageCode: string): boolean {
    return this.hasPermission(`${pageCode}.view`);
  }

  // Очистить кэш
  clearCache(): void {
    this.generation += 1;
    this.pendingRequest = null;
    this.clearStoredContext();
  }

  private clearStoredContext(): void {
    try {
      sessionStorage.removeItem(this.contextCacheKey);
      sessionStorage.removeItem(this.tableSettingsCacheKey);
    } catch (error) {
      console.error('[UserContext] Ошибка очистки кэша:', error);
    }
  }

  // Принудительно обновить контекст
  async refreshContext(request?: UserContextRequest): Promise<UserContextResponse> {
    // Refresh within the same identity may share an in-flight request.
    // Only clearCache (logout/login) invalidates that identity's promises.
    this.clearStoredContext();
    return this.getUserContext(request);
  }

  // Немедленное обновление настроек (для UI)
  updateTableSettingsImmediately(resourceCode: ResourceCode, data: any): void {
    try {
      const context = this.getCachedContext();

      if (context && context.settings) {
        context.settings[resourceCode] = JSON.stringify(data);
        this.cacheContext(context);
      }

      // Диспатчим событие для обновления UI
      window.dispatchEvent(
        new CustomEvent('tableSettingsUpdated', {
          detail: { resourceCode, data },
        }),
      );

      console.log(`[UserContext] Настройки обновлены: ${resourceCode}`, data);
    } catch (error) {
      console.error('[UserContext] Ошибка немедленного обновления настроек:', error);
    }
  }

  // Получить настройки из sessionStorage
  getTableSettingsFromStorage(resourceCode: ResourceCode): any | null {
    try {
      const context = this.getCachedContext();
      if (!context || !context.settings) {
        return null;
      }

      const value = context.settings[resourceCode];
      if (value) {
        try {
          return typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
          return value;
        }
      }

      return null;
    } catch (error) {
      console.error('[UserContext] Ошибка чтения настроек из контекста:', error);
      return null;
    }
  }
}

export const userContextApi = new UserContextService();
