// shared/hooks/useEntityTableData.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { useTableData } from './useTableData';
import type { TableMeta, TableParams } from '../types/type';

interface UseEntityTableDataOptions<T, E> {
  resourceCode: string;
  fetchData: (
    params: TableParams,
    entityId: string,
  ) => Promise<{
    data: T[];
    meta: TableMeta;
  }>;
  fetchEntities: () => Promise<E[]>;
  getEntityId: (entity: E) => string;
  getEntityName?: (entity: E) => string;
  defaultEntityId?: string;
  defaultPageSize?: number;
  dependencies?: any[];
  enableAutoLoad?: boolean;
  onDataLoaded?: (data: T[]) => void;
  onEntityChange?: (entityId: string, entityName?: string) => void;
  resetPageOnEntityChange?: boolean;
  preserveFiltersOnEntityChange?: boolean;
}

export function useEntityTableData<T, E>({
  resourceCode,
  fetchData,
  fetchEntities,
  getEntityId,
  getEntityName = entity => String(entity),
  defaultEntityId = '',
  defaultPageSize = 10,
  dependencies = [],
  enableAutoLoad = true,
  onDataLoaded,
  onEntityChange,
  resetPageOnEntityChange = true,
  preserveFiltersOnEntityChange = true,
}: UseEntityTableDataOptions<T, E>) {
  const [availableEntities, setAvailableEntities] = useState<E[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>(defaultEntityId);
  const [selectedEntityName, setSelectedEntityName] = useState<string>('');
  const [isLoadingEntities, setIsLoadingEntities] = useState(true);
  const [entitiesError, setEntitiesError] = useState<Error | null>(null);

  // Ref для предотвращения повторных вызовов
  const isInitialLoadRef = useRef(true);

  // Загрузка списка сущностей
  const loadEntities = useCallback(async () => {
    setIsLoadingEntities(true);
    setEntitiesError(null);

    try {
      const entities = await fetchEntities();
      setAvailableEntities(entities);

      if (entities.length > 0) {
        let newEntityId = selectedEntityId;
        let newEntityName = selectedEntityName;

        if (!newEntityId || !entities.find(entity => getEntityId(entity) === newEntityId)) {
          const firstEntity = entities[0];
          newEntityId = getEntityId(firstEntity);
          newEntityName = getEntityName(firstEntity);
        } else {
          const selectedEntity = entities.find(entity => getEntityId(entity) === newEntityId);
          if (selectedEntity) {
            newEntityName = getEntityName(selectedEntity);
          }
        }

        // Устанавливаем только если изменились
        if (newEntityId !== selectedEntityId) {
          setSelectedEntityId(newEntityId);
          setSelectedEntityName(newEntityName);
        }
      }
    } catch (err) {
      setEntitiesError(err as Error);
      console.error('Ошибка загрузки сущностей:', err);
    } finally {
      setIsLoadingEntities(false);
    }
  }, [fetchEntities, getEntityId, getEntityName]);

  // Инициализация сущностей
  useEffect(() => {
    if (isInitialLoadRef.current) {
      loadEntities();
      isInitialLoadRef.current = false;
    }
  }, [loadEntities]);

  // Создаем адаптер для fetchData
  const createFetchDataAdapter = useCallback(
    (entityId: string) => {
      return async (params?: TableParams) => {
        if (!entityId) {
          return {
            data: [] as T[],
            meta: {
              pagination: { page: 1, size: defaultPageSize, totalElements: 0, totalPages: 0 },
              filters: {},
              sort: null,
            },
          };
        }
        return await fetchData(
          params || {
            pagination: { page: 1, size: defaultPageSize },
            sort: null,
            filters: {},
          },
          entityId,
        );
      };
    },
    [fetchData, defaultPageSize],
  );

  // Используем базовый хук для таблицы
  const tableData = useTableData<T>({
    resourceCode,
    fetchData: createFetchDataAdapter(selectedEntityId),
    defaultPageSize,
    dependencies: [selectedEntityId, ...dependencies],
    enableAutoLoad: enableAutoLoad && !!selectedEntityId && !isLoadingEntities,
    onDataLoaded,
  });

  // Обработчик смены сущности
  const handleEntityChange = useCallback(
    (entityId: string) => {
      const selectedEntity = availableEntities.find(entity => getEntityId(entity) === entityId);
      if (selectedEntity) {
        const newName = getEntityName(selectedEntity);
        setSelectedEntityId(entityId);
        setSelectedEntityName(newName);

        if (resetPageOnEntityChange) {
          tableData.setCurrentPage(1);
        }

        if (!preserveFiltersOnEntityChange) {
          tableData.setFilters({});
        }

        if (onEntityChange) {
          onEntityChange(entityId, newName);
        }

        // Обновляем данные таблицы
        tableData.loadServerData();
      }
    },
    [
      availableEntities,
      getEntityId,
      getEntityName,
      resetPageOnEntityChange,
      preserveFiltersOnEntityChange,
      tableData,
      onEntityChange,
    ],
  );

  return {
    // Состояния сущности
    availableEntities,
    selectedEntityId,
    selectedEntityName,
    isLoadingEntities,
    entitiesError,

    // Методы работы с сущностью
    loadEntities,
    handleEntityChange,

    // Данные таблицы (из useTableData)
    ...tableData,

    // Дополнительные методы
    refreshData: tableData.loadServerData,
  };
}
