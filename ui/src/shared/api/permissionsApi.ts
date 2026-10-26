import { userContextApi } from './userContextApi';

export interface UserPermissions {
  roleCodes: string[];
  resourceCodes: string[];
}

export interface Resource {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: 'PAGE' | 'BUTTON' | 'TABLE' | 'MENU' | 'API' | 'DATA' | 'GLOBAL';
  createdAt: string;
}

export const permissionsApi = {
  async getCurrentUserPermissions(): Promise<UserPermissions> {
    try {
      const context = await userContextApi.getUserContext();

      return {
        roleCodes: context.roleCodes || [],
        resourceCodes: context.resourceCodes || [],
      };
    } catch (error) {
      console.error('[PermissionsApi] Ошибка получения прав из контекста:', error);
      return { roleCodes: [], resourceCodes: [] };
    }
  },

  async checkPermission(resourceCode: string): Promise<boolean> {
    const context = userContextApi.getCachedContext();
    if (context) {
      return (context.resourceCodes || []).includes(resourceCode);
    }
    const freshContext = await userContextApi.getUserContext();
    return (freshContext.resourceCodes || []).includes(resourceCode);
  },

  async checkPermissions(resourceCodes: string[]): Promise<Record<string, boolean>> {
    const context = userContextApi.getCachedContext() || (await userContextApi.getUserContext());
    const userResources = context.resourceCodes || [];
    const result: Record<string, boolean> = {};
    for (const code of resourceCodes) {
      result[code] = userResources.includes(code);
    }
    return result;
  },
};
