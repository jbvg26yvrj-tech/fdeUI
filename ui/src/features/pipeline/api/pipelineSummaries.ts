import { useEffect, useState } from 'react';
import { apiClient } from '../../../shared/api/apiClient';
export type PipelineSummary = {
  id: string; consecutiveFailures: number | null;
  today: {sentFiles: number; sentBytes: number; receivedFiles: number; receivedBytes: number; unknownSizeFiles: number};
  agreedVolumeBytes: number | null; agreedVolumePeriod: 'RUN' | 'DAY' | 'MONTH' | null;
  periodSentBytes: number; periodUnknownSizeFiles: number; sourceTimeZone: string;
};
export async function loadPipelineSummaries(ids: string[], signal: AbortSignal) {
  const unique = [...new Set(ids)];
  const result: Record<string, PipelineSummary> = {};
  for (let offset = 0; offset < unique.length; offset += 100) {
    if (signal.aborted) break;
    const query = new URLSearchParams({ids: unique.slice(offset, offset + 100).join(',')});
    const rows = await apiClient.get<PipelineSummary[]>(`/analytics/pipeline-summaries?${query}`, signal);
    for (const row of rows) result[row.id] = row;
  }
  return result;
}
export function usePipelineSummaries(ids: string[], revision: number) {
  const key = ids.join(',');
  const [state, setState] = useState<{key: string; revision: number; data: Record<string, PipelineSummary>; loading: boolean; error: boolean; updatedAt: number | null}>({key: '', revision: -1, data: {}, loading: false, error: false, updatedAt: null});
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    setState({key, revision, data: {}, loading: !!key, error: false, updatedAt: null});
    const refresh = async () => {
      if (!key || running || controller.signal.aborted) return;
      running = true;
      try {
        const data = await loadPipelineSummaries(key.split(','), controller.signal);
        if (!controller.signal.aborted) setState({key, revision, data, loading: false, error: false, updatedAt: Date.now()});
      } catch {
        if (!controller.signal.aborted) setState(previous => ({...previous, loading: false, error: true}));
      } finally { running = false; }
    };
    void refresh();
    const visibleRefresh = () => { if (document.visibilityState !== 'hidden') void refresh(); };
    const timer = window.setInterval(visibleRefresh, 60000);
    document.addEventListener('visibilitychange', visibleRefresh);
    return () => { controller.abort(); window.clearInterval(timer); document.removeEventListener('visibilitychange', visibleRefresh); };
  }, [key, revision]);
  return state.key === key && state.revision === revision ? state : {data: {}, loading: !!key, error: false, updatedAt: null};
}
