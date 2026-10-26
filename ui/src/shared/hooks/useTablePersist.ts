import { useState, useEffect, useCallback, useRef } from 'react';
import { settingsApi, type TableState as SettingsTableState } from '../api/settingsApi';
import { userContextApi } from '../api/userContextApi';
import { debounceWithCleanup } from '../utils/debounce';
import type { TableParams } from '../ui/table/types/type';
import type { TableResourceCode } from '../resources';

export interface TableState {
  sortBy: string | null;
  sortOrder: 'asc' | 'desc';
  filters: Record<string, any>;
  pageSize?: number;
  columnWidths?: Record<string, number>;
}

interface UseTablePersistProps {
  resourceCode: TableResourceCode;
  waitForContext?: boolean;
}

interface UseTablePersistReturn {
  savedState: TableState | null;
  isLoading: boolean;
  saveState: (params: TableParams) => void;
  clearState: () => Promise<void>;
  hasSavedState: boolean;
}

export function useTablePersist({
  resourceCode,
  waitForContext = false,
}: UseTablePersistProps): UseTablePersistReturn {
  const [savedState, setSavedState] = useState<TableState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const saveDebounceRef = useRef<ReturnType<typeof debounceWithCleanup> | null>(null);
  const contextCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Единая функция загрузки состояния с приоритетами
  const loadSavedState = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log(`[TablePersist] Загрузка состояния для ${resourceCode}...`);

      // 1. Сначала проверяем sessionStorage (самые актуальные)
      const storageSettings = userContextApi.getTableSettingsFromStorage(resourceCode);
      if (storageSettings) {
        console.log(`[TablePersist] Найдено в sessionStorage`, storageSettings);
        const validatedState: TableState = {
          sortBy: storageSettings.sortBy || null,
          sortOrder: storageSettings.sortOrder || 'asc',
          filters: storageSettings.filters || {},
          pageSize: storageSettings.pageSize || 10,
          columnWidths: storageSettings.columnWidths || {},
        };
        setSavedState(validatedState);
        setIsLoading(false);
        return;
      }

      // 2. Если в sessionStorage нет, ждем загрузки контекста если нужно
      if (waitForContext) {
        // Проверяем, загружен ли уже контекст
        const cachedContext = userContextApi.getCachedContext();
        if (!cachedContext) {
          console.log(`[TablePersist] Контекст не загружен, ждем...`);

          // Пробуем несколько раз получить контекст
          let attempts = 0;
          const maxAttempts = 10; // 5 секунд максимум

          const checkContext = () => {
            attempts++;
            const context = userContextApi.getCachedContext();

            if (context || attempts >= maxAttempts) {
              if (contextCheckIntervalRef.current) {
                clearInterval(contextCheckIntervalRef.current);
                contextCheckIntervalRef.current = null;
              }
              continueLoading();
            }
          };

          contextCheckIntervalRef.current = setInterval(checkContext, 500);
          return;
        }
      }

      continueLoading();
    } catch (error) {
      console.error(`[TablePersist] Ошибка загрузки состояния:`, error);
      setSavedState(null);
      setIsLoading(false);
    }

    function continueLoading() {
      try {
        // 3. Загружаем из контекста
        const contextSetting = userContextApi.getTableSettingByResourceCode(resourceCode);

        if (contextSetting) {
          console.log(`[TablePersist] Найдено в контексте`, contextSetting);
          const validatedState: TableState = {
            sortBy: contextSetting.sortBy || null,
            sortOrder: contextSetting.sortOrder || 'asc',
            filters: contextSetting.filters || {},
            pageSize: contextSetting.pageSize || 10,
            columnWidths: contextSetting.columnWidths || {},
          };
          setSavedState(validatedState);
        } else {
          console.log(`[TablePersist] Состояние не найдено`);
          setSavedState(null);
        }
      } catch (error) {
        console.error(`[TablePersist] Ошибка продолжения загрузки:`, error);
        setSavedState(null);
      } finally {
        setIsLoading(false);
      }
    }
  }, [resourceCode, waitForContext]);

  // Функция сохранения состояния при изменении UI
  const saveState = useCallback(
    (params: TableParams) => {
      if (!params) return;

      const stateToSave: SettingsTableState = {
        sortBy: params.sort?.field || null,
        sortOrder: params.sort?.order || 'asc',
        filters: params.filters || {},
        pageSize: params.pagination?.size || 10,
      };

      console.log(`[TablePersist] Сохранение состояния для ${resourceCode}:`, stateToSave);

      // 1. Немедленно сохраняем в sessionStorage и userContext
      userContextApi.updateTableSettingsImmediately(resourceCode, stateToSave);
      settingsApi.saveTableSetting(resourceCode, stateToSave);

      // 2. Обновляем локальное состояние для UI
      setSavedState({
        sortBy: params.sort?.field || null,
        sortOrder: params.sort?.order || 'asc',
        filters: params.filters || {},
        pageSize: params.pagination?.size,
      });
    },
    [resourceCode],
  );

  // Очистка состояния
  const clearState = useCallback(async () => {
    try {
      // Очищаем из БД
      await settingsApi.deleteSettingByResourceCode(resourceCode);

      // Очищаем локальное состояние
      setSavedState(null);

      // Обновляем контекст
      userContextApi.refreshContext().catch(console.error);

      console.log(`[TablePersist] Состояние очищено для ${resourceCode}`);
    } catch (error) {
      console.error(`[TablePersist] Ошибка очистки состояния:`, error);
    }
  }, [resourceCode]);

  // Загрузка при монтировании
  useEffect(() => {
    loadSavedState();

    // Очистка при размонтировании
    return () => {
      if (saveDebounceRef.current) {
        saveDebounceRef.current.cancel();
      }
    };
  }, [loadSavedState]);

  return {
    savedState,
    isLoading,
    saveState,
    clearState,
    hasSavedState:
      !!savedState &&
      (Object.keys(savedState.filters || {}).length > 0 || savedState.sortBy !== null),
  };
}
