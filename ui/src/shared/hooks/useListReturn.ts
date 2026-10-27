import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { listStateKey, readListState, writeListState } from './listReturnState';

export function useListReturn(resource: string, loading: boolean) {
  const location = useLocation();
  const key = listStateKey(resource, location.search);
  const restored = useRef<string | null>(null);
  const remember = useCallback((id: string) => {
    writeListState(key, { lastId: id, scrollY: window.scrollY,
      mainScrollTop: document.querySelector('main')?.scrollTop || 0 });
  }, [key]);
  useEffect(() => {
    if (loading || !key || restored.current === key) return;
    const state = readListState(key);
    const frame = requestAnimationFrame(() => {
      if (state.scrollY !== undefined) window.scrollTo(0, state.scrollY);
      const main = document.querySelector('main');
      if (main && state.mainScrollTop !== undefined) main.scrollTop = state.mainScrollTop;
      restored.current = key;
    });
    return () => cancelAnimationFrame(frame);
  }, [loading, key]);
  return { remember, lastId: readListState(key).lastId,
    returnTo: location.pathname + location.search };
}
