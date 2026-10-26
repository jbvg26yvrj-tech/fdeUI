import React from 'react';
import { EntityCard, type CardField, type CardAction } from '../../../shared/components/EntityCard';
import type { RoleDto } from '../types/types';

interface RoleCardProps {
  role: RoleDto;
  onEdit: (id: string) => void;
  onDelete: (role: RoleDto) => void;
}

export const RoleCard: React.FC<RoleCardProps> = ({ role, onEdit, onDelete }) => {
  const fields: CardField[] = [
    { key: 'code', label: 'Код' },
    {
      key: 'description',
      label: 'Описание',
      render: (value: string | null | undefined) => (
        <span title={value || '-'}>{value || '-'}</span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Создана',
      render: (value: string | null | undefined) => (
        <span>{value ? new Date(value).toLocaleDateString('ru-RU') : '-'}</span>
      ),
    },
  ];

  const actions: CardAction[] = [
    {
      action: 'edit',
      label: 'Редактировать',
      onClick: (item: RoleDto) => onEdit(item.id),
    },
    {
      action: 'delete',
      label: 'Удалить',
      onClick: (item: RoleDto) => onDelete(item),
    },
  ];

  return <EntityCard item={role} fields={fields} actions={actions} titleKey='name' />;
};
