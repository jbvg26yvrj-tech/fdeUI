import React from 'react';
import { parseClientCodes } from '../lib/clientCodes';
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
      name: 'clientCodes',
      label: 'Коды клиентов — доступ только для просмотра',
      type: 'text',
      disabled: mode === 'view',
      placeholder: 'DWH, PC — пустое поле не даёт доступа к потокам',
    },
    {
      name: 'code',
      label: 'Код',
      type: 'text',
      required: true,
      disabled: mode !== 'create', // Код нельзя редактировать
      placeholder: 'DWH_VIEWER',
    },
    {
      name: 'name',
      label: 'Название',
      type: 'text',
      required: true,
      disabled: mode === 'view',
      placeholder: 'Просмотр потоков DWH',
    },
    {
      name: 'description',
      label: 'Описание',
      type: 'textarea',
      disabled: mode === 'view',
      placeholder: 'Просмотр пайплайнов, сессий, аналитики и расписаний выбранных клиентов',
    },
  ];

  const getInitialValues = () => {
    if (role && (mode === 'view' || mode === 'edit')) {
      return {
        code: role.code,
        clientCodes: (role.clientCodes || []).join(', '),
        name: role.name,
        description: role.description || '',
      };
    }
    // Для создания
    return {
      code: '',
      clientCodes: '',
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
      onSave={values =>
        onSave({
          code: values.code,
          name: values.name,
          description: values.description,
          clientCodes: parseClientCodes(values.clientCodes || ''),
        })
      }
      title={getTitle()}
      fields={fields}
      initialValues={getInitialValues()}
      mode={mode}
      isLoading={isLoading}
      size='sm'
    />
  );
};
