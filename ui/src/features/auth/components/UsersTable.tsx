import React, { useCallback } from 'react';
import { usersApi, type UsersApiResponse } from '../api/usersApi';
import type { UserDto } from '../types/types';
import type { Column, TableMeta, TableParams } from '../../../shared/ui/table/types/type';
import Table from '../../../shared/ui/table/Table';
import { UserFormModal } from './UserFormModal';
import { DeleteConfirmationModal } from '../../../shared/components/DeleteConfirmationModal';
import { SkeletonTable } from '../../../shared/components/SkeletonTable';
import { TableWithStates } from '../../../shared/ui/table/components/TableStates';
import { useTableData } from '../../../shared/ui/table/hooks/useTableData';
import { SYS_TABLE_RESOURCES } from '../../../shared/resources';
import { UserCard } from './UserCard';
import { SkeletonCards } from '../../pipeline/pipelines-table/ui/SkeletonCards';
import { useViewMode } from '../../../shared/hooks/useViewMode';
import { ViewModeLayout } from '../../../shared/components/ViewModeLayout';
import {
  createTextColumn,
  createCheckboxColumn,
  createActionsColumn,
} from '../../../shared/ui/table/lib/columnFactory';

const TABLE_ID = 'users';

interface UsersTableProps {
  onToggleColumnVisibility?: (columnKey: string) => void;
  columnWidths?: Record<string, number>;
  onColumnResize?: (columnKey: string, newWidth: number) => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({
  onToggleColumnVisibility,
  columnWidths,
  onColumnResize,
}) => {
  const { displayMode, setDisplayMode } = useViewMode(TABLE_ID);

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
  } = useTableData<UserDto>({
    resourceCode: SYS_TABLE_RESOURCES.TABLE_USERS.code,
    fetchData: async (params?: TableParams) => {
      const response = await usersApi.getUsersWithParams(params);
      return {
        data: response.content,
        meta: mapServerResponseToTableMeta(response),
      };
    },
  });

  const [selectedUser, setSelectedUser] = React.useState<UserDto | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [deleteModalState, setDeleteModalState] = React.useState<{
    isOpen: boolean;
    user: UserDto | null;
  }>({
    isOpen: false,
    user: null,
  });
  const [modalMode, setModalMode] = React.useState<'view' | 'edit'>('view');
  const [actionLoading, setActionLoading] = React.useState(false);

  const handleViewUser = useCallback((user: UserDto) => {
    setSelectedUser(user);
    setModalMode('view');
    setIsModalOpen(true);
  }, []);

  const handleEditUser = useCallback((user: UserDto) => {
    setSelectedUser(user);
    setModalMode('edit');
    setIsModalOpen(true);
  }, []);

  const handleDeleteUser = useCallback((user: UserDto) => {
    setDeleteModalState({
      isOpen: true,
      user,
    });
  }, []);

  const handleSaveUser = async (userData: any) => {
    setActionLoading(true);
    try {
      if (modalMode === 'edit' && selectedUser) {
        await usersApi.updateUser(selectedUser.id, userData);
      }
      setIsModalOpen(false);
      loadServerData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalState.user) return;

    setActionLoading(true);
    try {
      await usersApi.deleteUser(deleteModalState.user.id);
      setDeleteModalState({ isOpen: false, user: null });
      loadServerData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewUserDetails = useCallback(
    (user: UserDto) => {
      handleViewUser(user);
    },
    [handleViewUser],
  );

  const columns: Column<UserDto>[] = [
    createTextColumn('login', 'Логин', { width: 200 }),
    createCheckboxColumn('activated', 'Активен', { width: 80 }),
    {
      ...createCheckboxColumn('passwordChangeRequired', 'Пароль', { width: 120 }),
      render: (value: unknown) => {
        const passwordChangeRequired = Boolean(value);
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              passwordChangeRequired
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
            }`}
          >
            {passwordChangeRequired ? 'Необходимо изменить пароль' : 'Пароль актуален'}
          </span>
        );
      },
    },
    createActionsColumn(user => [
      { action: 'view', label: 'Просмотр', onClick: () => handleViewUser(user) },
      { action: 'edit', label: 'Редактировать', onClick: () => handleEditUser(user) },
      { action: 'delete', label: 'Удалить', onClick: () => handleDeleteUser(user) },
    ]),
  ];

  const activeFilterCount = Object.keys(savedState?.filters || {}).length;
  const skeletonRowCount = serverMeta?.pagination?.size || 8;

  const renderCard = useCallback(
    (user: UserDto) => (
      <UserCard
        user={user}
        onView={handleViewUser}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
      />
    ),
    [handleViewUser, handleEditUser, handleDeleteUser],
  );

  return (
    <TableWithStates
      permissionsLoading={permissionsLoading}
      isLoadingState={isLoadingState}
      error={error}
      onRetry={() => loadServerData()}
      entityName='пользователи'
      isLoadingData={false}
    >
      <ViewModeLayout
        displayMode={displayMode}
        setDisplayMode={setDisplayMode}
        isLoading={isLoading}
        skeletonTable={
          <SkeletonTable
            columns={columns}
            activeFilterCount={activeFilterCount}
            rowCount={skeletonRowCount}
          />
        }
        skeletonCards={
          <SkeletonCards
            columns={columns}
            activeFilterCount={activeFilterCount}
            rowCount={skeletonRowCount}
          />
        }
      >
        {() => (
          <div className='relative w-full'>
            <Table
              serverMeta={serverMeta}
              onTableChange={handleTableChange}
              columns={columns}
              data={data}
              onRowDoubleClick={handleViewUserDetails}
              emptyMessage='Пользователи не найдены'
              resizable={true}
              resizeSensitivity={1}
              minColumnWidth={80}
              className='w-full'
              caption='Пользователи'
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
          </div>
        )}
      </ViewModeLayout>

      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUser}
        user={selectedUser}
        mode={modalMode}
        isLoading={actionLoading}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, user: null })}
        onConfirm={handleConfirmDelete}
        userLogin={deleteModalState.user?.login || ''}
        isLoading={actionLoading}
      />
    </TableWithStates>
  );
};

function mapServerResponseToTableMeta(response: UsersApiResponse): TableMeta {
  return {
    pagination: {
      page: response.page,
      size: response.size,
      totalElements: response.totalElements,
      totalPages: response.totalPages,
    },
    filters: {},
    sort: null,
  };
}

export default UsersTable;
