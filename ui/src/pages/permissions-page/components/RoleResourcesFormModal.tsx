import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Checkbox } from '../../../shared/ui/Checkbox';
import type { ResourceDto, ResourceType } from '../../../features/permissions/types/types';
import { resourcesApi } from '../../../features/permissions/api/resourcesApi';
import { roleResourceApi } from '../../../features/permissions/api/roleResourceApi';

interface RoleResourcesFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { resourceIds: string[] }) => void;
  roleId: string;
  isLoading?: boolean;
}

// Варианты типов для фильтра
const resourceTypeOptions = [
  { value: '', label: 'Все типы' },
  { value: 'PAGE', label: 'Страница' },
  { value: 'BUTTON', label: 'Кнопка' },
  { value: 'API', label: 'API' },
  { value: 'TABLE', label: 'Таблица' },
  { value: 'MENU', label: 'Меню' },
  { value: 'GLOBAL', label: 'Глобальный' },
];

export const RoleResourcesFormModal: React.FC<RoleResourcesFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  roleId,
  isLoading = false,
}) => {
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [allResources, setAllResources] = useState<ResourceDto[]>([]);
  const [existingResourceIds, setExistingResourceIds] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<ResourceType | ''>('');
  const [loadingResources, setLoadingResources] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, roleId]);

  // Сброс выбранных при смене типа
  const handleTypeChange = (type: ResourceType | '') => {
    setSelectedType(type);
    setSelectedResourceIds([]);
  };

  const loadData = async () => {
    setLoadingResources(true);
    setLoadingExisting(true);
    setError(null);

    try {
      // Загружаем все ресурсы системы (returns ResourceDto[])
      const allResourcesList = await resourcesApi.getAllResources();

      // Загружаем уже назначенные ресурсы для этой роли (returns ResourceDto[])
      const assignedResources = await roleResourceApi.getAssignedPermissions(roleId);

      setAllResources(allResourcesList);
      setExistingResourceIds(assignedResources.map((r: ResourceDto) => r.id));
      setSelectedResourceIds([]);
      setSelectedType(''); // сброс фильтра при открытии
    } catch (err) {
      setError('Не удалось загрузить данные');
      console.error('Failed to load data:', err);
    } finally {
      setLoadingResources(false);
      setLoadingExisting(false);
    }
  };

  // Фильтрация по типу
  const filteredByType = useMemo(() => {
    if (!selectedType) return allResources;
    return allResources.filter(r => r.type === selectedType);
  }, [allResources, selectedType]);

  console.log('filteredByType=', filteredByType);

  // Доступные для добавления ресурсы (ещё не в роли)
  const availableResources = filteredByType.filter(
    resource => !existingResourceIds.includes(resource.id),
  );

  const handleResourceToggle = (resourceId: string) => {
    setSelectedResourceIds(prev =>
      prev.includes(resourceId) ? prev.filter(id => id !== resourceId) : [...prev, resourceId],
    );
  };

  const handleSelectAll = () => {
    if (selectedResourceIds.length === availableResources.length) {
      setSelectedResourceIds([]);
    } else {
      setSelectedResourceIds(availableResources.map(r => r.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedResourceIds.length === 0) {
      alert('Выберите хотя бы один ресурс');
      return;
    }
    onSave({ resourceIds: selectedResourceIds });
  };

  const handleConfirm = () => {
    const submitEvent = new Event('submit', { cancelable: true }) as unknown as React.FormEvent;
    handleSubmit(submitEvent);
  };

  const isLoadingAny = loadingResources || loadingExisting || isLoading;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title='Добавить ресурсы в роль'
      variant='confirm'
      size='md'
      showCloseButton={true}
      confirmText='Добавить'
      cancelText='Отмена'
      disableBackdropClick={isLoadingAny}
    >
      <form onSubmit={handleSubmit} className='space-y-3'>
        {/* Фильтр по типу ресурса */}
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
            Тип ресурса
          </label>
          <select
            value={selectedType}
            onChange={e => handleTypeChange(e.target.value as ResourceType | '')}
            className='block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm'
          >
            {resourceTypeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className='flex items-center justify-between text-sm'>
          <span className='text-gray-600 dark:text-gray-400'>
            Выбрано ресурсов:{' '}
            <span className='font-medium text-gray-900 dark:text-white'>
              {selectedResourceIds.length}
            </span>
          </span>
          {availableResources.length > 0 && (
            <button
              type='button'
              onClick={handleSelectAll}
              className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-colors'
            >
              {selectedResourceIds.length === availableResources.length
                ? 'Снять все'
                : 'Выбрать все'}
            </button>
          )}
        </div>

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
          ) : availableResources.length === 0 ? (
            <div className='text-center py-6 text-gray-500 dark:text-gray-400'>
              {allResources.length === 0
                ? 'Нет доступных ресурсов'
                : 'Все ресурсы выбранного типа уже добавлены в эту роль'}
            </div>
          ) : (
            <div className='overflow-y-auto max-h-80'>
              <div className='sticky top-0 bg-gray-50 dark:bg-gray-800 z-10 border-b border-gray-200 dark:border-gray-700'>
                <div className='grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider'>
                  <div className='col-span-2 text-center'>Выбрать</div>
                  <div className='col-span-5'>Код ресурса</div>
                  <div className='col-span-5'>Название ресурса</div>
                </div>
              </div>

              {availableResources.map(resource => (
                <div
                  key={resource.id}
                  className='grid grid-cols-12 gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0 items-center transition-colors'
                >
                  <div className='col-span-2 flex justify-center'>
                    <Checkbox
                      checked={selectedResourceIds.includes(resource.id)}
                      onChange={() => handleResourceToggle(resource.id)}
                      inputSize='sm'
                    />
                  </div>
                  <div className='col-span-5'>
                    <div className='font-medium text-sm text-gray-900 dark:text-white'>
                      {resource.code}
                    </div>
                  </div>
                  <div className='col-span-5'>
                    <div className='text-sm text-gray-600 dark:text-gray-300'>{resource.name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!error && !isLoadingAny && availableResources.length > 0 && (
          <div className='text-xs text-gray-500 dark:text-gray-400 text-center'>
            Доступно для добавления: {availableResources.length}
          </div>
        )}
      </form>
    </Modal>
  );
};
