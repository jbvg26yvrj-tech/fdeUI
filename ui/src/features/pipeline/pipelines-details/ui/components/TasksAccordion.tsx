import React, { useState, type ReactNode, useEffect } from 'react';
import type { Task } from '../../../types/Types';
import {
  TaskItemContext,
  TasksAccordionContext,
  useTaskItem,
  useTasksAccordion,
  type TaskItemContextType,
  type TasksAccordionContextType,
} from '../../hooks/tasks-accordion-hooks';
import { getGroupedTaskProperties, getPropertyDisplayName } from '../../../utils/taskUtils';
import { getTaskTypeDisplayName, getTaskTypeIcon } from '../../../types/TaskTypes';

interface TasksAccordionProps {
  children: ReactNode;
  className?: string;
  forceExpandAll?: boolean;
}

export const TasksAccordion: React.FC<TasksAccordionProps> = ({
  children,
  className = '',
  forceExpandAll = false,
}) => {
  const [openStates, setOpenStates] = useState<Record<number, boolean>>({});

  // Функция для переключения отдельного элемента
  const toggleItem = (index: number) => {
    setOpenStates(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Функция для установки всех состояний
  const setAllOpenStates = (states: Record<number, boolean>) => {
    setOpenStates(states);
  };

  // Эффект для обработки forceExpandAll
  useEffect(() => {
    if (forceExpandAll) {
      // Получаем все индексы из children
      const indexes = React.Children.toArray(children).reduce<Record<number, boolean>>(
        (acc, _, index) => {
          acc[index] = true;
          return acc;
        },
        {},
      );
      setOpenStates(indexes);
    } else {
      // Закрываем все элементы
      setOpenStates({});
    }
  }, [forceExpandAll, children]);

  const contextValue: TasksAccordionContextType = {
    openStates,
    toggleItem,
    setAllOpenStates,
  };

  return (
    <TasksAccordionContext.Provider value={contextValue}>
      <div className={`w-full space-y-3 ${className}`}>{children}</div>
    </TasksAccordionContext.Provider>
  );
};

export interface TaskItemProps {
  index: number;
  task: Task;
  children: React.ReactNode;
  isExpanded?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({ index, task, children }) => {
  const { openStates, toggleItem: toggleAccordion } = useTasksAccordion();
  const isOpen = openStates[index] || false;

  const toggleItem = () => {
    toggleAccordion(index);
  };

  const contextValue: TaskItemContextType = {
    isOpen,
    toggleItem,
    task,
  };

  return (
    <TaskItemContext.Provider value={contextValue}>
      <div className='border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm transition-all duration-200 hover:shadow-md'>
        {children}
      </div>
    </TaskItemContext.Provider>
  );
};

export const TaskHeader: React.FC = () => {
  const { isOpen, toggleItem, task } = useTaskItem();

  return (
    <button
      className='flex justify-between items-center w-full p-4 text-left font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200'
      onClick={toggleItem}
      aria-expanded={isOpen}
    >
      <div className='flex items-center space-x-4'>
        <span className='flex items-center justify-center w-8 h-8 bg-blue-500 dark:bg-blue-600 text-white text-sm font-semibold rounded-full'>
          {task.taskOrder}
        </span>
        <div className='text-left'>
          <div className='text-gray-900 dark:text-white font-semibold'>{task.typeCode}</div>
          <div className='text-sm text-gray-500 dark:text-gray-400'>ID: {task.id}</div>
        </div>
      </div>
      <svg
        className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        fill='none'
        viewBox='0 0 24 24'
        stroke='currentColor'
      >
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
      </svg>
    </button>
  );
};

export const TaskContent: React.FC = () => {
  const { isOpen, task } = useTaskItem();

  if (!isOpen) return null;

  const groupedProperties = getGroupedTaskProperties(task);

  return (
    <div className='px-4 pb-4 animate-fade-in'>
      <div className='border-t border-gray-100 dark:border-gray-700 pt-4'>
        <div className='flex items-center justify-between mb-4'>
          <h4 className='text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide'>
            Свойства задачи
          </h4>
          <div className='flex items-center space-x-2'>
            <span className='text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-1 rounded'>
              {getTaskTypeIcon(task.typeCode)} {getTaskTypeDisplayName(task.typeCode)}
            </span>
          </div>
        </div>

        {/* Группированные свойства */}
        {Object.entries(groupedProperties).map(([groupName, properties]) => {
          if (Object.keys(properties).length === 0) return null;

          const groupTitles: Record<string, string> = {
            connection: 'Подключение',
            authentication: 'Аутентификация',
            files: 'Файлы и директории',
            security: 'Безопасность',
            other: 'Другие параметры',
          };

          return (
            <div key={groupName} className='mb-4 last:mb-0'>
              <h5 className='text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2'>
                {groupTitles[groupName] || groupName}
              </h5>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                {Object.entries(properties).map(([key, value]) => (
                  <div
                    key={key}
                    className='flex items-start bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3'
                  >
                    <div className='flex-shrink-0 w-2/5 pr-3'>
                      <span className='text-xs font-medium text-gray-600 dark:text-gray-400'>
                        {getPropertyDisplayName(key)}
                      </span>
                    </div>
                    <div className='flex-1 min-w-0'>
                      <span className='text-sm text-gray-800 dark:text-gray-200 font-mono break-words'>
                        {value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
