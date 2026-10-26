import React from 'react';
import { EntityCard, type CardField, type CardAction } from '../../../shared/components/EntityCard';
import type { RoleRlsDto } from '../types/types';

interface RoleRlsCardProps {
  rls: RoleRlsDto;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const RoleRlsCard: React.FC<RoleRlsCardProps> = ({ rls, onEdit, onDelete }) => {
  // Функция для форматирования фильтра (обрезание длинных строк/объектов)
  const formatFilter = (filter: unknown): string => {
    if (filter === null || filter === undefined) {
      return '';
    }
    if (typeof filter === 'object') {
      try {
        const json = JSON.stringify(filter);
        return json.length > 50 ? json.substring(0, 50) + '…' : json;
      } catch {
        return String(filter);
      }
    }
    return String(filter);
  };

  const fields: CardField[] = [
    { key: 'resourceCode', label: 'Код ресурса' },
    {
      key: 'filter',
      label: 'Условие',
      render: (value: unknown) => (
        <span
          className='font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded'
          title={formatFilter(value)}
        >
          {formatFilter(value)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Создано',
      render: (value: string | null | undefined) => (
        <span>{value ? new Date(value).toLocaleDateString('ru-RU') : '-'}</span>
      ),
    },
  ];

  const actions: CardAction[] = [
    {
      action: 'edit',
      label: 'Редактировать',
      onClick: (item: RoleRlsDto) => onEdit(item.resourceId),
    },
    {
      action: 'delete',
      label: 'Удалить',
      onClick: (item: RoleRlsDto) => onDelete(item.resourceId),
    },
  ];

  return <EntityCard item={rls} fields={fields} actions={actions} titleKey='resourceCode' />;
};
