import { useState, useEffect, useCallback, useRef } from 'react';
import type { TableMeta, TableParams } from '../types/type';
import { usePermissions } from '../../../hooks/usePermissions';
import { useTablePersist } from '../../../hooks/useTablePersist';
import { useTableState } from './useTableState';
import { listStateKey, readListState, writeListState } from '../../../hooks/listReturnState';

interface UseTableDataOptions<T> {
  resourceCode: string;
  navigationSearch?: string;
  fetchData: (params?: TableParams) => Promise<{
    data: T[];
    meta: TableMeta;
  }>;
  defaultPageSize?: number;
  dependencies?: any[];
  enableAutoLoad?: boolean;
  onDataLoaded?: (data: T[]) => void;
}

export function useTableData<T>({
  resourceCode,
  navigationSearch,
  fetchData,
  defaultPageSize = 10,
  dependencies = [],
  enableAutoLoad = true,
  onDataLoaded,
}: UseTableDataOptions<T>) {
  // 1. Права доступа
  const { permissions, isLoading: permissionsLoading } = usePermissions();

  // 2. Персистентность
  const {
    savedState: persistedState,
    isLoading: isLoadingState,
    saveState,
    hasSavedState,
  } = useTablePersist({
    resourceCode: resourceCode as any,
    waitForContext: true,
  });

  const navigationKey = listStateKey(resourceCode, navigationSearch);
  const navigationParams = readListState(navigationKey).params;
  const savedState = navigationParams ? {
    sortBy: navigationParams.sort?.field || null,
    sortOrder: navigationParams.sort?.order || 'asc' as const,
    filters: navigationParams.filters || {},
    pageSize: navigationParams.pagination.size,
  } : persistedState;
  const requestSequence = useRef(0);
  const currentParamsRef = useRef<{ key: string | null; params: TableParams } | null>(null);
  useEffect(() => () => { requestSequence.current += 1; }, []);

  // 3. Состояния данных
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [serverMeta, setServerMeta] = useState<TableMeta>();

  // 4. Используем ref для функции загрузки данных
  const loadServerDataRef = useRef<((params?: TableParams) => Promise<void>) | null>(null);

  // 5. Ref для предыдущих параметров (чтобы определить, что изменилось)
  const prevParamsRef = useRef<TableParams | null>(null);

  // 6. Создаем базовую функцию загрузки, которая не зависит от tableState
  const createLoadServerData = useCallback(() => {
    return async (params?: TableParams) => {
      const sequence = ++requestSequence.current;
      setIsLoading(true);
      setError(null);

      try {
        // Если параметры не переданы, создаем их из savedState
        const requestParams = params || (currentParamsRef.current?.key === navigationKey ? currentParamsRef.current.params : null) || readListState(navigationKey).params || {
          pagination: {
            page: 1,
            size: savedState?.pageSize || defaultPageSize,
          },
          sort: savedState?.sortBy
            ? {
                field: savedState.sortBy,
                order: savedState.sortOrder || 'asc',
              }
            : null,
          filters: savedState?.filters || {},
        };

        currentParamsRef.current = { key: navigationKey, params: requestParams };
        writeListState(navigationKey, { params: requestParams });
        const response = await fetchData(requestParams);
        if (sequence !== requestSequence.current) return;
        setData(response.data);
        setServerMeta(response.meta);

        if (onDataLoaded) {
          onDataLoaded(response.data);
        }
      } catch (err) {
        if (sequence !== requestSequence.current) return;
        setError(err as Error);
        console.error(`[${resourceCode}] Ошибка загрузки:`, err);
      } finally {
        if (sequence === requestSequence.current) setIsLoading(false);
      }
    };
  }, [fetchData, savedState, defaultPageSize, resourceCode, onDataLoaded, navigationKey]);

  // 7. Инициализация useTableState
  const tableState = useTableState({
    initialPageSize: savedState?.pageSize || defaultPageSize,
    initialPage: navigationParams?.pagination.page || 1,
    initialFilters: savedState?.filters || {},
    initialSort: savedState?.sortBy
      ? {
          field: savedState.sortBy,
          order: savedState.sortOrder || 'asc',
        }
      : null,

  });

  // 8. Инициализируем функцию загрузки
  const loadServerData = createLoadServerData();

  // 9. Обновляем ref с актуальной функцией
  useEffect(() => {
    loadServerDataRef.current = createLoadServerData();
  }, [createLoadServerData]);

  // 10. Первоначальная загрузка при монтировании
  useEffect(() => {
    if (!enableAutoLoad) return;
    if (isLoadingState) return;

    console.log(`[${resourceCode}] Начинаем загрузку данных с параметрами:`, {
      savedState,
    });

    loadServerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingState, enableAutoLoad, navigationKey, ...dependencies]);

  // 11. Вспомогательная функция для сброса и перезагрузки
  const resetAndReload = useCallback(() => {
    tableState.handleReset();
    const params: TableParams = { pagination: { page: 1, size: defaultPageSize }, sort: null, filters: {} };
    saveState(params);
    loadServerData(params);
  }, [tableState, loadServerData, defaultPageSize, saveState]);

  // 12. Единый обработчик изменения параметров таблицы (передаётся в Table)
  const handleTableChange = useCallback(
    (params: TableParams) => {
      const prev = prevParamsRef.current;

      const isSortChanged = JSON.stringify(prev?.sort) !== JSON.stringify(params.sort);
      const isFiltersChanged = JSON.stringify(prev?.filters) !== JSON.stringify(params.filters);

      // Сохраняем состояние только при изменении сортировки или фильтров
      if (isSortChanged || isFiltersChanged) {
        saveState(params);
      }

      // Загружаем данные всегда
      loadServerDataRef.current?.(params);

      // Обновляем ref
      prevParamsRef.current = params;
    },
    [saveState],
  );

  return {
    // Состояния данных
    data,
    isLoading,
    error,
    serverMeta,

    // Состояние UI таблицы (из useTableState)
    ...tableState,

    // Персистентность
    savedState,
    initialPage: navigationParams?.pagination.page || 1,
    isLoadingState,
    hasSavedState,

    // Права доступа
    permissions,
    permissionsLoading,

    // Методы
    loadServerData,
    resetAndReload,

    // Единый обработчик изменения параметров таблицы
    handleTableChange,

    // Вспомогательные
    resourceCode,
  };
}
