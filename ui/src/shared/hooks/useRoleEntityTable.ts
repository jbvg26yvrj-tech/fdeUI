import { useState, useEffect, useCallback, useRef } from 'react';
import { useTablePersist } from './useTablePersist';
import type { TableParams, TableMeta } from '../ui/table/types/type';
import type { TableResourceCode } from '../resources';
import { rolesApi } from '../../features/permissions/api/rolesApi';
import type { RoleDto } from '../../features/permissions/types/types';
import { cleanFiltersFromRoleCode } from '../utils/filters';

interface UseRoleEntityTableOptions<T> {
  resourceCode: TableResourceCode;
  fetchData: (
    params: TableParams | undefined,
    roleId: string,
  ) => Promise<{
    data: T[];
    meta: TableMeta;
  }>;
  defaultPageSize?: number;
  onDataLoaded?: (data: T[]) => void;
}

export function useRoleEntityTable<T>({
  resourceCode,
  fetchData,
  defaultPageSize = 10,
  onDataLoaded,
}: UseRoleEntityTableOptions<T>) {
  const [availableRoles, setAvailableRoles] = useState<RoleDto[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [selectedRoleCode, setSelectedRoleCode] = useState<string>('');
  const [selectedRoleName, setSelectedRoleName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T[]>([]);
  const [serverMeta, setServerMeta] = useState<TableMeta | undefined>();

  const {
    savedState,
    isLoading: isLoadingState,
    saveState,
    hasSavedState,
  } = useTablePersist({
    resourceCode,
    waitForContext: true,
  });

  const hasLoadedInitialData = useRef(false);
  const row_limit = defaultPageSize;

  // Загрузка списка ролей
  const loadAvailableRoles = useCallback(async () => {
    try {
      const roles = await rolesApi.getUserRoles();
      setAvailableRoles(roles);
      if (roles.length > 0 && !selectedRoleId) {
        const first = roles[0];
        setSelectedRoleId(first.id);
        setSelectedRoleCode(first.code);
        setSelectedRoleName(first.name);
        return { id: first.id, code: first.code, name: first.name };
      }
      return { id: selectedRoleId, code: selectedRoleCode, name: selectedRoleName };
    } catch (err) {
      console.error('Ошибка загрузки ролей:', err);
      return null;
    }
  }, [selectedRoleId, selectedRoleCode, selectedRoleName]);

  // Загрузка данных для выбранной роли
  const loadData = useCallback(
    async (params?: TableParams, roleId?: string) => {
      if (!roleId) return;
      setIsLoading(true);
      setError(null);
      try {
        const cleanParams = params ? { ...params } : undefined;
        if (cleanParams?.filters) {
          cleanParams.filters = cleanFiltersFromRoleCode(cleanParams.filters);
        }
        const response = await fetchData(cleanParams, roleId);
        setData(response.data);
        setServerMeta(response.meta);
        if (onDataLoaded) onDataLoaded(response.data);
      } catch (err) {
        setError(err as Error);
        console.error('Ошибка загрузки данных:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchData, onDataLoaded],
  );

  // Обработчик изменения параметров таблицы
  const handleTableChange = useCallback(
    (params: TableParams) => {
      const cleanParams = { ...params };
      if (cleanParams.filters) {
        cleanParams.filters = cleanFiltersFromRoleCode(cleanParams.filters);
      }
      saveState(cleanParams);
      loadData(cleanParams, selectedRoleId);
    },
    [loadData, saveState, selectedRoleId],
  );

  // Смена роли
  const handleRoleChange = useCallback(
    (roleId: string) => {
      const role = availableRoles.find(r => r.id === roleId);
      if (!role) return;

      setSelectedRoleId(roleId);
      setSelectedRoleCode(role.code);
      setSelectedRoleName(role.name);

      const currentFilters = cleanFiltersFromRoleCode(savedState?.filters);
      const currentParams: TableParams = {
        pagination: { page: 1, size: row_limit },
        sort: savedState?.sortBy
          ? { field: savedState.sortBy, order: savedState.sortOrder || 'asc' }
          : null,
        filters: currentFilters,
      };
      if (savedState?.pageSize) {
        currentParams.pagination.size = savedState.pageSize;
      }
      loadData(currentParams, roleId);
    },
    [availableRoles, loadData, savedState, row_limit],
  );

  // Инициализация
  useEffect(() => {
    if (isLoadingState) return;

    const init = async () => {
      const loadedRole = await loadAvailableRoles();
      if (!loadedRole?.id) return;

      const initialParams: TableParams = {
        pagination: { page: 1, size: row_limit },
        sort: null,
        filters: {},
      };

      if (savedState) {
        const safeFilters = cleanFiltersFromRoleCode(savedState.filters || {});
        initialParams.sort = savedState.sortBy
          ? { field: savedState.sortBy, order: savedState.sortOrder || 'asc' }
          : null;
        initialParams.filters = safeFilters;
        if (savedState.pageSize) {
          initialParams.pagination.size = savedState.pageSize;
        }
      }

      await loadData(initialParams, loadedRole.id);
    };

    if (!hasLoadedInitialData.current) {
      init();
      hasLoadedInitialData.current = true;
    }
  }, [isLoadingState, savedState, hasSavedState, loadAvailableRoles, loadData, row_limit]);

  return {
    // Роли
    availableRoles,
    selectedRoleId,
    selectedRoleCode,
    selectedRoleName,
    isLoadingRoles: isLoadingState,

    // Данные
    data,
    isLoading,
    error,
    serverMeta,
    savedState,
    hasSavedState,

    // Методы
    handleRoleChange,
    handleTableChange,
    loadData,
    refresh: () => loadData(undefined, selectedRoleId),
  };
}
