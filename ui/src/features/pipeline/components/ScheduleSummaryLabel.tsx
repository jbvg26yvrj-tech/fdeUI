import { describeScheduleCron } from '../../../shared/ui/table/lib/cron';
import type { ScheduleSummary } from '../api/scheduleSummaries';

export function ScheduleSummaryLabel({ summary }: { summary?: ScheduleSummary }) {
  const label = !summary ? 'Загрузка…' : summary.status === 'ready' ? summary.cron : summary.status === 'absent' ? 'Не задано' : 'Не удалось загрузить';
  return <span className='text-xs' title={label}>{label}{summary?.status === 'ready' && <span className='block text-gray-500'>{describeScheduleCron(summary.cron)}</span>}</span>;
}
