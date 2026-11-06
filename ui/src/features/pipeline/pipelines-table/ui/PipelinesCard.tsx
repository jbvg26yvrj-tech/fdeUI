import React from 'react';
import { PipelineOperations } from '../../components/PipelineOperations';
import type { PipelineSummary } from '../../api/pipelineSummaries';
import type { ScheduleSummary } from '../../api/scheduleSummaries';
import { ScheduleSummaryLabel } from '../../components/ScheduleSummaryLabel';

import type { SimplePipelineData } from '../../types/Types';
import {
  EntityCard,
  type CardAction,
  type CardField,
} from '../../../../shared/components/EntityCard';

interface PipelineCardProps {
  onNavigate?: () => void;
  returnTo?: string;
  pipeline: SimplePipelineData;
  scheduleSummary?: ScheduleSummary;
  monitoringSummary?: PipelineSummary;
  monitoringLoading?: boolean;
  onSchedule?: (pipeline: SimplePipelineData) => void;
  permissions: {
    canPipelineDetails: boolean;
    canPipelineSessions: boolean;
    canPipelineSchedule: boolean;
    canPipelineUnschedule: boolean;
    canPipelineUpdate?: boolean;
    canPipelineDelete?: boolean;
    canTriggerManual?: boolean;
  };
  onViewDetails: (pipeline: SimplePipelineData) => void;
  onViewSessions: (pipeline: SimplePipelineData) => void;
  onEdit?: (pipeline: SimplePipelineData) => void;
  onDelete?: (pipeline: SimplePipelineData) => void;
  onTrigger?: (pipeline: SimplePipelineData) => void;
}

export const PipelineCard: React.FC<PipelineCardProps> = ({
  pipeline,
  onNavigate,
  returnTo,
  scheduleSummary,
  monitoringSummary, monitoringLoading, onSchedule,
  permissions,
  onViewDetails,
  onViewSessions,
  onEdit,
  onDelete,
  onTrigger,
}) => {
  const fields: CardField[] = [
    { key: 'route', label: 'Маршрут', render: () => <span>{pipeline.clientFrom} → {pipeline.clientTo}</span> },
    { key: 'primaryDatacenter', label: 'ЦОД' },
    {
      key: 'schedule' as keyof SimplePipelineData,
      label: 'Расписание',
      render: () => <span className='relative z-10 inline-flex flex-col gap-1'><ScheduleSummaryLabel summary={scheduleSummary} />{onSchedule && <button type='button' className='text-blue-700 dark:text-blue-300 underline text-left' aria-label={`Расписание: ${pipeline.pipelineName}`} onClick={e => { e.stopPropagation(); onSchedule(pipeline); }}>Календарь</button>}</span>,
    },
    { key: 'operations', label: 'Передача', render: () => <PipelineOperations pipelineId={pipeline.id} summary={monitoringSummary} loading={monitoringLoading} canSessions={permissions.canPipelineSessions} returnTo={returnTo} onNavigate={onNavigate} /> },
    { key: 'id', label: 'ID', render: () => <details className='relative z-10 text-xs break-all'><summary className='cursor-pointer'>{pipeline.id.slice(0,8)}…</summary>{pipeline.id}</details> },
  ];

  const actions: CardAction[] = [
    {
      action: 'view',
      label: 'Просмотр',
      onClick: () => onViewDetails(pipeline),
      disabled: !permissions.canPipelineDetails,
    },
    {
      action: 'sessions',
      label: 'Сессии',
      onClick: () => onViewSessions(pipeline),
      disabled: !permissions.canPipelineSessions,
    },
    {
      action: 'edit',
      label: 'Редактировать',
      onClick: () => onEdit?.(pipeline),
      disabled: !permissions.canPipelineUpdate,
      show: !!onEdit,
    },
    {
      action: 'delete',
      label: 'Удалить',
      onClick: () => onDelete?.(pipeline),
      disabled: !permissions.canPipelineDelete,
      show: !!onDelete,
    },
    {
      action: 'run',
      label: 'Запустить',
      onClick: () => onTrigger?.(pipeline),
      disabled: !permissions.canTriggerManual,
      show: !!onTrigger,
    },
  ];

  return <EntityCard href={permissions?.canPipelineDetails ? `/pipelines/${pipeline.id}` : undefined} linkState={{ returnTo }} onNavigate={onNavigate} item={pipeline} fields={fields} actions={actions} titleKey='pipelineName' />;
};
