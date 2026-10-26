import React from 'react';
import { FormModal, type FormField } from '../../../shared/components/FormModal';
import type { RoleDto, CreateRoleRequest, UpdateRoleRequest } from '../types/types';

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (groupData: CreateRoleRequest | UpdateRoleRequest) => void;
  role?: RoleDto | null;
  mode: 'view' | 'create' | 'edit';
  isLoading?: boolean;
}

export const RoleFormModal: React.FC<RoleFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  role,
  mode,
  isLoading = false,
}) => {
  const fields: FormField[] = [
    {
      name: 'code',
      label: 'Код',
      type: 'text',
      required: true,
      disabled: mode === 'edit', // Код нельзя редактировать
      placeholder: 'admin_group',
    },
    {
      name: 'name',
      label: 'Название',
      type: 'text',
      required: true,
      disabled: mode === 'view',
      placeholder: 'Администраторы системы',
    },
    {
      name: 'description',
      label: 'Описание',
      type: 'textarea',
      disabled: mode === 'view',
      placeholder: 'Группа для полного доступа ко всем функциям системы',
    },
  ];

  const getInitialValues = () => {
    if (role && (mode === 'view' || mode === 'edit')) {
      return {
        code: role.code,
        name: role.name,
        description: role.description || '',
      };
    }
    // Для создания
    return {
      code: '',
      name: '',
      description: '',
    };
  };

  const getTitle = () => {
    switch (mode) {
      case 'view':
        return 'Просмотр роли';
      case 'create':
        return 'Создание роли';
      case 'edit':
        return 'Редактирование роли';
      default:
        return 'Роль';
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={onSave}
      title={getTitle()}
      fields={fields}
      initialValues={getInitialValues()}
      mode={mode}
      isLoading={isLoading}
      size='sm'
    />
  );
};
