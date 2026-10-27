import { useState, useEffect, useCallback, useMemo } from 'react';
import { userContextApi } from '../api/userContextApi';
import type { ResourceCode } from '../resources';

export const usePermissions = () => {
  const [context, setContext] = useState(userContextApi.getCachedContext());
  const [isLoading, setIsLoading] = useState(!context);

  const isAdmin = context?.roleCodes?.includes('ADMIN') ?? false;

  // Функция загрузки контекста
  const loadContext = useCallback(async () => {
    try {
      setIsLoading(true);
      const newContext = await userContextApi.getUserContext();
      setContext(newContext);
    } catch (error) {
      console.error('[usePermissions] Ошибка загрузки контекста:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Проверка прав с ожиданием контекста
  const hasPermission = useCallback(
    (permission: string): boolean => {
      // Если контекст есть, проверяем права
      if (context && context.resourceCodes) {
        if (isAdmin) return true;
        const viewerResources = ['api.pipelines.list', 'api.pipelines.get', 'api.sessions.list', 'api.sessions.get', 'api.schedules.get', 'page.pipelines', 'page.sessions', 'page.analytics', 'table.pipelines', 'table.sessions', 'api.analytics.read'];
        return viewerResources.includes(permission) && context.resourceCodes.includes(permission);
      }

      // Если контекста нет, запускаем загрузку и возвращаем false
      if (!context && !isLoading) {
        console.log('[hasPermission] Контекст отсутствует, запускаем загрузку...');
        loadContext();
      }

      return false;
    },
    [context, isAdmin, isLoading, loadContext],
  );

  // Загрузка контекста при монтировании
  useEffect(() => {
    if (!context) {
      loadContext();
    }
  }, []);

  // Проверка доступа к ресурсу с действием
  const hasResourcePermission = useCallback(
    (resourceCode: ResourceCode): boolean => {
      return hasPermission(`${resourceCode}`);
    },
    [hasPermission],
  );

  const canViewPage = useCallback(
    (pageCode: string): boolean => {
      return hasPermission(`${pageCode}`);
    },
    [hasPermission],
  );

  const permissions = useMemo(() => {
    return {
      canPipelineDetails: hasResourcePermission('api.pipelines.get'),
      canPipelineSchedule: isAdmin,
      canPipelineUnschedule: isAdmin,
      canPipelineCreate: isAdmin,
      canPipelineUpdate: isAdmin,
      canPipelineDelete: isAdmin,
      canSessionProgressOpen: hasResourcePermission('api.sessions.get'),
      canSessionProgressDetails: hasResourcePermission('api.sessions.get'),
      canPipelineSessions: hasResourcePermission('api.sessions.list'),
      canScheduleCreate: isAdmin,
      canScheduleGet: hasResourcePermission('api.schedules.get'),
      canScheduleUpdate: isAdmin,
      canScheduleDelete: isAdmin,
      canTriggerManual: isAdmin,
      canTriggerStop: isAdmin,
    };
  }, [hasResourcePermission, isAdmin]);

  return {
    isLoading,
    isAdmin,
    user: context?.user || null,
    hasPermission,
    hasResourcePermission,
    canViewPage,
    permissions,
    context,
  };
};
