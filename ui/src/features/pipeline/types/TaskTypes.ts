// Базовые интерфейсы для общих свойств
export interface BaseConnectionProps {
  host?: string;
  port?: string;
}

export interface BaseAuthProps {
  username?: string;
  password?: string;
}

export interface BaseFileOperationProps {
  sourceDir?: string;
  targetDir?: string;
  fileMask?: string;
  ignoreProtectedZip?: string;
  srcDoneFile?: string;
  destDoneFile?: string;
}

// FTPS задачи
export interface BaseFtpsProps extends BaseConnectionProps, BaseAuthProps {
  p12Path?: string;
  p12Password?: string;
}

export interface FtpsDownloadTaskProps extends BaseFtpsProps, BaseFileOperationProps {
  // Специфичные для Download
}

export interface FtpsUploadTaskProps extends BaseFtpsProps, BaseFileOperationProps {
  // Специфичные для Upload
}

export interface FtpsDeleteTaskProps extends BaseFtpsProps, BaseFileOperationProps {
  // Специфичные для Delete
}

// MinIO задачи
export interface BaseMinioProps extends BaseConnectionProps {
  accessKey?: string;
  secretAccessKey?: string;
  bucket?: string;
  certPath?: string;
}

export interface MinioDownloadTaskProps extends BaseMinioProps, BaseFileOperationProps {
  // Специфичные для Download
}

export interface MinioUploadTaskProps extends BaseMinioProps, BaseFileOperationProps {
  // Специфичные для Upload
}

export interface MinioDeleteTaskProps extends BaseMinioProps, BaseFileOperationProps {
  // Специфичные для Delete
}

// SFTP задачи
export interface BaseSftpProps extends BaseConnectionProps, BaseAuthProps {
  pemPath?: string;
  pemPassphrase?: string;
}

export interface SftpDownloadTaskProps extends BaseSftpProps, BaseFileOperationProps {
  // Специфичные для Download
}

export interface SftpUploadTaskProps extends BaseSftpProps, BaseFileOperationProps {
  // Специфичные для Upload
}

export interface SftpDeleteTaskProps extends BaseSftpProps, BaseFileOperationProps {
  // Специфичные для Delete
}

// SMB задачи
export interface BaseSmbProps extends BaseConnectionProps, BaseAuthProps {
  domain?: string;
  share?: string;
}

export interface SmbDownloadTaskProps extends BaseSmbProps, BaseFileOperationProps {
  // Специфичные для Download
}

export interface SmbUploadTaskProps extends BaseSmbProps, BaseFileOperationProps {
  // Специфичные для Upload
}

export interface SmbDeleteTaskProps extends BaseSmbProps, BaseFileOperationProps {
  // Специфичные для Delete
}

// Объединенный тип для всех свойств задач
export type TaskProps =
  | FtpsDownloadTaskProps
  | FtpsUploadTaskProps
  | FtpsDeleteTaskProps
  | MinioDownloadTaskProps
  | MinioUploadTaskProps
  | MinioDeleteTaskProps
  | SftpDownloadTaskProps
  | SftpUploadTaskProps
  | SftpDeleteTaskProps
  | SmbDownloadTaskProps
  | SmbUploadTaskProps
  | SmbDeleteTaskProps;

// Типы задач
export type TaskType =
  | 'FtpsDownloadTask'
  | 'FtpsUploadTask'
  | 'FtpsDeleteTask'
  | 'MinioDownloadTask'
  | 'MinioUploadTask'
  | 'MinioDeleteTask'
  | 'SftpDownloadTask'
  | 'SftpUploadTask'
  | 'SftpDeleteTask'
  | 'SmbDownloadTask'
  | 'SmbUploadTask'
  | 'SmbDeleteTask';

// Вспомогательные типы для определения типа операции
export type DownloadTaskType =
  | 'FtpsDownloadTask'
  | 'MinioDownloadTask'
  | 'SftpDownloadTask'
  | 'SmbDownloadTask';

export type UploadTaskType =
  | 'FtpsUploadTask'
  | 'MinioUploadTask'
  | 'SftpUploadTask'
  | 'SmbUploadTask';

export type DeleteTaskType =
  | 'FtpsDeleteTask'
  | 'MinioDeleteTask'
  | 'SftpDeleteTask'
  | 'SmbDeleteTask';

// Вспомогательные типы для определения протокола
export type FtpsTaskType = 'FtpsDownloadTask' | 'FtpsUploadTask' | 'FtpsDeleteTask';

export type MinioTaskType = 'MinioDownloadTask' | 'MinioUploadTask' | 'MinioDeleteTask';

export type SftpTaskType = 'SftpDownloadTask' | 'SftpUploadTask' | 'SftpDeleteTask';

export type SmbTaskType = 'SmbDownloadTask' | 'SmbUploadTask' | 'SmbDeleteTask';

// Хелперы для проверки типа задачи
export const isDownloadTask = (type: TaskType): type is DownloadTaskType =>
  type.endsWith('DownloadTask');

export const isUploadTask = (type: TaskType): type is UploadTaskType => type.endsWith('UploadTask');

export const isDeleteTask = (type: TaskType): type is DeleteTaskType => type.endsWith('DeleteTask');

export const isFtpsTask = (type: TaskType): type is FtpsTaskType => type.startsWith('Ftps');

export const isMinioTask = (type: TaskType): type is MinioTaskType => type.startsWith('Minio');

export const isSftpTask = (type: TaskType): type is SftpTaskType => type.startsWith('Sftp');

export const isSmbTask = (type: TaskType): type is SmbTaskType => type.startsWith('Smb');

// Функция для получения отображаемого имени типа задачи
export const getTaskTypeDisplayName = (type: TaskType): string => {
  const baseName = type.replace(/(Download|Upload|Delete)Task$/, '');
  const operation = type.includes('Download')
    ? 'Download'
    : type.includes('Upload')
      ? 'Upload'
      : 'Delete';

  return `${baseName} ${operation}`;
};

// Функция для получения иконки или цвета для типа задачи
export const getTaskTypeIcon = (type: TaskType): string => {
  if (isDownloadTask(type)) return '⬇️';
  if (isUploadTask(type)) return '⬆️';
  if (isDeleteTask(type)) return '🗑️';
  return '🔧';
};
