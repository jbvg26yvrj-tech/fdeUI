import type {
  TaskType,
  TaskProps,
  FtpsDownloadTaskProps,
  FtpsUploadTaskProps,
  FtpsDeleteTaskProps,
  MinioDownloadTaskProps,
  MinioUploadTaskProps,
  MinioDeleteTaskProps,
  SftpDownloadTaskProps,
  SftpUploadTaskProps,
  SftpDeleteTaskProps,
  SmbDownloadTaskProps,
  SmbUploadTaskProps,
  SmbDeleteTaskProps,
} from './TaskTypes';

export interface Task {
  id: number;
  taskOrder: number;
  typeCode: TaskType;
  props: Record<string, string>;
  typedProps?: TaskProps;
}

export interface PipelineData {
  id: string;
  pipelineName: string;
  clientFrom: string;
  clientTo: string;
  primaryDatacenter: string;
  allOrNothing: boolean;
  tasks: Task[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SimplePipelineData {
  id: string;
  pipelineName: string;
  clientFrom: string;
  clientTo: string;
  primaryDatacenter: string;
  allOrNothing: boolean;
  tasksCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Функции для приведения типов (type guards)
export const isFtpsDownloadTask = (
  task: Task,
): task is Task & { typedProps: FtpsDownloadTaskProps } => task.typeCode === 'FtpsDownloadTask';

export const isFtpsUploadTask = (task: Task): task is Task & { typedProps: FtpsUploadTaskProps } =>
  task.typeCode === 'FtpsUploadTask';

export const isFtpsDeleteTask = (task: Task): task is Task & { typedProps: FtpsDeleteTaskProps } =>
  task.typeCode === 'FtpsDeleteTask';

export const isMinioDownloadTask = (
  task: Task,
): task is Task & { typedProps: MinioDownloadTaskProps } => task.typeCode === 'MinioDownloadTask';

export const isMinioUploadTask = (
  task: Task,
): task is Task & { typedProps: MinioUploadTaskProps } => task.typeCode === 'MinioUploadTask';

export const isMinioDeleteTask = (
  task: Task,
): task is Task & { typedProps: MinioDeleteTaskProps } => task.typeCode === 'MinioDeleteTask';

export const isSftpDownloadTask = (
  task: Task,
): task is Task & { typedProps: SftpDownloadTaskProps } => task.typeCode === 'SftpDownloadTask';

export const isSftpUploadTask = (task: Task): task is Task & { typedProps: SftpUploadTaskProps } =>
  task.typeCode === 'SftpUploadTask';

export const isSftpDeleteTask = (task: Task): task is Task & { typedProps: SftpDeleteTaskProps } =>
  task.typeCode === 'SftpDeleteTask';

export const isSmbDownloadTask = (
  task: Task,
): task is Task & { typedProps: SmbDownloadTaskProps } => task.typeCode === 'SmbDownloadTask';

export const isSmbUploadTask = (task: Task): task is Task & { typedProps: SmbUploadTaskProps } =>
  task.typeCode === 'SmbUploadTask';

export const isSmbDeleteTask = (task: Task): task is Task & { typedProps: SmbDeleteTaskProps } =>
  task.typeCode === 'SmbDeleteTask';
