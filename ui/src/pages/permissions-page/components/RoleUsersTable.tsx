// src/pages/permissions-page/components/RoleUsersTable.tsx

import React, { useState, useCallback } from 'react';
import Table from '../../../shared/ui/table/Table';
import { RoleUsersFormModal } from './RoleUsersFormModal';
import { SYS_TABLE_RESOURCES } from '../../../shared/resources';
import type { Column } from '../../../shared/ui/table/types/type';
import type { TableProps } from '../../../shared/types/types';
import { DeleteConfirmationModal } from '../../../shared/components/DeleteConfirmationModal';
import { TableWithStates } from '../../../shared/ui/table/components/TableStates';
import { SkeletonTable } from '../../../shared/components/SkeletonTable';
import { useViewMode } from '../../../shared/hooks/useViewMode';
import { RoleUserCard } from './RoleUserCard';

import {
  fetchUsers,
  mapServerResponseToTableMeta,
  roleUserApi,
} from '../../../features/permissions/api/roleUserApi';
import { RoleSelectorWithActions } from '../../../shared/components/RoleSelectorWithActions';
import { SkeletonCards } from '../../../features/pipeline/pipelines-table/ui/SkeletonCards';
import { createTextColumn, createActionsColumn } from '../../../shared/ui/table/lib/columnFactory';
import { useRoleEntityTable } from '../../../shared/hooks/useRoleEntityTable';
import type { UserDto } from '../../../features/auth/types/types';

export const RoleUsersTable: React.FC<TableProps<UserDto>> = ({
  onToggleColumnVisibility,
  columnWidths,
  onColumnResize,
}) => {
  const { displayMode, setDisplayMode } = useViewMode('roleUsers');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    userId: string | null;
    userLogin: string | null;
  }>({
    isOpen: false,
    userId: null,
    userLogin: null,
  });

  const {
    availableRoles,
    selectedRoleId,
    selectedRoleCode,
    data,
    isLoading,
    error,
    serverMeta,
    savedState,
    handleRoleChange,
    handleTableChange,
    refresh,
  } = useRoleEntityTable<UserDto>({
    resourceCode: SYS_TABLE_RESOURCES.TABLE_ROLE_USERS.code,
    fetchData: async (params, roleid) => {
      const response = await fetchUsers(params, roleid);
      return {
        data: response.content,
        meta: mapServerResponseToTableMeta(response),
      };
    },
  });

  const handleOpenAddModal = () => {
    if (!selectedRoleId) {
      alert('Пожалуйста, выберите роль');
      return;
    }
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => setIsAddModalOpen(false);

  const handleAddUsersToRole = async (data: { userIds: string[] }) => {
    if (!selectedRoleId || data.userIds.length === 0) return;
    setIsSaving(true);
    try {
      await roleUserApi.addUsersToRole(selectedRoleId, data.userIds);
      await refresh();
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Ошибка при добавлении пользователей в роль:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDeleteModal = (userId: string, userLogin: string) => {
    if (!userId) return;
    setDeleteModalState({ isOpen: true, userId, userLogin });
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalState({ isOpen: false, userId: null, userLogin: null });
  };

  const handleConfirmDelete = async () => {
    const { userId } = deleteModalState;
    if (!selectedRoleId || !userId) return;
    try {
      await roleUserApi.removeUsersFromRole(selectedRoleId, [userId]);
      await refresh();
      handleCloseDeleteModal();
    } catch (err) {
      console.error('Ошибка при удалении пользователя из роли:', err);
    }
  };

  const columns: Column<UserDto>[] = [
    createTextColumn('login', 'Логин пользователя', { width: 200 }),
    createActionsColumn(row => [
      {
        action: 'delete',
        label: 'Удалить',
        onClick: () => handleOpenDeleteModal(row.id, row.login),
      },
    ]),
  ];

  const activeFilterCount = Object.keys(savedState?.filters || {}).length;
  const skeletonRowCount = serverMeta?.pagination?.size || 5;

  const renderCard = useCallback(
    (user: UserDto) => <RoleUserCard user={user} onDelete={handleOpenDeleteModal} />,
    [handleOpenDeleteModal],
  );

  return (
    <TableWithStates
      permissionsLoading={false}
      isLoadingState={false}
      error={error}
      onRetry={refresh}
      entityName='пользователей в роли'
      isLoadingData={false}
    >
      <div className='relative w-full p-4 space-y-4'>
        <RoleSelectorWithActions
          roles={availableRoles}
          selectedRoleId={selectedRoleId}
          onRoleChange={handleRoleChange}
          onAddClick={handleOpenAddModal}
          addButtonText='Добавить пользователей'
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          disabled={isLoading}
        />

        {selectedRoleId ? (
          isLoading ? (
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
              emptyMessage='В этой роли пока нет пользователей'
              resizable={true}
              resizeSensitivity={1}
              minColumnWidth={20}
              className='w-full'
              caption={`Пользователи в роли: ${selectedRoleCode}`}
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
              rowKey='id'
              displayMode={displayMode}
              renderCard={renderCard}
            />
          )
        ) : (
          <div className='flex justify-center items-center p-12'>
            <div className='text-lg text-gray-600 dark:text-gray-400'>
              Выберите роль для просмотра пользователей
            </div>
          </div>
        )}
      </div>

      <RoleUsersFormModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSave={handleAddUsersToRole}
        roleId={selectedRoleId}
        isLoading={isSaving}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalState.isOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        userLogin={deleteModalState.userLogin || ''}
        isLoading={isLoading}
      />
    </TableWithStates>
  );
};
