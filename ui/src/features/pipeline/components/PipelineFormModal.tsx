import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Input } from '../../../shared/ui/Input';
import { Select } from '../../../shared/ui/Select';
import { Button } from '../../../shared/ui/Button';
import Checkbox from '../../../shared/ui/Checkbox';
import type { TaskType } from '../types/TaskTypes';
import type { PipelineData } from '../types/Types';
import { pipelinesCrudApi } from '../api/pipelinesCrudApi';

const TASK_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'SftpDownloadTask', label: 'SFTP Download' },
  { value: 'SftpUploadTask', label: 'SFTP Upload' },
  { value: 'SftpDeleteTask', label: 'SFTP Delete' },
  { value: 'SmbDownloadTask', label: 'SMB Download' },
  { value: 'SmbUploadTask', label: 'SMB Upload' },
  { value: 'SmbDeleteTask', label: 'SMB Delete' },
  { value: 'FtpsDownloadTask', label: 'FTPS Download' },
  { value: 'FtpsUploadTask', label: 'FTPS Upload' },
  { value: 'FtpsDeleteTask', label: 'FTPS Delete' },
  { value: 'MinioDownloadTask', label: 'MinIO Download' },
  { value: 'MinioUploadTask', label: 'MinIO Upload' },
  { value: 'MinioDeleteTask', label: 'MinIO Delete' },
];

const MASK_TYPE_OPTIONS = [
  { value: 'GLOB', label: 'GLOB' },
  { value: 'REGEX', label: 'REGEX' },
];

const BOOLEAN_KEYS = new Set(['recursive', 'preserveStructure']);
const SELECT_KEYS: Record<string, Array<{ value: string; label: string }>> = {
  maskType: MASK_TYPE_OPTIONS,
};

const PROP_LABELS: Record<string, string> = {
  sourceDir: 'Директория источника',
  targetDir: 'Директория назначения',
  fileMask: 'Маска файлов',
  maskType: 'Тип маски',
  recursive: 'Рекурсивный обход',
  preserveStructure: 'Сохранять структуру',
};


interface TaskFormData {
  id: string;
  taskOrder: number;
  typeCode: TaskType;
  props: Array<{ key: string; value: string }>;
}

interface PipelineFormValues {
  pipelineName: string;
  clientFrom: string;
  clientTo: string;
  primaryDatacenter: string;
  allOrNothing: boolean;
  tasks: TaskFormData[];
}

interface PipelineFormSaveValues {
  pipelineName: string;
  clientFrom: string;
  clientTo: string;
  primaryDatacenter: string;
  allOrNothing: boolean;
  tasks: Array<{
    id: string;
    taskOrder: number;
    typeCode: TaskType;
    props: Array<{ key: string; value: string }>;
  }>;
}

interface PipelineFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: PipelineFormSaveValues) => void;
  pipeline?: PipelineData | null;
  mode: 'create' | 'edit';
  isLoading?: boolean;
}

let taskIdCounter = 0;
const nextTaskId = () => `task-${++taskIdCounter}`;

const defaultPropsForKeys = (keys: string[]): Array<{ key: string; value: string }> =>
  keys.map(k => ({
    key: k,
    value: BOOLEAN_KEYS.has(k) ? 'false' : SELECT_KEYS[k] ? SELECT_KEYS[k][0].value : '',
  }));

const createEmptyTask = (order: number): TaskFormData => ({
  id: nextTaskId(),
  taskOrder: order,
  typeCode: 'SftpDownloadTask',
  props: [],
});

const pipelineToFormValues = (pipeline: PipelineData): PipelineFormValues => ({
  pipelineName: pipeline.pipelineName,
  clientFrom: pipeline.clientFrom,
  clientTo: pipeline.clientTo,
  primaryDatacenter: pipeline.primaryDatacenter || 'SP',
  allOrNothing: pipeline.allOrNothing,
  tasks: pipeline.tasks
    .sort((a, b) => a.taskOrder - b.taskOrder)
    .map(task => ({
      id: nextTaskId(),
      taskOrder: task.taskOrder,
      typeCode: task.typeCode,
      props: Object.entries(task.props || {}).map(([key, value]) => ({ key, value })),
    })),
});

const DATACENTER_OPTIONS = [
  { value: 'SP', label: 'SP (SouthPort)' },
  { value: 'SC', label: 'SC (SberCloud)' },
];

const defaultFormValues: PipelineFormValues = {
  pipelineName: '',
  clientFrom: '',
  clientTo: '',
  primaryDatacenter: 'SP',
  allOrNothing: false,
  tasks: [],
};

