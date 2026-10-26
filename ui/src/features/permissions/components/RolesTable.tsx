import React, { useCallback, useState } from 'react';
import Table from '../../../shared/ui/table/Table';
import { Button } from '../../../shared/ui/Button';
import { Modal } from '../../../shared/ui/Modal';
import { Input } from '../../../shared/ui/Input';
import {
  fetchRoles,
  mapServerResponseToTableMeta,
  rolesApi,
} from '../../../features/permissions/api/rolesApi';
import type { RoleDto, CreateRoleRequest } from '../../../features/permissions/types/types';
import { TableWithStates } from '../../../shared/ui/table/components/TableStates';
import { SYS_TABLE_RESOURCES } from '../../../shared/resources';
import type { Column } from '../../../shared/ui/table/types/type';
import type { TableProps } from '../../../shared/types/Types';
import { useTableData } from '../../../shared/ui/table/hooks/useTableData';
import { DeleteConfirmationModal } from '../../../shared/components/DeleteConfirmationModal';
import { SkeletonTable } from '../../../shared/components/SkeletonTable';
import { CardsIcon, TableIcon } from '../../../shared/ui/table/lib/icons';
import { useViewMode } from '../../../shared/hooks/useViewMode';
import { SkeletonCards } from '../../pipeline/pipelines-table/ui/SkeletonCards';
import { RoleCard } from './RolesCard';
import {
  createTextColumn,
  createDateTimeColumn,
  createActionsColumn,
} from '../../../shared/ui/table/lib/columnFactory';

