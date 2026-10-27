import React from 'react';

import type { UserDto } from '../../../features/auth/types/types';
import { EntityCard, type CardAction, type CardField } from '../../../shared/components/EntityCard';

interface RoleUserCardProps {
  user: UserDto;
  onDelete: (userId: string, userLogin: string) => void;
}

export const RoleUserCard: React.FC<RoleUserCardProps> = ({ user, onDelete }) => {
  const fields: CardField[] = [
    {
      key: 'login',
      label: 'Логин',
      render: (value: string) => <span title={value}>{value}</span>,
    },
  ];

  const actions: CardAction[] = [
    {
      action: 'delete',
      label: 'Удалить',
      onClick: (item: UserDto) => onDelete(item.id, item.login),
    },
  ];

  return <EntityCard item={user} fields={fields} actions={actions} titleKey='login' />;
};
