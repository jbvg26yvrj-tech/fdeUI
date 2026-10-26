import React, { useState, useEffect } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Checkbox } from '../../../shared/ui/Checkbox';
import type { UserDto } from '../../../features/auth/types/types';
import { usersApi } from '../../../features/auth/api/usersApi';
import { roleUserApi } from '../../../features/permissions/api/roleUserApi';

interface AddUsersToRoleRequest {
  userIds: string[];
}

interface RoleUsersFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AddUsersToRoleRequest) => void;
  roleId: string; // теперь используется
  isLoading?: boolean;
}

export const RoleUsersFormModal: React.FC<RoleUsersFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  roleId,
  isLoading = false,
}) => {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<UserDto[]>([]); // все пользователи системы
  const [existingUserIds, setExistingUserIds] = useState<string[]>([]); // ID пользователей, уже в роли
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных при открытии модалки
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, roleId]);

  const loadData = async () => {
    setLoadingUsers(true);
    setLoadingExisting(true);
    setError(null);

    try {
      // Загружаем всех пользователей системы
      const usersResponse = await usersApi.getUsersWithParams({
        pagination: { page: 1, size: 10000 },
        sort: { field: 'login', order: 'asc' },
        filters: {},
      });

      // Загружаем существующих пользователей роли (returns UserDto[])
      console.log('roleId for existingUsers = ', roleId);
      const assignedUsers = await roleUserApi.getAssignedUsers(roleId);
      console.log('assignedUsers = ', assignedUsers);

      setAllUsers(usersResponse.content);
      setExistingUserIds(assignedUsers.map((user: UserDto) => user.id));
      setSelectedUserIds([]);
    } catch (err) {
      setError('Не удалось загрузить данные');
      console.error('Failed to load data:', err);
    } finally {
      setLoadingUsers(false);
      setLoadingExisting(false);
    }
  };

  // Фильтруем пользователей, исключая уже добавленных в роль
  const availableUsers = allUsers.filter(user => !existingUserIds.includes(user.id));

  const handleUserToggle = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId],
    );
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === availableUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(availableUsers.map(user => user.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) {
      alert('Выберите хотя бы одного пользователя');
      return;
    }
    onSave({ userIds: selectedUserIds });
  };

  const handleConfirm = () => {
    const submitEvent = new Event('submit', { cancelable: true }) as unknown as React.FormEvent;
    handleSubmit(submitEvent);
  };

  const isLoadingAny = loadingUsers || loadingExisting || isLoading;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title='Добавить пользователей в роль'
      variant='confirm'
      size='md'
      showCloseButton={true}
      confirmText='Добавить'
      cancelText='Отмена'
      disableBackdropClick={isLoadingAny}
    >
      <form onSubmit={handleSubmit} className='space-y-3'>
        {/* Информация о выбранных */}
        <div className='flex items-center justify-between text-sm'>
          <span className='text-gray-600 dark:text-gray-400'>
            Выбрано пользователей:{' '}
            <span className='font-medium text-gray-900 dark:text-white'>
              {selectedUserIds.length}
            </span>
          </span>
          {availableUsers.length > 0 && (
            <button
              type='button'
              onClick={handleSelectAll}
              className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-colors'
            >
              {selectedUserIds.length === availableUsers.length ? 'Снять все' : 'Выбрать все'}
            </button>
          )}
        </div>

        {/* Список доступных пользователей */}
        <div className='border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'>
          {error ? (
            <div className='text-center py-6 text-red-600 dark:text-red-400'>
              {error}
              <button
                type='button'
                onClick={loadData}
                className='ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline'
              >
                Повторить
              </button>
            </div>
          ) : isLoadingAny ? (
            <div className='text-center py-6 text-gray-500 dark:text-gray-400'>
              Загрузка данных...
            </div>
          ) : availableUsers.length === 0 ? (
            <div className='text-center py-6 text-gray-500 dark:text-gray-400'>
              Все пользователи уже добавлены в эту роль
            </div>
          ) : (
            <div className='overflow-y-auto max-h-80'>
              {/* Заголовок таблицы */}
              <div className='sticky top-0 bg-gray-50 dark:bg-gray-800 z-10 border-b border-gray-200 dark:border-gray-700'>
                <div className='grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider'>
                  <div className='col-span-2 text-center'>Выбрать</div>
                  <div className='col-span-10'>Логин пользователя</div>
                </div>
              </div>

              {/* Список пользователей */}
              {availableUsers.map(user => (
                <div
                  key={user.id}
                  className='grid grid-cols-12 gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0 items-center transition-colors'
                >
                  <div className='col-span-2 flex justify-center'>
                    <Checkbox
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => handleUserToggle(user.id)}
                      inputSize='sm'
                    />
                  </div>
                  <div className='col-span-10'>
                    <div className='font-medium text-sm text-gray-900 dark:text-white'>
                      {user.login}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Информация о количестве доступных пользователей */}
        {!error && !isLoadingAny && availableUsers.length > 0 && (
          <div className='text-xs text-gray-500 dark:text-gray-400 text-center'>
            Доступно для добавления: {availableUsers.length}
          </div>
        )}
      </form>
    </Modal>
  );
};
