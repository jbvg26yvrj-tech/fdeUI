import React from 'react';

import type { SimpleRoleUsersData } from '../../../features/permissions/types/types';
import { EntityCard, type CardAction, type CardField } from '../../../shared/components/EntityCard';

interface RoleUserCardProps {
  user: SimpleRoleUsersData;
  onDelete: (userId: string, userLogin: string) => void;
}

export const RoleUserCard: React.FC<RoleUserCardProps> = ({ user, onDelete }) => {
  const fields: CardField[] = [
    {
      key: 'userLogin',
      label: 'Логин',
      render: (value: string) => <span title={value}>{value}</span>,
    },
  ];

  const actions: CardAction[] = [
    {
      action: 'delete',
      label: 'Удалить',
      onClick: (item: SimpleRoleUsersData) => onDelete(item.userId, item.userLogin),
    },
  ];

  return <EntityCard item={user} fields={fields} actions={actions} titleKey='userLogin' />;
};
