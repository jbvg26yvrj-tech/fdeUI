import React from 'react';
import type { ResourceDto } from '../../../features/permissions/types/types';
import { EntityCard, type CardAction, type CardField } from '../../../shared/components/EntityCard';

interface RoleResourceCardProps {
  resource: ResourceDto;
  onDelete: (resourceId: string, resourceCode: string) => void;
}

const typeLabels: Record<string, string> = {
  PAGE: 'Страница',
  BUTTON: 'Кнопка',
  API: 'API',
  TABLE: 'Таблица',
  MENU: 'Меню',
  GLOBAL: 'Глобальный',
};

export const RoleResourceCard: React.FC<RoleResourceCardProps> = ({ resource, onDelete }) => {
  const fields: CardField[] = [
    { key: 'resourceCode', label: 'Код' },
    {
      key: 'resourceType',
      label: 'Тип',
      render: (value: string | null | undefined) => (
        <span>{value ? typeLabels[value] || value : '-'}</span>
      ),
    },
  ];

  const actions: CardAction[] = [
    {
      action: 'delete',
      label: 'Удалить',
      onClick: (item: ResourceDto) => onDelete(item.id, item.code || ''),
    },
  ];

  return <EntityCard item={resource} fields={fields} actions={actions} titleKey='name' />;
};
