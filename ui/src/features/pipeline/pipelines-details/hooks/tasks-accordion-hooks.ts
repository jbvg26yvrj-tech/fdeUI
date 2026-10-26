import { useContext } from 'react';

import type { Task } from '../../types/Types';
import { createContext } from 'react';

// Контекст для всего аккордеона
export interface TasksAccordionContextType {
  openStates: Record<number, boolean>;
  toggleItem: (index: number) => void;
  setAllOpenStates: (states: Record<number, boolean>) => void;
}

export const TasksAccordionContext = createContext<TasksAccordionContextType | undefined>(
  undefined,
);

export interface TaskItemContextType {
  isOpen: boolean;
  toggleItem: () => void;
  task: Task;
}

export const TaskItemContext = createContext<TaskItemContextType | undefined>(undefined);

export const useTaskItem = () => {
  const context = useContext(TaskItemContext);
  if (context === undefined) {
    throw new Error('useTaskItem must be used within a TaskItem');
  }
  return context;
};

export const useTasksAccordion = () => {
  const context = useContext(TasksAccordionContext);
  if (context === undefined) {
    throw new Error('useTasksAccordion must be used within a TasksAccordion');
  }
  return context;
};

// Компонент для отдельной задачи
export interface TaskItemProps {
  index: number;
  task: Task;
  children: React.ReactNode;
  isExpanded?: boolean;
}
