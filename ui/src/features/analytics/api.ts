import { apiClient } from '../../shared/api/apiClient';
export type Totals = {
  sessions: number;
  success: number;
  failed: number;
  aborted: number;
  active: number;
  prepare: number;
  unknown: number;
  errorRate: number | null;
  receivedFiles: number;
  receivedBytes: number;
  sentFiles: number;
  sentBytes: number;
  skippedFiles: number;
  failedFiles: number;
  unknownSizeFiles: number;
};
export type Overview = {
  summary: Totals;
  series: ({ time: string } & Totals)[];
  generatedAt: string;
  sourceTimeZone: string;
  bucket: string;
  lastStart: string | null;
  lastSuccess: string | null;
  warnings: string[];
  extra?: {
    consecutiveFailures: number | null;
    successfulEmptySessions: number;
    commonErrors: { message: string; count: number }[];
  };
};
export type AnalyticsSession = {
  id: string;
  pipelineId: string;
  pipelineName: string;
  startDt: string;
  status: string;
  errorMessage: string | null;
  receivedFiles: number;
  receivedBytes: number;
  sentFiles: number;
  sentBytes: number;
  failedFiles: number;
  unknownSizeFiles: number;
};
export type SessionPage = {
  content: AnalyticsSession[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
export const analyticsApi = {
  overview: (query: string, pipeline?: string) =>
    apiClient.get<Overview>(
      `/analytics/${pipeline ? `pipelines/${encodeURIComponent(pipeline)}` : 'overview'}?${query}`,
    ),
  sessions: (query: string) => apiClient.get<SessionPage>(`/analytics/sessions?${query}`),
};
export function wallTime(date: Date, zone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
}
// LocalDateTime has no browser timezone. Resolve only using the source zone declared by API.
export function sourceInstant(local: string, zone: string): Date {
  const target = Date.parse(local.slice(0, 19) + 'Z');
  if (!Number.isFinite(target) || !zone) throw new Error('Не указана временная зона источника.');
  let value = target;
  for (let i = 0; i < 4; i++) value += target - Date.parse(wallTime(new Date(value), zone) + 'Z');
  if (wallTime(new Date(value), zone) !== local.slice(0, 19))
    throw new Error('Время сессии не существует в зоне источника.');
  // Ambiguous DST wall times cannot be linked reliably without an offset from the writer.
  if (
    [-3600000, 3600000].some(
      delta => wallTime(new Date(value + delta), zone) === local.slice(0, 19),
    )
  )
    throw new Error('Неоднозначное время сессии при смене часового пояса.');
  return new Date(value);
}
export function sessionLogsLink(session: AnalyticsSession, zone: string): string {
  const start = sourceInstant(session.startDt, zone).toISOString();
  return (
    '/logs?' +
    new URLSearchParams({
      sessionId: session.id,
      pipelineId: session.pipelineId,
      start,
      sourceTimeZone: zone,
    })
  );
}
export const bytes = (value: number) =>
  value >= 1073741824
    ? `${(value / 1073741824).toFixed(2)} ГиБ`
    : value >= 1048576
      ? `${(value / 1048576).toFixed(2)} МиБ`
      : value >= 1024
        ? `${(value / 1024).toFixed(1)} КиБ`
        : `${value} Б`;
