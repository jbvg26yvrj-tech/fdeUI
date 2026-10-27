import { apiClient } from '../../shared/api/apiClient';
export type LokiConnection = {
  id?: string;
  name: string;
  description: string;
  enabled: boolean;
  baseUrl: string;
  authType: 'NONE' | 'BASIC' | 'BEARER';
  username: string;
  tenantId: string;
  labels: Record<string, string>;
  sessionField: string;
  pipelineField: string;
  levelField: string;
  correlationMode: 'JSON' | 'METADATA';
  datacenter: string;
  timeoutSeconds: number;
  limit: number;
  maxHours: number;
  secretConfigured?: boolean;
  secret?: string;
  clearSecret?: boolean;
};
export type SafeConnection = {
  id: string;
  name: string;
  datacenter: string;
  sessionField: string;
  maxHours: number;
  limit: number;
};
export type LogsResponse = {
  entries: { timestamp: string; line: string; labels: Record<string, string> }[];
  truncated: boolean;
  message: string | null;
};
export function safeDraft(connection: LokiConnection): LokiConnection {
  const { secret: _secret, clearSecret: _clear, ...safe } = connection;
  return { ...safe, secret: '', clearSecret: false };
}
export function connectionPayload(connection: LokiConnection): LokiConnection {
  const { secretConfigured: _configured, secret, ...rest } = connection;
  return { ...rest, ...(secret ? { secret } : {}) };
}
export const lokiApi = {
  list: () => apiClient.get<LokiConnection[]>('/settings/loki'),
  save: (draft: LokiConnection) =>
    draft.id
      ? apiClient.put<LokiConnection>(
          `/settings/loki/${encodeURIComponent(draft.id)}`,
          connectionPayload(draft),
        )
      : apiClient.post<LokiConnection>('/settings/loki', connectionPayload(draft)),
  test: (draft: LokiConnection) =>
    apiClient.post<{ success: boolean; message: string; checkedAt?: string }>(
      '/settings/loki/test',
      connectionPayload(draft),
    ),
  connections: () => apiClient.get<SafeConnection[]>('/logs/connections'),
  query: (params: URLSearchParams) => apiClient.get<LogsResponse>(`/logs?${params}`),
};
export function logWindow(start: string | null, hours: number, now = new Date()) {
  const parsed = start ? Date.parse(start) : NaN;
  const from = Number.isFinite(parsed)
    ? Math.min(parsed - 300000, now.getTime() - 1000)
    : now.getTime() - Math.min(hours, 1) * 3600000;
  return {
    from: new Date(from).toISOString(),
    to: new Date(Math.min(now.getTime(), from + hours * 3600000)).toISOString(),
  };
}
export function safeLogQuery(values: URLSearchParams): URLSearchParams {
  const query = new URLSearchParams();
  for (const key of [
    'connectionId',
    'sessionId',
    'pipelineId',
    'from',
    'to',
    'level',
    'text',
    'limit',
  ]) {
    const value = values.get(key);
    if (value) query.set(key, value);
  }
  return query;
}

export function connectionWindow(
  from: string | undefined,
  to: string | undefined,
  hours: number,
  start: string | null,
) {
  const first = from ? Date.parse(from) : NaN,
    last = to ? Date.parse(to) : NaN;
  if (Number.isFinite(first) && Number.isFinite(last) && last > first)
    return { from: from!, to: new Date(Math.min(last, first + hours * 3600000)).toISOString() };
  return logWindow(start, hours);
}
