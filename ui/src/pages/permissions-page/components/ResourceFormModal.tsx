import React from 'react';
import { FormModal, type FormField } from '../../../shared/components/FormModal';
import type { CreateResourceRequest, ResourceDto } from '../../../features/permissions/types/types';

interface ResourceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (resourceData: CreateResourceRequest | Partial<CreateResourceRequest>) => void;
  resource?: ResourceDto | null;
  mode: 'view' | 'create' | 'edit';
  isLoading?: boolean;
}

const resourceTypeOptions = [
  { value: 'PAGE', label: 'Страница' },
  { value: 'BUTTON', label: 'Кнопка' },
  { value: 'API', label: 'API' },
  { value: 'TABLE', label: 'Таблица' },
  { value: 'MENU', label: 'Меню' },
  { value: 'GLOBAL', label: 'Глобальный' },
];

export const ResourceFormModal: React.FC<ResourceFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  resource,
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
      placeholder: 'page.pipelines',
    },
    {
      name: 'name',
      label: 'Название',
      type: 'text',
      required: true,
      disabled: mode === 'view',
      placeholder: 'Страница пайплайнов',
    },
    {
      name: 'type',
      label: 'Тип ресурса',
      type: 'select',
      required: true,
      disabled: mode === 'view',
      options: resourceTypeOptions,
    },
    {
      name: 'description',
      label: 'Описание',
      type: 'textarea',
      disabled: mode === 'view',
      placeholder: 'Описание ресурса',
    },
  ];

  const getInitialValues = () => {
    if (resource && (mode === 'view' || mode === 'edit')) {
      return {
        code: resource.code,
        name: resource.name,
        type: resource.type,
        description: resource.description || '',
      };
    }
    // Для создания
    return {
      code: '',
      name: '',
      type: 'PAGE',
      description: '',
    };
  };

  const getTitle = () => {
    switch (mode) {
      case 'view':
        return 'Просмотр ресурса';
      case 'create':
        return 'Создание ресурса';
      case 'edit':
        return 'Редактирование ресурса';
      default:
        return 'Ресурс';
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
