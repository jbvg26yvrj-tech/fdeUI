import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import Table from '../../../shared/ui/table/Table';
import {
  roleRlsApi,
  mapServerResponseToTableMeta,
  fetchRoleRls,
} from '../../../features/permissions/api/roleRlsApi';
import type { RoleRlsDto, ResourceDto, RlsFilter } from '../../../features/permissions/types/types';
import { SYS_TABLE_RESOURCES } from '../../../shared/resources';
import type { Column } from '../../../shared/ui/table/types/type';
import type { TableProps } from '../../../shared/types/Types';
import { RlsFilterModal } from '../../../features/permissions/components/RlsFilterModal';
import { TableWithStates } from '../../../shared/ui/table/components/TableStates';
import { SkeletonTable } from '../../../shared/components/SkeletonTable';
import { SkeletonCards } from '../../../features/pipeline/pipelines-table/ui/SkeletonCards';
import { useViewMode } from '../../../shared/hooks/useViewMode';
import { RoleRlsCard } from './RoleRlsCard';
import { RoleSelectorWithActions } from '../../../shared/components/RoleSelectorWithActions';
import {
  createTextColumn,
  createDateTimeColumn,
  createActionsColumn,
} from '../../../shared/ui/table/lib/columnFactory';
import { useRoleEntityTable } from '../../../shared/hooks/useRoleEntityTable';
import { DeleteConfirmationModal } from '../../../shared/components/DeleteConfirmationModal';

export const RoleRlsTable: React.FC<TableProps<RoleRlsDto>> = ({
  onToggleColumnVisibility,
  columnWidths,
  onColumnResize,
}) => {
  const { displayMode, setDisplayMode } = useViewMode('roleRls');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRls, setEditingRls] = useState<RoleRlsDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [resources, setResources] = useState<ResourceDto[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [actionLoading, setActionLoading] = React.useState(false);

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
  } = useRoleEntityTable<RoleRlsDto>({
    resourceCode: SYS_TABLE_RESOURCES.TABLE_RLS.code,
    fetchData: async (params, roleid) => {
      const response = await fetchRoleRls(params, roleid);
      return {
        data: response.content,
        meta: mapServerResponseToTableMeta(response),
      };
    },
  });

  const handleCreateRlsRule = () => {
    setEditingRls(null);
    setSelectedResourceId(resources.length > 0 ? resources[0].id : '');
    setIsModalOpen(true);
  };

  const handleEditRlsRule = (resourceId: string) => {
    const rlsToEdit = data.find(rls => rls.resourceId === resourceId);
    if (rlsToEdit) {
      setEditingRls(rlsToEdit);
      setIsModalOpen(true);
    }
  };

  const [deleteModalState, setDeleteModalState] = React.useState<{
    isOpen: boolean;
    roleRlsId: string | null;
  }>({
    isOpen: false,
    roleRlsId: null,
  });

  const handleSaveRlsRule = async (filter: RlsFilter, resourceId?: string) => {
    if (!selectedRoleId) {
      toast.error('Выберите роль для сохранения правила');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingRls) {
        await roleRlsApi.saveRlsFilter(selectedRoleId, editingRls.resourceId, filter);
      } else {
        if (!resourceId) {
          toast.error('Не выбран ресурс');
          return;
        }
        await roleRlsApi.saveRlsFilter(selectedRoleId, resourceId, filter);
      }
      setIsModalOpen(false);
      setEditingRls(null);
      await refresh();
      toast.success(editingRls ? 'Правило успешно сохранено!' : 'Правило успешно создано!');
    } catch (error) {
      console.error('Ошибка сохранения RLS правила:', error);
      toast.error('Произошла ошибка при сохранении правила');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRlsRule = useCallback((roleRlsId: string) => {
    console.log('handleDeleteRlsRule/roleRlsId = ', roleRlsId);
    setDeleteModalState({
      isOpen: true,
      roleRlsId,
    });
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteModalState) return;

    setActionLoading(true);
    const rlsToDelete = data.find(rls => rls.id === deleteModalState?.roleRlsId);
    if (!rlsToDelete || !selectedRoleId) {
      toast.error('Не удалось найти правило для удаления');
      setActionLoading(false);
      return;
    }
    try {
      await roleRlsApi.deleteRlsFilter(rlsToDelete.id);
      await refresh();
      toast.success('Правило успешно удалено!');
    } catch {
      toast.error('Произошла ошибка при удалении правила');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRls(null);
  };

  const handleResourceChange = (resourceId: string) => setSelectedResourceId(resourceId);

  const columns: Column<RoleRlsDto>[] = [
    createTextColumn('resourceCode', 'Код ресурса', { width: 150 }),
    createTextColumn('resourceName', 'Название ресурса', { width: 200 }),
    {
      key: 'filter',
      title: 'RLS',
      sortable: false,
      filterable: false,
      width: 250,
      minWidth: 20,
      render: (value: unknown) => {
        let displayText = '';
        if (value === null || value === undefined) {
          displayText = '';
        } else if (typeof value === 'object') {
          try {
            displayText = JSON.stringify(value);
          } catch {
            displayText = String(value);
          }
        } else {
          displayText = String(value);
        }
        return (
          <div className='truncate min-w-0' title={displayText} style={{ minWidth: '0' }}>
            <code className='text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded dark:text-gray-200'>
              {displayText}
            </code>
          </div>
        );
      },
    },
    createDateTimeColumn('createdAt', 'Создано', { width: 120 }),
    createActionsColumn(row => [
      { action: 'edit', label: 'Редактировать', onClick: () => handleEditRlsRule(row.resourceId) },
      { action: 'delete', label: 'Удалить', onClick: () => handleDeleteRlsRule(row.id) },
    ]),
  ];

  const activeFilterCount = Object.keys(savedState?.filters || {}).length;
  const skeletonRowCount = serverMeta?.pagination?.size || 5;

  const renderCard = useCallback(
    (rls: RoleRlsDto) => (
      <RoleRlsCard rls={rls} onEdit={handleEditRlsRule} onDelete={handleDeleteRlsRule} />
    ),
    [handleEditRlsRule, handleDeleteRlsRule],
  );

  return (
    <TableWithStates
      permissionsLoading={false}
      isLoadingState={false}
      error={error}
      onRetry={refresh}
      entityName='RLS правил'
      isLoadingData={false}
    >
      <div className='relative w-full p-4 space-y-4'>
        <RoleSelectorWithActions
          roles={availableRoles}
          selectedRoleId={selectedRoleId}
          onRoleChange={handleRoleChange}
          onAddClick={handleCreateRlsRule}
          addButtonText='Добавить RLS'
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
              emptyMessage='RLS правила не найдены'
              resizable={true}
              resizeSensitivity={1}
              minColumnWidth={20}
              className='w-full'
              caption={`RLS правила для роли: ${selectedRoleCode}`}
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
              Выберите роль для просмотра RLS правил
            </div>
          </div>
        )}
      </div>

      <RlsFilterModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveRlsRule}
        roleId={selectedRoleId}
        roleName={selectedRoleCode}
        existingRls={editingRls}
        mode={editingRls ? 'edit' : 'create'}
        isLoading={isSubmitting}
        selectedResourceId={editingRls ? editingRls.resourceId : selectedResourceId}
        onResourceChange={handleResourceChange}
      />
      <DeleteConfirmationModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, roleRlsId: null })}
        onConfirm={handleConfirmDelete}
        userLogin={''}
        isLoading={actionLoading}
      />
    </TableWithStates>
  );
};
