import { useState, useEffect, useCallback, useMemo } from 'react';
import { userContextApi } from '../api/userContextApi';
import type { ResourceCode } from '../resources';

export const usePermissions = () => {
  const [context, setContext] = useState(userContextApi.getCachedContext());
  const [isLoading, setIsLoading] = useState(!context);

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
        return context.resourceCodes.includes(permission);
      }

      // Если контекста нет, запускаем загрузку и возвращаем false
      if (!context && !isLoading) {
        console.log('[hasPermission] Контекст отсутствует, запускаем загрузку...');
        loadContext();
      }

      return false;
    },
    [context, isLoading, loadContext],
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
      canPipelineSchedule: hasResourcePermission('api.schedules.create'),
      canPipelineUnschedule: hasResourcePermission('api.schedules.delete'),
      canPipelineCreate: hasResourcePermission('api.pipelines.create'),
      canPipelineUpdate: hasResourcePermission('api.pipelines.update'),
      canPipelineDelete: hasResourcePermission('api.pipelines.delete'),
      canSessionProgressOpen: hasResourcePermission('api.sessions.get'),
      canSessionProgressDetails: hasResourcePermission('api.sessions.get'),
      canPipelineSessions: hasResourcePermission('api.sessions.list'),
      canScheduleCreate: hasResourcePermission('api.schedules.create'),
      canScheduleGet: hasResourcePermission('api.schedules.get'),
      canScheduleUpdate: hasResourcePermission('api.schedules.update'),
      canScheduleDelete: hasResourcePermission('api.schedules.delete'),
      canTriggerManual: hasResourcePermission('api.triggers.manual'),
      canTriggerStop: hasResourcePermission('api.triggers.stop'),
    };
  }, [hasResourcePermission]);

  return {
    isLoading,
    user: context?.user || null,
    hasPermission,
    hasResourcePermission,
    canViewPage,
    permissions,
    context,
  };
};
