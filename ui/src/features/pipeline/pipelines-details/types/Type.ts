import type { Task } from '../../types/Types';

export type UUID = string;
export type DateTimeString = string;

export interface Client {
  id: UUID;
  code: string;
  protocol: string;
  description: string;
}

export interface TaskProp {
  id: number;
  key: string;
  value: string;
}

// Базовые пропсы для дочерних компонентов
export interface TaskChildProps {
  isOpen?: boolean;
  toggleItem?: () => void;
  task?: Task;
}
