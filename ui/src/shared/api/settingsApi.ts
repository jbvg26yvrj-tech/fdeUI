import type { ResourceCode } from '../resources';
import { apiClient } from './apiClient';
import { userContextApi } from './userContextApi';

export interface UserSetting {
  id: string;
  key: string;
  value: any;
  name?: string;
  description?: string;
  resourceType: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveSettingRequest {
  resourceCode: ResourceCode;
  value?: string;
  name?: string;
  description?: string;
  skipContextRefresh?: boolean;
}

export interface TableState {
  pageSize?: number;
  sortBy?: string | null;
  sortOrder?: 'asc' | 'desc';
  columnWidths?: Record<string, number>;
  filters?: Record<string, any>;
}

export const settingsApi = {
  async getAllSettings(): Promise<UserSetting[]> {
    try {
      const context = await userContextApi.getUserContext();
      const allSettings: UserSetting[] = [];

      if (context.settings) {
        // settings is now Record<string, string> from fde-api
        Object.entries(context.settings).forEach(([key, value]) => {
          allSettings.push({
            id: key,
            key,
            value,
            resourceType: 'TABLE',
            createdAt: '',
            updatedAt: '',
          });
        });
      }

      return allSettings;
    } catch (error) {
      console.error('[SettingsApi] Ошибка получения всех настроек:', error);
      return [];
    }
  },

  async getSettingsByPrefix(prefix: string): Promise<UserSetting[]> {
    try {
      const allSettings = await this.getAllSettings();
      return allSettings.filter(setting => setting.key.startsWith(prefix));
    } catch (error) {
      console.error(`[SettingsApi] Ошибка получения настроек по префиксу ${prefix}:`, error);
      return [];
    }
  },

  async getGlobalSettings(): Promise<UserSetting[]> {
    try {
      const allSettings = await this.getAllSettings();
      return allSettings.filter(setting => setting.resourceType === 'GLOBAL');
    } catch (error) {
      console.error('[SettingsApi] Ошибка получения глобальных настроек:', error);
      return [];
    }
  },

  async getSetting(resourceCode: ResourceCode): Promise<UserSetting | null> {
    try {
      const allSettings = await this.getAllSettings();
      return allSettings.find(setting => setting.key === resourceCode) || null;
    } catch (error) {
      console.error(`[SettingsApi] Ошибка получения настройки ${resourceCode}:`, error);
      return null;
    }
  },

  async saveSetting(request: SaveSettingRequest): Promise<UserSetting> {
    let value = request.value;
    if (value !== undefined && value !== null) {
      try {
        JSON.parse(value);
      } catch {
        value = JSON.stringify(value);
      }
    }

    const response = await apiClient.post<UserSetting>('/user-settings', {
      key: request.resourceCode,
      value: value || '',
    });

    if (!request.skipContextRefresh) {
      setTimeout(() => {
        userContextApi.refreshContext().catch(console.error);
      }, 100);
    }

    return response;
  },

  async saveTableSetting(tableCode: ResourceCode, state: TableState): Promise<UserSetting> {
    return this.saveSetting({
      resourceCode: tableCode,
      value: JSON.stringify(state),
      name: `Настройки таблицы`,
      description: `Настройки таблицы`,
      skipContextRefresh: true,
    });
  },

  async deleteSetting(_settingId: string): Promise<void> {
    // fde-api user-settings does not have delete by id; refresh context instead
    setTimeout(() => {
      userContextApi.refreshContext().catch(console.error);
    }, 100);
  },

  async deleteSettingByResourceCode(_resourceCode: ResourceCode): Promise<void> {
    // fde-api user-settings does not have delete by key; refresh context instead
    setTimeout(() => {
      userContextApi.refreshContext().catch(console.error);
    }, 100);
  },
};
