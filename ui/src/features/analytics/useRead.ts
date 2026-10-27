import { useEffect, useState } from 'react';
// Effect cleanup invalidates an older request even when the transport cannot abort it.
export function useRead<T>(key: string, read: () => Promise<T>) {
  const [state, setState] = useState<{ data?: T; loading: boolean; error: string; key: string }>({
    loading: true,
    error: '',
    key,
  });
  useEffect(() => {
    let current = true;
    setState(old => ({ ...old, loading: true, error: '', key }));
    void read().then(
      data => {
        if (current) setState({ data, loading: false, error: '', key });
      },
      error => {
        if (current)
          setState(old => ({
            ...old,
            loading: false,
            error: error instanceof Error ? error.message : 'Источник недоступен.',
            key,
          }));
      },
    );
    return () => {
      current = false;
    };
    // The key describes every request parameter; read is deliberately recreated by consumers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { ...state, loading: state.key !== key || state.loading };
}
