import React from 'react';

import type { ResourceDto } from '../../../features/permissions/types/types';
import { EntityCard, type CardField } from '../../../shared/components/EntityCard';

interface ResourceCardProps {
  resource: ResourceDto;
}

const typeLabels: Record<string, string> = {
  PAGE: 'Страница',
  BUTTON: 'Кнопка',
  API: 'API',
  TABLE: 'Таблица',
  MENU: 'Меню',
  GLOBAL: 'Глобальный',
};

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource }) => {
  const fields: CardField[] = [
    { key: 'code', label: 'Код' },
    {
      key: 'type',
      label: 'Тип',
      render: (value: string) => <span>{typeLabels[value] || value}</span>,
    },
    {
      key: 'description',
      label: 'Описание',
      render: (value: string | null | undefined) => (
        <span title={value || '-'}>{value || '-'}</span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Создан',
      render: (value: string | null | undefined) => (
        <span>{value ? new Date(value).toLocaleDateString('ru-RU') : '-'}</span>
      ),
    },
  ];

  return (
    <EntityCard
      item={resource}
      fields={fields}
      actions={[]} // действий нет
      titleKey='name'
    />
  );
};
