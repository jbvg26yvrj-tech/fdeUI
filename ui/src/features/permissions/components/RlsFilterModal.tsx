import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Modal } from '../../../shared/ui/Modal';
import { Select } from '../../../shared/ui/Select';
import type { RoleRlsDto, ResourceDto, RlsFilter } from '../types/types';
import { resourcesApi } from '../../../features/permissions/api/resourcesApi';

interface RlsFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (filter: RlsFilter, resourceId?: string) => void;
  roleId: string;
  roleName?: string;
  existingRls?: RoleRlsDto | null;
  mode: 'create' | 'edit';
  isLoading?: boolean;
  selectedResourceId: string;
  onResourceChange: (resourceId: string) => void;
}

export const RlsFilterModal: React.FC<RlsFilterModalProps> = ({
  isOpen,
  onClose,
  onSave,
  roleId,
  roleName,
  existingRls,
  mode,
  isLoading = false,
  selectedResourceId,
  onResourceChange,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, setFilter] = useState<RlsFilter>({
    conditions: [],
    logicalOperator: 'AND',
  });
  const [filterJson, setFilterJson] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [jsonError, setJsonError] = useState<string>('');
  const [showHelpModal, setShowHelpModal] = useState(false);

  const [resources, setResources] = useState<ResourceDto[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [resourcesError, setResourcesError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadResources();
    }
  }, [isOpen]);

  const loadResources = async () => {
    setIsLoadingResources(true);
    setResourcesError('');

    try {
      const resourcesList = await resourcesApi.getResourcesByType('TABLE');
      setResources(resourcesList);

      if (mode === 'create' && resourcesList.length > 0 && !selectedResourceId) {
        onResourceChange(resourcesList[0].id);
      }
    } catch {
      setResourcesError('Не удалось загрузить список ресурсов');
      toast.error('Не удалось загрузить список ресурсов');
    } finally {
      setIsLoadingResources(false);
    }
  };

  useEffect(() => {
    if (existingRls && mode === 'edit') {
      try {
        let filterData: RlsFilter;

        if (typeof existingRls.filter === 'string') {
          filterData = JSON.parse(existingRls.filter);
        } else {
          filterData = existingRls.filter as RlsFilter;
        }

        setFilter(filterData);
        setFilterJson(JSON.stringify(filterData, null, 2));
      } catch (error) {
        console.error('Error parsing existingRls.filter:', error);
        setFilter({ conditions: [], logicalOperator: 'AND' });
        setFilterJson('');
        toast.error('Ошибка при загрузке данных правила');
      }
    } else {
      setFilter({ conditions: [], logicalOperator: 'AND' });
      setFilterJson('');
    }
    setJsonError('');
  }, [existingRls, mode, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (mode === 'create' && !selectedResourceId) {
      newErrors.resourceId = 'Выберите ресурс';
      isValid = false;
    }

    if (!filterJson.trim()) {
      newErrors.filter = 'Условие RLS обязательно';
      isValid = false;
    } else {
      try {
        JSON.parse(filterJson);
        setJsonError('');
      } catch {
        setJsonError('Некорректный JSON формат');
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Пожалуйста, исправьте ошибки в форме');
      return;
    }

    try {
      const parsedFilter = JSON.parse(filterJson) as RlsFilter;
      const resourceIdToSave = mode === 'create' ? selectedResourceId : existingRls?.resourceId;
      onSave(parsedFilter, resourceIdToSave);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      setJsonError('Некорректный JSON формат');
      toast.error('Некорректный JSON формат');
    }
  };

  const handleJsonChange = (value: string) => {
    setFilterJson(value);

    if (errors.filter) {
      setErrors(prev => ({ ...prev, filter: '' }));
    }

    if (value.trim()) {
      try {
        const parsed = JSON.parse(value);
        setFilter(parsed);
        setJsonError('');
      } catch {
        // Не устанавливаем ошибку сразу, только при сабмите
      }
    }
  };

  const resourceOptions = useMemo(() => {
    if (isLoadingResources) {
      return [{ value: '', label: 'Загрузка ресурсов...', disabled: true }];
    }

    if (!resources || resources.length === 0) {
      return [{ value: '', label: 'Ресурсы не найдены', disabled: true }];
    }

    const options = resources.map(resource => ({
      value: resource.id,
      label: `${resource.name} (${resource.code})`,
    }));

    return [{ value: '', label: 'Выберите ресурс...', disabled: true }, ...options];
  }, [resources, isLoadingResources]);

  const handleConfirm = () => {
    const submitEvent = new Event('submit', { cancelable: true }) as unknown as React.FormEvent;
    handleSubmit(submitEvent);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        onConfirm={handleConfirm}
        title={mode === 'create' ? 'Создание RLS' : 'Редактирование RLS'}
        variant='confirm'
        size='lg'
        showCloseButton={true}
        confirmText={mode === 'create' ? 'Создать' : 'Сохранить'}
        cancelText='Отмена'
        disableBackdropClick={isLoading || isLoadingResources}
        additionalButtons={
          <button
            type='button'
            onClick={() => setShowHelpModal(true)}
            className='px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300'
            disabled={isLoading || isLoadingResources}
          >
            <span className='flex items-center'>
              <svg className='w-4 h-4 mr-1' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
              Справка
            </span>
          </button>
        }
      >
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='mb-2'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              <span className='font-medium dark:text-gray-300'>Роль:</span> {roleName || roleId}
            </p>
          </div>

          {mode === 'create' && (
            <div>
              <Select
                label='Ресурс'
                value={selectedResourceId}
                onChange={e => onResourceChange(e.target.value)}
                options={resourceOptions}
                error={errors.resourceId || resourcesError}
                required
                placeholder={isLoadingResources ? 'Загрузка ресурсов...' : 'Выберите ресурс'}
                disabled={isLoading || isLoadingResources}
              />
              {resourcesError && (
                <div className='mt-1'>
                  <p className='text-sm text-red-600 dark:text-red-400'>{resourcesError}</p>
                  <button
                    type='button'
                    onClick={loadResources}
                    className='mt-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline'
                  >
                    Повторить попытку
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === 'edit' && existingRls && (
            <div className='mb-2'>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                <span className='font-medium dark:text-gray-300'>Ресурс:</span>{' '}
                {existingRls.resourceName
                  ? `${existingRls.resourceName} (${existingRls.resourceCode})`
                  : existingRls.resourceId}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-500'>
                ID: {existingRls.resourceId}
              </p>
              <input type='hidden' value={existingRls.resourceId} />
            </div>
          )}

          <div>
            <div className='flex justify-between items-center mb-2'>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                Условие RLS (JSON) <span className='text-red-500 dark:text-red-400'>*</span>
              </label>
            </div>

            <textarea
              value={filterJson}
              onChange={e => handleJsonChange(e.target.value)}
              rows={12}
              className={`w-full font-mono text-sm px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
                errors.filter || jsonError
                  ? 'border-red-500 dark:border-red-400'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder={`{
  "conditions": [
    {
      "field": "fieldName",
      "operator": "eq",
      "value": "fieldValue"
    }
  ],
  "logicalOperator": "AND"
}`}
              disabled={isLoading || isLoadingResources}
            />

            {(errors.filter || jsonError) && (
              <p className='mt-1 text-sm text-red-600 dark:text-red-400'>
                {errors.filter || jsonError}
              </p>
            )}
          </div>
        </form>
      </Modal>

      <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
    </>
  );
};

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const jsonExamples = [
    {
      name: 'Фильтр по нескольким условиям pipelines',
      value: `{
  "conditions": [
    {
      "field": "clientFrom",
      "value": "ПЦ",
      "operator": "eq"
    },
    {
      "field": "clientTo",
      "value": "DWH",
      "operator": "eq"
    }
  ],
  "logicalOperator": "OR"
}`,
    },
    {
      name: 'Фильтр с импользованием join для sessions',
      value: `{
  "joins": [
    {
      "type": "inner",
      "alias": "p",
      "association": "pipeline"
    }
  ],
  "conditions": [
    {
      "field": "p.pipelineName",
      "value": "ryzkov-test",
      "operator": "like"
    }
  ],
  "logicalOperator": "AND"
}`,
    },
  ];

  const jsonFormat = `{
  "conditions": [
    {
      "field": "string",      // Название поля в таблице
      "operator": "string",   // Оператор сравнения (eq, ne, like)
      "value": "any"         // Значение для сравнения
    }
  ],
  "logicalOperator": "string" // AND или OR
}`;

  const operators = [
    { code: 'eq', description: 'Равно (=)' },
    { code: 'ne', description: 'Не равно (≠)' },
    { code: 'like', description: 'Содержит текст (используйте % для подстановки)' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title='Справка по формату RLS фильтра'
      size='xl'
      showCloseButton={true}
      confirmText='Закрыть'
      onConfirm={onClose}
      maxHeight='calc(90vh - 120px)'
    >
      <div className='space-y-6 overflow-y-auto pr-2'>
        <div>
          <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-3'>Формат JSON</h3>
          <div className='bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg font-mono'>
            <pre className='whitespace-pre-wrap text-sm'>{jsonFormat}</pre>
          </div>
          <div className='mt-3 text-sm text-gray-600 dark:text-gray-400'>
            <p className='font-medium mb-1 dark:text-gray-300'>Объяснение полей:</p>
            <ul className='list-disc pl-5 space-y-1 dark:text-gray-400'>
              <li>
                <span className='font-medium dark:text-gray-300'>conditions</span> - массив условий
                фильтрации
              </li>
              <li>
                <span className='font-medium dark:text-gray-300'>field</span> - имя поля в таблице,
                к которому применяется условие
              </li>
              <li>
                <span className='font-medium dark:text-gray-300'>operator</span> - оператор
                сравнения (см. список ниже)
              </li>
              <li>
                <span className='font-medium dark:text-gray-300'>value</span> - значение для
                сравнения (может быть строкой, числом, булевым значением или массивом)
              </li>
              <li>
                <span className='font-medium dark:text-gray-300'>logicalOperator</span> - логический
                оператор для объединения условий: "AND" (И) или "OR" (ИЛИ)
              </li>
            </ul>
          </div>
        </div>

        <div>
          <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-3'>
            Примеры условий
          </h3>
          <div className='space-y-4'>
            {jsonExamples.map((example, index) => (
              <div key={index} className='border dark:border-gray-700 rounded-lg overflow-hidden'>
                <div className='bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b dark:border-gray-700'>
                  <h4 className='font-medium text-gray-700 dark:text-gray-300'>{example.name}</h4>
                </div>
                <div className='bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 font-mono'>
                  <pre className='whitespace-pre-wrap text-sm'>{example.value}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-3'>
            Операторы сравнения
          </h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            {operators.map((operator, index) => (
              <div
                key={index}
                className='bg-gray-50 dark:bg-gray-800 p-3 rounded border dark:border-gray-700'
              >
                <code className='font-mono text-blue-700 dark:text-blue-300 text-sm font-medium'>
                  {operator.code}
                </code>
                <p className='text-gray-600 dark:text-gray-400 text-sm mt-1'>
                  {operator.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
          <h4 className='font-medium text-blue-900 dark:text-blue-300 mb-2'>Важные замечания</h4>
          <ul className='text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc pl-5'>
            <li>Все поля JSON чувствительны к регистру</li>
            <li>Значения строковых переменных должны быть заключены в двойные кавычки</li>
            <li>Булевы значения (true/false) пишутся без кавычек</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};
