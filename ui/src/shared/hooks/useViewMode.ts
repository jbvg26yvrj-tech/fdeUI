import { useState, useEffect, useCallback } from 'react';
import { userContextApi } from '../api/userContextApi';

type Mode = 'table' | 'cards';
function readMode(key: string | null, tableId: string, fallback: Mode): Mode {
  try {
    const modes = JSON.parse((key && sessionStorage.getItem(key)) || '{}');
    return modes[tableId] === 'cards' || modes[tableId] === 'table' ? modes[tableId] : fallback;
  } catch { return fallback; }
}

export function useViewMode(tableId: string, defaultValue: Mode = 'table') {
  const userId = userContextApi.getCachedContext()?.user?.id;
  const key = userId ? `tableDisplayModes:${userId}` : null;
  const scope = JSON.stringify([key, tableId]);
  const [state, setState] = useState(() => ({ scope, mode: readMode(key, tableId, defaultValue) }));
  // Hydrate each identity/resource before the persistence effect can write to it.
  const mode = state.scope === scope ? state.mode : readMode(key, tableId, defaultValue);
  if (state.scope !== scope) setState({ scope, mode });
  useEffect(() => {
    if (!key || state.scope !== scope) return;
    try {
      const modes = JSON.parse(sessionStorage.getItem(key) || '{}');
      modes[tableId] = mode;
      sessionStorage.setItem(key, JSON.stringify(modes));
    } catch { /* Storage can be unavailable in a restricted browser. */ }
  }, [key, tableId, mode, state.scope, scope]);
  const setDisplayMode = useCallback((mode: Mode) => setState({ scope, mode }), [scope]);
  return { displayMode: mode, setDisplayMode };
}
