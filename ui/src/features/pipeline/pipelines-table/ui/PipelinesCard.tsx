import React from 'react';
import type { ScheduleSummary } from '../../api/scheduleSummaries';
import { ScheduleSummaryLabel } from '../../components/ScheduleSummaryLabel';

import type { SimplePipelineData } from '../../types/Types';
import {
  EntityCard,
  type CardAction,
  type CardField,
} from '../../../../shared/components/EntityCard';

interface PipelineCardProps {
  pipeline: SimplePipelineData;
  scheduleSummary?: ScheduleSummary;
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
  scheduleSummary,
  permissions,
  onViewDetails,
  onViewSessions,
  onEdit,
  onDelete,
  onTrigger,
}) => {
  const fields: CardField[] = [
    { key: 'id', label: 'ID' },
    { key: 'clientFrom', label: 'От клиента' },
    { key: 'clientTo', label: 'К клиенту' },
    { key: 'primaryDatacenter', label: 'Датацентр' },
    { key: 'allOrNothing', label: 'Всё или ничего' },

    {
      key: 'tasksCount',
      label: 'Задачи',
      render: (value: number) => <span>{value ?? 0}</span>,
    },
    {
      key: 'schedule' as keyof SimplePipelineData,
      label: 'Расписание',
      render: () => <ScheduleSummaryLabel summary={scheduleSummary} />,
    },
    {
      key: 'createdAt',
      label: 'Создан',
      render: (value: string | null | undefined) => (
        <span>{value ? new Date(value).toLocaleString('ru-RU') : '-'}</span>
      ),
    },
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

  return <EntityCard item={pipeline} fields={fields} actions={actions} titleKey='pipelineName' />;
};
