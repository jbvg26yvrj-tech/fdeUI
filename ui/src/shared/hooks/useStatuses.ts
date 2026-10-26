import { useState, useEffect, useCallback } from 'react';

interface StatusOption {
  value: string;
  label: string;
}

interface UseStatusesOptions<T> {
  fetchStatuses: () => Promise<T[]>;
  mapToOptions: (statuses: T[]) => StatusOption[];
  mapToMap: (statuses: T[]) => Record<string, T>;
}

export function useStatuses<T>({ fetchStatuses, mapToOptions, mapToMap }: UseStatusesOptions<T>) {
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [statusesMap, setStatusesMap] = useState<Record<string, T>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatuses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchStatuses();
      setStatusOptions(mapToOptions(data));
      setStatusesMap(mapToMap(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки статусов');
    } finally {
      setIsLoading(false);
    }
  }, [fetchStatuses, mapToOptions, mapToMap]);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  return {
    statusOptions,
    statusesMap,
    isLoading,
    error,
    reload: loadStatuses,
  };
}