export const RolesTable: React.FC<TableProps<RoleDto>> = ({
  onToggleColumnVisibility,
  columnWidths,
  onColumnResize,
}) => {
  const { displayMode, setDisplayMode } = useViewMode('roles');

  const {
    data,
    isLoading,
    serverMeta,
    handleTableChange,
    savedState,
    permissionsLoading,
    isLoadingState,
    error,
    loadServerData,
  } = useTableData<RoleDto>({
    resourceCode: SYS_TABLE_RESOURCES.TABLE_ROLES.code,
    fetchData: async params => {
      const response = await fetchRoles(params);
      return {
        data: response.content,
        meta: mapServerResponseToTableMeta(response),
      };
    },
  });

  // Состояния для модального окна создания/редактирования
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDto | null>(null);
  const [formData, setFormData] = useState<CreateRoleRequest>({
    code: '',
    name: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Состояния для модального окна подтверждения удаления
  const [roleToDelete, setRoleToDelete] = useState<RoleDto | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetForm = useCallback(() => {
    setFormData({ code: '', name: '', description: '' });
    setEditingRole(null);
  }, []);

  const handleCreateRole = useCallback(() => {
    resetForm();
    setIsModalOpen(true);
  }, [resetForm]);

  const handleEditRole = useCallback(
    async (roleId: string) => {
      try {
        const existingRole = data.find(r => r.id === roleId);
        if (existingRole) {
          setEditingRole(existingRole);
          setFormData({
            code: existingRole.code,
            name: existingRole.name,
            description: existingRole.description || '',
          });
          setIsModalOpen(true);
          return;
        }
        const role = await rolesApi.getUserRoleById(roleId);
        setEditingRole(role);
        setFormData({
          code: role.code,
          name: role.name,
          description: role.description || '',
        });
        setIsModalOpen(true);
      } catch (err) {
        console.error('Ошибка загрузки роли для редактирования:', err);
        alert('Не удалось загрузить данные роли');
      }
    },
    [data],
  );

  const handleDeleteRole = useCallback((role: RoleDto) => {
    setRoleToDelete(role);
    setIsDeleteModalOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!roleToDelete) return;
    setIsDeleting(true);
    try {
      await rolesApi.deleteUserRole(roleToDelete.id);
      await loadServerData();
      setIsDeleteModalOpen(false);
      setRoleToDelete(null);
    } catch (err) {
      console.error('Ошибка удаления роли:', err);
      alert('Не удалось удалить роль');
    } finally {
      setIsDeleting(false);
    }
  }, [roleToDelete, loadServerData]);

  const handleCloseDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
    setRoleToDelete(null);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.code || !formData.name) {
      alert('Код и название обязательны для заполнения');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingRole) {
        await rolesApi.updateUserRole(editingRole.id, formData);
      } else {
        await rolesApi.createUserRole(formData);
      }
      setIsModalOpen(false);
      resetForm();
      await loadServerData();
    } catch (err) {
      console.error('Ошибка сохранения роли:', err);
      alert('Не удалось сохранить роль');
    } finally {
      setIsSubmitting(false);
    }
  }, [editingRole, formData, loadServerData, resetForm]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    resetForm();
  }, [resetForm]);

  const columns: Column<RoleDto>[] = [
    createTextColumn('code', 'Код', { width: 150 }),
    createTextColumn('name', 'Название', { width: 200 }),
    createTextColumn('description', 'Описание', { width: 250 }),
    createDateTimeColumn('createdAt', 'Создана', { width: 120 }),
    createActionsColumn(row => [
      { action: 'edit', label: 'Редактировать', onClick: () => handleEditRole(row.id) },
      { action: 'delete', label: 'Удалить', onClick: () => handleDeleteRole(row) },
    ]),
  ];

  const activeFilterCount = Object.keys(savedState?.filters || {}).length;
  const skeletonRowCount = serverMeta?.pagination?.size || 5;

  const renderCard = useCallback(
    (role: RoleDto) => <RoleCard role={role} onEdit={handleEditRole} onDelete={handleDeleteRole} />,
    [handleEditRole, handleDeleteRole],
  );

  return (
    <TableWithStates
      permissionsLoading={permissionsLoading}
      isLoadingState={isLoadingState}
      error={error}
      onRetry={() => loadServerData()}
      entityName='роли'
      isLoadingData={false}
    >
      <div className='relative w-full p-4 space-y-4'>
        <div className='flex flex-wrap justify-between items-start gap-y-2 max-[420px]:flex-col'>
          <div className='space-y-2'>
            <h2 className='text-lg font-semibold text-gray-800 dark:text-white'>
              Управление ролями
            </h2>
            {serverMeta && (
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                Всего ролей: {serverMeta.pagination.totalElements}
              </p>
            )}
          </div>
          <div className='flex items-center space-x-2 max-[420px]:ml-auto'>
            <Button variant='primary' size='sm' onClick={handleCreateRole} disabled={isLoading}>
              Создать роль
            </Button>
            <div className='flex space-x-1'>
              <button
                onClick={() => setDisplayMode('table')}
                className={`p-2 rounded-md transition-colors ${
                  displayMode === 'table'
                    ? 'bg-blue-100 dark:bg-blue-900'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title='Таблица'
              >
                <TableIcon active={displayMode === 'table'} />
              </button>
              <button
                onClick={() => setDisplayMode('cards')}
                className={`p-2 rounded-md transition-colors ${
                  displayMode === 'cards'
                    ? 'bg-blue-100 dark:bg-blue-900'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title='Карточки'
              >
                <CardsIcon active={displayMode === 'cards'} />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          displayMode === 'table' ? (
            <SkeletonTable
              columns={columns}
              activeFilterCount={activeFilterCount}
              rowCount={skeletonRowCount}
            />
          ) : (
            <SkeletonCards
              columns={columns}
              activeFilterCount={activeFilterCount}
              rowCount={skeletonRowCount}
            />
          )
        ) : (
          <Table
            serverMeta={serverMeta}
            onTableChange={handleTableChange}
            columns={columns}
            data={data}
            emptyMessage='Роли не найдены'
            resizable={true}
            resizeSensitivity={1}
            minColumnWidth={20}
            className='w-full'
            caption='Список ролей'
            onToggleColumnVisibility={onToggleColumnVisibility}
            columnWidths={columnWidths}
            onColumnResize={onColumnResize}
            initialFilters={savedState?.filters || {}}
            initialSort={
              savedState?.sortBy
                ? {
                    field: savedState.sortBy,
                    order: savedState.sortOrder || 'asc',
                  }
                : null
            }
            displayMode={displayMode}
            renderCard={renderCard}
          />
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingRole ? 'Редактирование роли' : 'Создание новой роли'}
        variant='custom'
        showCloseButton={false}
        footer={
          <div className='flex justify-end space-x-2'>
            <Button variant='secondary' onClick={handleCloseModal} disabled={isSubmitting}>
              Отмена
            </Button>
            <Button variant='primary' onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Сохранение...' : editingRole ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        }
      >
        <div className='space-y-4'>
          <Input
            label='Код'
            name='code'
            value={formData.code}
            onChange={handleInputChange}
            required
            disabled={isSubmitting}
          />
          <Input
            label='Название'
            name='name'
            value={formData.name}
            onChange={handleInputChange}
            required
            disabled={isSubmitting}
          />
          <Input
            label='Описание'
            name='description'
            value={formData.description}
            onChange={handleInputChange}
            disabled={isSubmitting}
          />
        </div>
      </Modal>

      {roleToDelete && (
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={handleCloseDeleteModal}
          onConfirm={confirmDelete}
          userLogin={roleToDelete.name}
          isLoading={isDeleting}
        />
      )}
    </TableWithStates>
  );
};
