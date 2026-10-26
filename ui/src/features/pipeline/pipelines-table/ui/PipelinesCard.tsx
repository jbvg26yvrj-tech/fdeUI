import React from 'react';

import type { SimplePipelineData } from '../../types/Types';
import {
  EntityCard,
  type CardAction,
  type CardField,
} from '../../../../shared/components/EntityCard';

interface PipelineCardProps {
  pipeline: SimplePipelineData;
  scheduleCron?: string | null;
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
  scheduleCron,
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
      render: () =>
        scheduleCron ? (
          <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'>
            {scheduleCron}
          </span>
        ) : (
          <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'>
            Не задано
          </span>
        ),
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
