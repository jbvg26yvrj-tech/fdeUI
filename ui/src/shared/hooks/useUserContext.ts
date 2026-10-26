import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { userContextApi } from '../api/userContextApi';
import type { UserContextResponse, UserContextRequest } from '../api/userContextApi';
import { useAuth } from '../../context/AuthContext';
// ResourceCode import removed - no longer needed after fde-api migration

interface UseUserContextOptions {
  pages?: string[];
  autoLoad?: boolean;
  refreshOnMount?: boolean;
}

export const useUserContext = (options: UseUserContextOptions = {}) => {
  const { pages = [], autoLoad = true, refreshOnMount = false } = options;
  const { user: authenticatedUser } = useAuth();

  // Используем useRef для сохранения предыдущих значений
  const optionsRef = useRef(options);
  const pagesRef = useRef(pages);

  const [loadedContext, setContext] = useState<UserContextResponse | null>(null);
  const context =
    authenticatedUser && loadedContext?.user.id === authenticatedUser.id ? loadedContext : null;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const loadingRef = useRef(false);
  const requestVersion = useRef(0);

  // Проверяем, изменились ли опции
  const hasOptionsChanged =
    optionsRef.current.pages !== pages ||
    optionsRef.current.autoLoad !== autoLoad ||
    optionsRef.current.refreshOnMount !== refreshOnMount;

  if (hasOptionsChanged) {
    optionsRef.current = options;
    pagesRef.current = pages;
  }

  const loadContext = useCallback(async (forceRefresh = false) => {
    if (loadingRef.current) {
      return;
    } // Предотвращаем повторную загрузку

    setIsLoading(true);
    const version = ++requestVersion.current;
    loadingRef.current = true;
    setError(null);

    try {
      const request: UserContextRequest = {};

      const data = forceRefresh
        ? await userContextApi.refreshContext(request)
        : await userContextApi.getUserContext(request);

      if (version !== requestVersion.current) return;
      setContext(data);
      setLastUpdated(new Date());
      console.log('[useUserContext] Контекст загружен:', data);
    } catch (err) {
      if (version !== requestVersion.current) return;
      console.error('[useUserContext] Ошибка загрузки контекста:', err);
      setError(err instanceof Error ? err : new Error('Failed to load user context'));
    } finally {
      if (version === requestVersion.current) {
        loadingRef.current = false;
        setIsLoading(false);
      }
    }
  }, []);

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
    requestVersion.current += 1;
    loadingRef.current = false;
    setContext(null);

    const loadData = async () => {
      if (autoLoad && isMounted) {
        await loadContext(refreshOnMount);
      }
    };

    loadData();

    return () => {
      isMounted = false;
      requestVersion.current += 1;
    };
  }, [autoLoad, refreshOnMount, authenticatedUser?.id]);

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