export const PipelineFormModal: React.FC<PipelineFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  pipeline,
  mode,
  isLoading = false,
}) => {
  const [values, setValues] = useState<PipelineFormValues>(defaultFormValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && pipeline) {
        setValues(pipelineToFormValues(pipeline));
      } else {
        setValues({ ...defaultFormValues, tasks: [] });
      }
      setErrors({});
    }
  }, [isOpen, mode, pipeline]);

  const handleFieldChange = useCallback(
    (field: keyof PipelineFormValues, value: string | boolean) => {
      setValues(prev => ({ ...prev, [field]: value }));
      setErrors(prev => {
        if (prev[field]) {
          const next = { ...prev };
          delete next[field];
          return next;
        }
        return prev;
      });
    },
    [],
  );

  const fetchAndFillProps = useCallback((taskId: string, typeCode: string) => {
    pipelinesCrudApi.getTaskProps(typeCode).then(data => {
      const keys = [...data.required, ...data.optional];
      setValues(prev => ({
        ...prev,
        tasks: prev.tasks.map(t =>
          t.id === taskId
            ? { ...t, typeCode: typeCode as TaskType, props: defaultPropsForKeys(keys) }
            : t,
        ),
      }));
    }).catch(() => {
      setValues(prev => ({
        ...prev,
        tasks: prev.tasks.map(t =>
          t.id === taskId ? { ...t, typeCode: typeCode as TaskType, props: [] } : t,
        ),
      }));
    });
  }, []);

  const handleAddTask = useCallback(() => {
    setValues(prev => {
      const nextOrder =
        prev.tasks.length > 0 ? Math.max(...prev.tasks.map(t => t.taskOrder)) + 1 : 1;
      const newTask = createEmptyTask(nextOrder);
      // Fire async fetch; will update state when resolved
      fetchAndFillProps(newTask.id, newTask.typeCode);
      return {
        ...prev,
        tasks: [...prev.tasks, newTask],
      };
    });
  }, [fetchAndFillProps]);

  const handleRemoveTask = useCallback((taskId: string) => {
    setValues(prev => {
      const filtered = prev.tasks.filter(t => t.id !== taskId);
      const reordered = filtered.map((t, idx) => ({ ...t, taskOrder: idx + 1 }));
      return { ...prev, tasks: reordered };
    });
  }, []);

  const handleTaskTypeChange = useCallback((taskId: string, typeCode: string) => {
    fetchAndFillProps(taskId, typeCode);
  }, [fetchAndFillProps]);

  const handlePropValueChange = useCallback(
    (taskId: string, propIndex: number, newValue: string) => {
      setValues(prev => ({
        ...prev,
        tasks: prev.tasks.map(t =>
          t.id === taskId
            ? {
                ...t,
                props: t.props.map((p, i) =>
                  i === propIndex ? { ...p, value: newValue } : p,
                ),
              }
            : t,
        ),
      }));
    },
    [],
  );

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!values.pipelineName.trim()) {
      newErrors.pipelineName = 'Название пайплайна обязательно';
    }
    if (!values.clientFrom.trim()) {
      newErrors.clientFrom = 'Клиент-источник обязателен';
    }
    if (!values.clientTo.trim()) {
      newErrors.clientTo = 'Клиент-получатель обязателен';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave(values);
  };

  const title = mode === 'create' ? 'Создание пайплайна' : 'Редактирование пайплайна';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant='custom'
      size='xl'
      showCloseButton={true}
      disableBackdropClick={isLoading}
      maxHeight='90vh'
      footer={
        <div className='flex justify-end space-x-2'>
          <Button variant='outlined' size='sm' onClick={onClose} disabled={isLoading}>
            Отмена
          </Button>
          <Button variant='primary' size='sm' onClick={handleSubmit} disabled={isLoading}>
            {isLoading
              ? 'Сохранение...'
              : mode === 'create'
                ? 'Создать'
                : 'Сохранить'}
          </Button>
        </div>
      }
    >
      <div className='space-y-4'>
        {/* Pipeline fields */}
        <div className='grid grid-cols-2 gap-4'>
          <Input
            label='Название'
            value={values.pipelineName}
            onChange={e => handleFieldChange('pipelineName', e.target.value)}
            error={errors.pipelineName}
            required
          />
          <Select
            label='Датацентр'
            value={values.primaryDatacenter}
            onChange={e => handleFieldChange('primaryDatacenter', e.target.value)}
            options={DATACENTER_OPTIONS}
          />
        </div>
        <div className='grid grid-cols-2 gap-4'>
          <Input
            label='Клиент-источник'
            value={values.clientFrom}
            onChange={e => handleFieldChange('clientFrom', e.target.value)}
            error={errors.clientFrom}
            required
          />
          <Input
            label='Клиент-получатель'
            value={values.clientTo}
            onChange={e => handleFieldChange('clientTo', e.target.value)}
            error={errors.clientTo}
            required
          />
          <Checkbox
            label='Все или ничего'
            checked={values.allOrNothing}
            onChange={e => handleFieldChange('allOrNothing', e.target.checked)}
            error={errors.allOrNothing}
            required
          />
        </div>

        {/* Tasks section */}
        <div className='border-t border-gray-200 dark:border-gray-700 pt-4'>
          <div className='flex items-center justify-between mb-3'>
            <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300'>
              Задачи ({values.tasks.length})
            </h3>
            <Button variant='outlined' size='sm' onClick={handleAddTask}>
              Добавить задачу
            </Button>
          </div>

          {values.tasks.length === 0 && (
            <p className='text-sm text-gray-400 dark:text-gray-500 text-center py-4'>
              Нет задач. Нажмите &laquo;Добавить задачу&raquo; для начала.
            </p>
          )}

          <div className='space-y-4'>
            {values.tasks.map(task => (
              <TaskEditor
                key={task.id}
                task={task}
                onTypeChange={handleTaskTypeChange}
                onRemove={handleRemoveTask}
                onPropValueChange={handlePropValueChange}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

/* ========= Task Editor Sub-component ========= */

interface TaskEditorProps {
  task: TaskFormData;
  onTypeChange: (taskId: string, typeCode: string) => void;
  onRemove: (taskId: string) => void;
  onPropValueChange: (taskId: string, propIndex: number, value: string) => void;
}

const TaskEditor: React.FC<TaskEditorProps> = React.memo(
  ({ task, onTypeChange, onRemove, onPropValueChange }) => {
    return (
      <div className='border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900'>
        {/* Task header */}
        <div className='flex items-center gap-3 mb-3'>
          <span className='text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap'>
            #{task.taskOrder}
          </span>
          <div className='flex-1'>
            <Select
              value={task.typeCode}
              onChange={e => onTypeChange(task.id, e.target.value)}
              options={TASK_TYPE_OPTIONS}
              inputSize='sm'
            />
          </div>
          <button
            type='button'
            onClick={() => onRemove(task.id)}
            className='text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 transition-colors'
            title='Удалить задачу'
          >
            <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
              />
            </svg>
          </button>
        </div>

        {/* Props section */}
        <div className='space-y-2'>
          <span className='text-xs text-gray-500 dark:text-gray-400'>Параметры</span>

          {task.props.length === 0 && (
            <p className='text-xs text-gray-400 dark:text-gray-500 italic'>
              Загрузка параметров...
            </p>
          )}

          {task.props.map((prop, propIndex) => (
            <PropField
              key={prop.key}
              propKey={prop.key}
              value={prop.value}
              onChange={val => onPropValueChange(task.id, propIndex, val)}
            />
          ))}
        </div>
      </div>
    );
  },
);

TaskEditor.displayName = 'TaskEditor';

/* ========= Individual Prop Field ========= */

interface PropFieldProps {
  propKey: string;
  value: string;
  onChange: (value: string) => void;
}

const PropField: React.FC<PropFieldProps> = React.memo(({ propKey, value, onChange }) => {
  const label = PROP_LABELS[propKey] || propKey;

  if (BOOLEAN_KEYS.has(propKey)) {
    return (
      <div className='flex items-center gap-3 py-1'>
        <label className='flex items-center gap-2 cursor-pointer'>
          <input
            type='checkbox'
            checked={value === 'true'}
            onChange={e => onChange(e.target.checked ? 'true' : 'false')}
            className='w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600'
          />
          <span className='text-sm text-gray-700 dark:text-gray-300'>{label}</span>
        </label>
      </div>
    );
  }

  if (SELECT_KEYS[propKey]) {
    return (
      <div className='flex items-center gap-3'>
        <span className='text-sm text-gray-600 dark:text-gray-400 w-2/5 flex-shrink-0'>
          {label}
        </span>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className='flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
        >
          {SELECT_KEYS[propKey].map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Text input (default)
  return (
    <div className='flex items-center gap-3'>
      <span className='text-sm text-gray-600 dark:text-gray-400 w-2/5 flex-shrink-0'>
        {label}
      </span>
      <input
        type='text'
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={label}
        className='flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
      />
    </div>
  );
});

PropField.displayName = 'PropField';
