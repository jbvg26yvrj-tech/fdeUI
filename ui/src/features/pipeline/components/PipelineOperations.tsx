import { Link } from 'react-router-dom';
import { bytes, wallTime } from '../../analytics/api';
import type { PipelineSummary } from '../api/pipelineSummaries';
export function pipelineHistoryLink(id: string, failed = false) {
  return '/sessions?' + new URLSearchParams({pipelineId: id, ...(failed ? {status: 'FAILED'} : {}), history: 'all'});
}
export function dailyAnalyticsLink(summary: PipelineSummary, todayOnly = false) {
  const now = wallTime(new Date(), summary.sourceTimeZone);
  const firstDay = new Date(Date.parse(now.slice(0, 10) + 'T00:00:00Z') - (todayOnly ? 0 : 6) * 86400000).toISOString().slice(0, 10);
  return `/analytics/pipelines/${encodeURIComponent(summary.id)}?` + new URLSearchParams({pipelineId: summary.id, from: firstDay + 'T00:00:00', to: now, bucket: 'day'});
}
export function PipelineOperations({pipelineId, summary, loading, canSessions, returnTo, onNavigate}: {
  pipelineId: string; summary?: PipelineSummary; loading?: boolean; canSessions: boolean; returnTo?: string; onNavigate?: () => void;
}) {
  const count = summary?.consecutiveFailures;
  const warning = count != null && count >= 2;
  const label = count == null ? 'Нет завершённых сессий' : count === 0 ? 'Без серии ошибок' : `${count} ${count === 1 ? 'ошибка' : count < 5 ? 'ошибки' : 'ошибок'} подряд`;
  const tone = count != null && count >= 3 ? 'text-red-700 dark:text-red-300' : warning ? 'text-orange-700 dark:text-orange-300' : 'text-gray-600 dark:text-gray-300';
  const agreement = summary?.agreedVolumeBytes;
  const overAgreement = !!agreement && !!summary && summary.periodSentBytes > agreement;
  const periods = {RUN: 'за последний запуск', DAY: 'за сегодня', MONTH: 'за месяц'};
  return <span className='relative z-10 inline-flex w-full min-w-0 flex-col gap-2 text-sm whitespace-normal' onClick={e => e.stopPropagation()}>
    {canSessions && <Link className='text-blue-700 dark:text-blue-300 underline' to={pipelineHistoryLink(pipelineId)} state={{returnTo}} onClick={onNavigate}>Сессии →</Link>}
    {!summary ? <span>{loading ? 'Загрузка статистики…' : 'Статистика недоступна'}</span> : <>
      {canSessions && warning ? <Link className={`${tone} font-semibold rounded-md bg-orange-50 dark:bg-orange-950/30 px-2 py-1`} to={pipelineHistoryLink(pipelineId, true)} state={{returnTo}} onClick={onNavigate}>{label}</Link> : <span className={tone}>{label}</span>}
      <Link className='text-blue-700 dark:text-blue-300 underline' to={dailyAnalyticsLink(summary, true)} state={{returnTo}} onClick={onNavigate}>Сегодня: отправлено {summary.today.sentFiles} файлов · {bytes(summary.today.sentBytes)}; получено {summary.today.receivedFiles} · {bytes(summary.today.receivedBytes)}</Link>
      <Link className='text-blue-700 dark:text-blue-300 underline' to={dailyAnalyticsLink(summary)} state={{returnTo}} onClick={onNavigate}>По дням →</Link>
      <span className='text-xs text-gray-500'>Зона: {summary.sourceTimeZone}</span>
      {!!agreement && <progress className='w-full h-2 accent-teal-600' aria-label='Использование согласованного объёма' max={agreement} value={Math.min(summary.periodSentBytes, agreement)} />}
      {!!agreement && summary.agreedVolumePeriod && <span className={overAgreement ? 'font-medium text-red-700 dark:text-red-300' : undefined}>{overAgreement ? 'Превышение согласованного объёма. ' : ''}Объём {periods[summary.agreedVolumePeriod]}: {bytes(summary.periodSentBytes)} / {bytes(agreement)} · {(summary.periodSentBytes / agreement * 100).toFixed(0)}%{summary.periodUnknownSizeFiles > 0 ? ' (неполные данные)' : ''}</span>}
      {(summary.today.unknownSizeFiles > 0 || summary.periodUnknownSizeFiles > 0) && <span>Размер части файлов неизвестен: сегодня {summary.today.unknownSizeFiles}, за период {summary.periodUnknownSizeFiles}.</span>}
    </>}
  </span>;
}
