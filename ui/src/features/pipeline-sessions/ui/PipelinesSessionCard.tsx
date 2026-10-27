import React from 'react';

import type { PipelineSessionPageDto } from '../types/types';
import { TERMINAL_STATUSES } from '../types/types';
import { EntityCard, type CardAction, type CardField } from '../../../shared/components/EntityCard';

interface SessionCardProps {
  onNavigate?: () => void;
  returnTo?: string;
  session: PipelineSessionPageDto;
  permissions: {
    canSessionProgressOpen: boolean;
    canTriggerStop?: boolean;
  };
  onViewProgress: (session: PipelineSessionPageDto) => void;
  onStop?: (session: PipelineSessionPageDto) => void;
  statusDisplayName: string;
}

const getStatusColor = (statusCode: string): string => {
  const statusColorMap: Record<string, string> = {
    PREPARE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
    ACTIVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
    SUCCESS: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
    FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
    ABORTED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  };
  return (
    statusColorMap[statusCode] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  );
};

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onNavigate,
  returnTo,
  permissions,
  onViewProgress,
  onStop,
  statusDisplayName,
}) => {
  const fields: CardField[] = [
    {
      key: 'id',
      label: 'ID сессии',
      render: (value: string) => (
        <span className='font-mono truncate' title={value}>
          {value}
        </span>
      ),
    },
    { key: 'pipelineId', label: 'ID пайплайна' },
    {
      key: 'status',
      label: 'Статус',
      render: () => {
        const statusClass = getStatusColor(session.status);
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
            {statusDisplayName}
          </span>
        );
      },
    },
    {
      key: 'startDt',
      label: 'Начало',
      render: (value: string | null | undefined) => (
        <span>{value ? new Date(value).toLocaleString('ru-RU') : '-'}</span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Создана',
      render: (value: string | null | undefined) => (
        <span>{value ? new Date(value).toLocaleString('ru-RU') : '-'}</span>
      ),
    },
  ];

  const actions: CardAction[] = [];
  if (permissions?.canSessionProgressOpen) {
    actions.push({
      label: 'Подробности',
      onClick: () => onViewProgress(session),
    });
  }
  const isTerminal = TERMINAL_STATUSES.includes(session.status);
  if (!isTerminal && onStop) {
    actions.push({
      label: 'Остановить',
      onClick: () => onStop(session),
      disabled: !permissions?.canTriggerStop,
      className:
        'text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300',
    });
  }

  return <EntityCard href={permissions?.canSessionProgressOpen ? `/sessions/${session.id}` : undefined} linkState={{ returnTo }} onNavigate={onNavigate} item={session} fields={fields} actions={actions} titleKey='pipelineName' />;
};
