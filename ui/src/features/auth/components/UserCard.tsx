import React from 'react';

import type { UserDto } from '../types/types';
import { EntityCard, type CardAction, type CardField } from '../../../shared/components/EntityCard';

interface UserCardProps {
  user: UserDto;
  onView: (user: UserDto) => void;
  onEdit: (user: UserDto) => void;
  onDelete: (user: UserDto) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onView, onEdit, onDelete }) => {
  const fields: CardField[] = [
    { key: 'login', label: 'Логин' },
    {
      key: 'activated',
      label: 'Активен',
      render: (value: boolean) => (
        <span
          className={
            value ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }
        >
          {value ? '🟢 Да' : '🔴 Нет'}
        </span>
      ),
    },
    {
      key: 'passwordChangeRequired',
      label: 'Пароль',
      render: (value: boolean) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            value
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
              : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
          }`}
        >
          {value ? 'Необходимо изменить пароль' : 'Пароль актуален'}
        </span>
      ),
    },
  ];

  const actions: CardAction[] = [
    {
      action: 'view',
      label: 'Просмотр',
      onClick: () => onView(user),
    },
    {
      action: 'edit',
      label: 'Редактировать',
      onClick: () => onEdit(user),
    },
    {
      action: 'delete',
      label: 'Удалить',
      onClick: () => onDelete(user),
    },
  ];

  return <EntityCard item={user} fields={fields} actions={actions} titleKey='login' />;
};
