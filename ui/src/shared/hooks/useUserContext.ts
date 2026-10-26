import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { userContextApi } from '../api/userContextApi';
import type { UserContextResponse, UserContextRequest } from '../api/userContextApi';
// ResourceCode import removed - no longer needed after fde-api migration

interface UseUserContextOptions {
  pages?: string[];
  autoLoad?: boolean;
  refreshOnMount?: boolean;
}

export const useUserContext = (options: UseUserContextOptions = {}) => {
  const { pages = [], autoLoad = true, refreshOnMount = false } = options;

  // Используем useRef для сохранения предыдущих значений
  const optionsRef = useRef(options);
  const pagesRef = useRef(pages);

  const [context, setContext] = useState<UserContextResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Проверяем, изменились ли опции
  const hasOptionsChanged =
    optionsRef.current.pages !== pages ||
    optionsRef.current.autoLoad !== autoLoad ||
    optionsRef.current.refreshOnMount !== refreshOnMount;

  if (hasOptionsChanged) {
    optionsRef.current = options;
    pagesRef.current = pages;
  }

  const loadContext = useCallback(
    async (forceRefresh = false) => {
      if (isLoading && !forceRefresh) {
        return;
      } // Предотвращаем повторную загрузку

      setIsLoading(true);
      setError(null);

      try {
        const request: UserContextRequest = {};

        const data = forceRefresh
          ? await userContextApi.refreshContext(request)
          : await userContextApi.getUserContext(request);

        setContext(data);
        setLastUpdated(new Date());
        console.log('[useUserContext] Контекст загружен:', data);
      } catch (err) {
        console.error('[useUserContext] Ошибка загрузки контекста:', err);
        setError(err instanceof Error ? err : new Error('Failed to load user context'));
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading], // Зависимость только от isLoading
  );

  const clearContext = useCallback(() => {
    userContextApi.clearCache();
    setContext(null);
    setLastUpdated(null);
    setError(null);
    setIsLoading(true);
  }, []);

  const refreshContext = useCallback(() => {
    return loadContext(true);
  }, [loadContext]);

  // Проверка прав доступа
  const hasPermission = useCallback(
    (permission: string): boolean => {
      console.log(
        'HAS_PERMISSION? ',
        permission,
        context,
        context?.resourceCodes?.includes(permission),
      );
      if (!context || !context.resourceCodes) return false;

      return context.resourceCodes.includes(permission);
    },
    [context],
  );

  const hasPageAccess = useCallback(
    (pageName: string): boolean => {
      //console.log('HAS_PAGE_PERMISSION?  ');
      return hasPermission(`page.${pageName}`);
    },
    [hasPermission],
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (!context || !context.resourceCodes) return false;
      return permissions.some(permission => context.resourceCodes.includes(permission));
    },
    [context],
  );

  // Получение настроек (settings is now Record<string, string>)
  const getPageSettings = useCallback(
    (pageName: string) => {
      if (!context || !context.settings) return null;
      const value = context.settings[`page.${pageName}`];
      if (!value) return null;
      try {
        return typeof value === 'string' ? JSON.parse(value) : value;
      } catch {
        return value;
      }
    },
    [context],
  );

  const getTableSetting = useCallback(
    (pageName: string, tableName: string) => {
      if (!context || !context.settings) return null;
      const key = `page.${pageName}.table.${tableName}`;
      const value = context.settings[key];
      if (!value) return null;
      try {
        return typeof value === 'string' ? JSON.parse(value) : value;
      } catch {
        return value;
      }
    },
    [context],
  );

  // Загрузка при монтировании
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (autoLoad && isMounted) {
        await loadContext(refreshOnMount);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [autoLoad, refreshOnMount]); // Убрали loadContext из зависимостей

  return {
    // Состояние
    context,
    isLoading,
    error,
    lastUpdated,

    // Пользователь и права
    user: context?.user || null,
    permissions: context?.resourceCodes || [],
    roles: context?.roleCodes || [],

    // Настройки
    settings: context?.settings || {},

    // Методы
    loadContext,
    refreshContext,
    clearContext,

    // Проверки прав
    hasPermission,
    hasPageAccess,
    hasAnyPermission,

    // Работа с настройками
    getPageSettings,
    getTableSetting,
  };
};

export const usePageAccess = (pageName: string, requiredPermissions?: string[]) => {
  // Мемоизируем pages массив
  const pages = useMemo(() => [pageName], [pageName]);

  const { hasPageAccess, hasAnyPermission, isLoading } = useUserContext({
    pages,
    autoLoad: true,
  });

  const hasAccess = useMemo(
    () => (requiredPermissions ? hasAnyPermission(requiredPermissions) : hasPageAccess(pageName)),
    [requiredPermissions, hasAnyPermission, hasPageAccess, pageName],
  );

  return {
    hasAccess,
    isLoading,
    hasPageAccess,
    hasAnyPermission,
  };
};
