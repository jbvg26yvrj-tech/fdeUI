import React from 'react';
import { FormModal, type FormField } from '../../../shared/components/FormModal';
import type { UserDto, CreateUserRequest, UpdateUserRequest } from '../types/types';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: CreateUserRequest | UpdateUserRequest) => void;
  user?: UserDto | null;
  mode: 'view' | 'edit' | 'create';
  isLoading?: boolean;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  user,
  mode,
  isLoading = false,
}) => {
  const fields: FormField[] = [
    {
      name: 'login',
      label: 'Логин',
      type: 'text',
      required: true,
      // Логин нельзя редактировать, поэтому disabled во всех режимах, кроме создания?
      // В режиме 'edit' он тоже должен быть отключен, судя по исходному коду.
      disabled: mode !== 'create',
    },
    {
      name: 'activated',
      label: 'Активен',
      type: 'checkbox',
    },
    {
      name: 'passwordChangeRequired',
      label: 'Необходимо изменить пароль',
      type: 'checkbox',
    },
  ];

  // Поле для пароля добавляем только в режиме создания
  if (mode === 'create') {
    fields.push({
      name: 'password',
      label: 'Пароль',
      type: 'password',
      required: true,
      placeholder: 'Введите пароль',
    });
  }

  const getInitialValues = () => {
    if (user && (mode === 'view' || mode === 'edit')) {
      return {
        login: user.login,
        activated: user.activated,
        passwordChangeRequired: user.passwordChangeRequired,
        password: '', // Пароль не передается при редактировании/просмотре
      };
    }
    // Для создания
    return {
      login: '',
      password: '',
      activated: true,
      passwordChangeRequired: false,
    };
  };

  const getTitle = () => {
    switch (mode) {
      case 'view':
        return 'Просмотр пользователя';
      case 'edit':
        return 'Редактирование пользователя';
      case 'create':
        return 'Создание пользователя';
      default:
        return 'Пользователь';
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
      mode={mode === 'edit' ? 'edit' : mode === 'create' ? 'create' : 'view'}
      isLoading={isLoading}
      size='sm'
    />
  );
};
