import type { Task } from '../types/Types';
import type {
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
} from '../types/TaskTypes';

// Функция для преобразования задачи с типизированными свойствами
export const createTypedTask = (task: Task): Task & { typedProps: TaskProps } => {
  const propsObject = task.props;

  // Приведение через unknown для обхода проверки типов
  switch (task.typeCode) {
    case 'FtpsDownloadTask':
      return {
        ...task,
        typedProps: propsObject as unknown as FtpsDownloadTaskProps,
      };
    case 'FtpsUploadTask':
      return {
        ...task,
        typedProps: propsObject as unknown as FtpsUploadTaskProps,
      };
    case 'FtpsDeleteTask':
      return {
        ...task,
        typedProps: propsObject as unknown as FtpsDeleteTaskProps,
      };
    case 'MinioDownloadTask':
      return {
        ...task,
        typedProps: propsObject as unknown as MinioDownloadTaskProps,
      };
    case 'MinioUploadTask':
      return {
        ...task,
        typedProps: propsObject as unknown as MinioUploadTaskProps,
      };
    case 'MinioDeleteTask':
      return {
        ...task,
        typedProps: propsObject as unknown as MinioDeleteTaskProps,
      };
    case 'SftpDownloadTask':
      return {
        ...task,
        typedProps: propsObject as unknown as SftpDownloadTaskProps,
      };
    case 'SftpUploadTask':
      return {
        ...task,
        typedProps: propsObject as unknown as SftpUploadTaskProps,
      };
    case 'SftpDeleteTask':
      return {
        ...task,
        typedProps: propsObject as unknown as SftpDeleteTaskProps,
      };
    case 'SmbDownloadTask':
      return {
        ...task,
        typedProps: propsObject as unknown as SmbDownloadTaskProps,
      };
    case 'SmbUploadTask':
      return {
        ...task,
        typedProps: propsObject as unknown as SmbUploadTaskProps,
      };
    case 'SmbDeleteTask':
      return {
        ...task,
        typedProps: propsObject as unknown as SmbDeleteTaskProps,
      };
    default:
      // Для неизвестных типов возвращаем базовый объект
      return {
        ...task,
        typedProps: propsObject as unknown as TaskProps,
      };
  }
};

// Функция для получения группированных свойств задачи
export const getGroupedTaskProperties = (task: Task) => {
  const groups = {
    connection: {} as Record<string, string>,
    authentication: {} as Record<string, string>,
    files: {} as Record<string, string>,
    security: {} as Record<string, string>,
    other: {} as Record<string, string>,
  };

  Object.entries(task.props).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();

    if (
      lowerKey.includes('host') ||
      lowerKey.includes('port') ||
      lowerKey.includes('bucket') ||
      lowerKey.includes('share')
    ) {
      groups.connection[key] = value;
    } else if (
      lowerKey.includes('user') ||
      lowerKey.includes('pass') ||
      lowerKey.includes('key') ||
      lowerKey.includes('secret')
    ) {
      groups.authentication[key] = value;
    } else if (lowerKey.includes('dir') || lowerKey.includes('file') || lowerKey.includes('mask')) {
      groups.files[key] = value;
    } else if (lowerKey.includes('cert') || lowerKey.includes('pem') || lowerKey.includes('p12')) {
      groups.security[key] = value;
    } else {
      groups.other[key] = value;
    }
  });

  return groups;
};

// Функция для получения отображаемого имени свойства
export const getPropertyDisplayName = (key: string): string => {
  const displayNames: Record<string, string> = {
    username: 'Имя пользователя',
    password: 'Пароль',
    host: 'Хост',
    port: 'Порт',
    sourceDir: 'Исходная директория',
    targetDir: 'Целевая директория',
    fileMask: 'Маска файлов',
    ignoreProtectedZip: 'Игнорировать защищенные ZIP',
    srcDoneFile: 'Файл завершения источника',
    destDoneFile: 'Файл завершения назначения',
    p12Path: 'Путь к P12 сертификату',
    p12Password: 'Пароль P12 сертификата',
    accessKey: 'Ключ доступа',
    secretAccessKey: 'Секретный ключ',
    bucket: 'Бакет',
    certPath: 'Путь к сертификату',
    pemPassphrase: 'Парольная фраза PEM',
    pemPath: 'Путь к PEM файлу',
    domain: 'Домен',
    share: 'Общая папка',
  };

  return displayNames[key] || key;
};
