import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'tableDisplayModes';

type DisplayModes = Record<string, 'table' | 'cards'>;

export function useViewMode(tableId: string, defaultValue: 'table' | 'cards' = 'table') {
  const [mode, setMode] = useState<'table' | 'cards'>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const modes: DisplayModes = JSON.parse(stored);
        if (modes[tableId] === 'cards' || modes[tableId] === 'table') {
          return modes[tableId];
        }
      }
    } catch (e) {
      console.error('Failed to parse display modes', e);
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const modes: DisplayModes = stored ? JSON.parse(stored) : {};
      modes[tableId] = mode;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(modes));
    } catch (e) {
      console.error('Failed to save display mode', e);
    }
  }, [tableId, mode]);

  const setModeWrapped = useCallback((newMode: 'table' | 'cards') => {
    setMode(newMode);
  }, []);

  return { displayMode: mode, setDisplayMode: setModeWrapped };
}
