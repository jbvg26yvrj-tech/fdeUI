// src/pages/permissions-page/components/RoleResourcesTable.tsx

import React, { useState, useCallback } from 'react';
import Table from '../../../shared/ui/table/Table';
import { RoleResourcesFormModal } from './RoleResourcesFormModal';
import { SYS_TABLE_RESOURCES } from '../../../shared/resources';
import type { Column } from '../../../shared/ui/table/types/type';
import type { TableProps } from '../../../shared/types/types';
import { DeleteConfirmationModal } from '../../../shared/components/DeleteConfirmationModal';
import { TableWithStates } from '../../../shared/ui/table/components/TableStates';
import { SkeletonTable } from '../../../shared/components/SkeletonTable';
import { useViewMode } from '../../../shared/hooks/useViewMode';
import { RoleResourceCard } from './RoleResourceCard';
import type {
  ResourceDto,
  RoleResourceAssignmentRequest,
} from '../../../features/permissions/types/types';
import {
  fetchResources,
  mapServerResponseToTableMeta,
  roleResourceApi,
} from '../../../features/permissions/api/roleResourceApi';
import { RoleSelectorWithActions } from '../../../shared/components/RoleSelectorWithActions';
import { SkeletonCards } from '../../../features/pipeline/pipelines-table/ui/SkeletonCards';
import {
  createTextColumn,
  createSelectColumn,
  createActionsColumn,
} from '../../../shared/ui/table/lib/columnFactory';
import { useRoleEntityTable } from '../../../shared/hooks/useRoleEntityTable';

export const RoleResourcesTable: React.FC<TableProps<ResourceDto>> = ({
  onToggleColumnVisibility,
  columnWidths,
  onColumnResize,
}) => {
  const { displayMode, setDisplayMode } = useViewMode('roleResources');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    resourceId: string | null;
    resourceCode: string | null;
  }>({
    isOpen: false,
    resourceId: null,
    resourceCode: null,
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
  } = useRoleEntityTable<ResourceDto>({
    resourceCode: SYS_TABLE_RESOURCES.TABLE_ROLE_RESOURCES.code,
    fetchData: async (params, roleid) => {
      const response = await fetchResources(params, roleid);
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

  const handleAddResourcesToRole = async (data: RoleResourceAssignmentRequest) => {
    if (!selectedRoleId || data.resourceIds.length === 0) return;
    setIsSaving(true);
    try {
      await roleResourceApi.addResourcesToRole(selectedRoleId, data);
      await refresh();
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Ошибка при добавлении ресурсов в роль:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDeleteModal = (resourceId: string, resourceCode: string) => {
    if (!resourceId) return;
    setDeleteModalState({ isOpen: true, resourceId, resourceCode });
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalState({ isOpen: false, resourceId: null, resourceCode: null });
  };

  const handleConfirmDelete = async () => {
    const { resourceId } = deleteModalState;
    if (!selectedRoleId || !resourceId) return;
    try {
      await roleResourceApi.removeResourcesFromRole(selectedRoleId, { resourceIds: [resourceId] });
      await refresh();
      handleCloseDeleteModal();
    } catch (err) {
      console.error('Ошибка при удалении ресурса из роли:', err);
    }
  };

  const resourceTypeOptions = [
    { value: 'PAGE', label: 'Страница' },
    { value: 'BUTTON', label: 'Кнопка' },
    { value: 'API', label: 'API' },
    { value: 'TABLE', label: 'Таблица' },
    { value: 'MENU', label: 'Меню' },
    { value: 'GLOBAL', label: 'Глобальный' },
  ];

  const typeLabels: Record<string, string> = {
    PAGE: 'Страница',
    BUTTON: 'Кнопка',
    API: 'API',
    TABLE: 'Таблица',
    MENU: 'Меню',
    GLOBAL: 'Глобальный',
  };

  const columns: Column<ResourceDto>[] = [
    createTextColumn('code', 'Код ресурса', { width: 200 }),
    createTextColumn('name', 'Название ресурса', { width: 200 }),
    {
      ...createSelectColumn('type', 'Тип ресурса', resourceTypeOptions, { width: 120 }),
      render: (value: unknown) => {
        return (
          <div
            className='truncate min-w-0 dark:text-gray-100'
            title={String(value)}
            style={{ minWidth: '0' }}
          >
            {typeLabels[String(value)] || String(value)}
          </div>
        );
      },
    },
    createActionsColumn(row => [
      {
        action: 'delete',
        label: 'Удалить',
        onClick: () => handleOpenDeleteModal(row.id, row.code || ''),
      },
    ]),
  ];

  const activeFilterCount = Object.keys(savedState?.filters || {}).length;
  const skeletonRowCount = serverMeta?.pagination?.size || 5;

  const renderCard = useCallback(
    (resource: ResourceDto) => (
      <RoleResourceCard resource={resource} onDelete={handleOpenDeleteModal} />
    ),
    [handleOpenDeleteModal],
  );

  return (
    <TableWithStates
      permissionsLoading={false}
      isLoadingState={false}
      error={error}
      onRetry={refresh}
      entityName='ресурсов в роли'
      isLoadingData={false}
    >
      <div className='relative w-full p-4 space-y-4'>
        <RoleSelectorWithActions
          roles={availableRoles}
          selectedRoleId={selectedRoleId}
          onRoleChange={handleRoleChange}
          onAddClick={handleOpenAddModal}
          addButtonText='Добавить ресурсы'
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
              emptyMessage='В этой роли пока нет ресурсов'
              resizable={true}
              resizeSensitivity={1}
              minColumnWidth={20}
              className='w-full'
              caption={`Ресурсы, назначенные на роль: ${selectedRoleCode}`}
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
              Выберите роль для просмотра ресурсов
            </div>
          </div>
        )}
      </div>

      <RoleResourcesFormModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSave={handleAddResourcesToRole}
        roleId={selectedRoleId}
        isLoading={isSaving}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalState.isOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        userLogin={deleteModalState.resourceCode || ''}
        isLoading={isLoading}
      />
    </TableWithStates>
  );
};
