import { useState, useEffect, useCallback, useRef } from 'react';
import type { TableMeta, TableParams } from '../types/type';
import { usePermissions } from '../../../hooks/usePermissions';
import { useTablePersist } from '../../../hooks/useTablePersist';
import { useTableState } from './useTableState';

interface UseTableDataOptions<T> {
  resourceCode: string;
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
    savedState,
    isLoading: isLoadingState,
    saveState,
    hasSavedState,
  } = useTablePersist({
    resourceCode: resourceCode as any,
    waitForContext: true,
  });

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
      setIsLoading(true);
      setError(null);

      try {
        // Если параметры не переданы, создаем их из savedState
        const requestParams = params || {
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

        const response = await fetchData(requestParams);
        setData(response.data);
        setServerMeta(response.meta);

        if (onDataLoaded) {
          onDataLoaded(response.data);
        }
      } catch (err) {
        setError(err as Error);
        console.error(`[${resourceCode}] Ошибка загрузки:`, err);
      } finally {
        setIsLoading(false);
      }
    };
  }, [fetchData, savedState, defaultPageSize, resourceCode, onDataLoaded]);

  // 7. Инициализация useTableState
  const tableState = useTableState({
    initialPageSize: savedState?.pageSize || defaultPageSize,
    initialFilters: savedState?.filters || {},
    initialSort: savedState?.sortBy
      ? {
          field: savedState.sortBy,
          order: savedState.sortOrder || 'asc',
        }
      : null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onTableChange: useCallback((params: TableParams) => {
      // Сохранение происходит в handleTableChange ниже
    }, []),
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
  }, [isLoadingState, enableAutoLoad, ...dependencies]);

  // 11. Вспомогательная функция для сброса и перезагрузки
  const resetAndReload = useCallback(() => {
    tableState.handleReset();
    loadServerData();
  }, [tableState, loadServerData]);

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
