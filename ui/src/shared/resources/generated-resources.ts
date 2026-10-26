// AUTO-GENERATED FILE - DO NOT EDIT
// Этот файл генерируется автоматически на основе данных из базы данных
// Последняя генерация: 2026-02-05T09:36:04.955Z
// Всего ресурсов: 21
// Сгенерировано из API: http://localhost:5002

import type { Resource, ResourceType } from './static-resources';

export const SYS_TABLE_RESOURCES = {
  TABLE_PIPELINES: {
    code: 'table.pipelines',
    name: 'Таблица пайплайнов',
    type: 'TABLE',
    description: 'Таблица с описанием пайплайнов',
  },
  TABLE_ROLE_RESOURCES: {
    code: 'table.role-resources',
    name: 'Таблица разрешений ролей',
    type: 'TABLE',
    description: 'Таблица связи между ролями и ресурсами',
  },
  TABLE_ROLE_USERS: {
    code: 'table.role-users',
    name: 'Таблица пользователей в роли',
    type: 'TABLE',
    description: 'Таблица связи между ролями и пользователями',
  },
  TABLE_ROLES: {
    code: 'table.roles',
    name: 'Таблица ролей',
    type: 'TABLE',
    description: 'Таблица ролей',
  },
  TABLE_USERS: {
    code: 'table.users',
    name: 'Таблица пользователей',
    type: 'TABLE',
    description: 'Таблица пользователей',
  },
  TABLE_RLS: {
    code: 'table.rls',
    name: 'Таблица доступа записей',
    type: 'TABLE',
    description: 'Таблица доступа на уровлен записей (RLS)',
  },
  TABLE_RESOURCES: {
    code: 'table.resources',
    name: 'Таблица ресурсов',
    type: 'TABLE',
    description: 'Таблица ресурсов',
  },
  TABLE_SESSIONS: {
    code: 'table.sessions',
    name: 'Таблица сессий',
    type: 'TABLE',
    description: 'Таблица с сессиями пайплайнов',
  },
  TABLE_SESSION_PROGRESS: {
    code: 'table.session-progress',
    name: 'Таблица прогресса сессии',
    type: 'TABLE',
    description: 'Таблица прогресса выполнения сессий',
  },
} as const;

export const SYS_PAGE_RESOURCES = {
  PAGE_PIPELINES: {
    code: 'page.pipelines',
    name: 'Страница пайплайнов',
    type: 'PAGE',
    description: 'Страница управления пайплайнами',
  },
  PAGE_SESSIONS: {
    code: 'page.sessions',
    name: 'Страница сессий',
    type: 'PAGE',
    description: 'Страница просмотра сессий',
  },
  PAGE_USERS: {
    code: 'page.users',
    name: 'Страница пользователей',
    type: 'PAGE',
    description: 'Страница управления пользователями',
  },
  PAGE_PERMISSIONS: {
    code: 'page.permissions',
    name: 'Страница прав доступа',
    type: 'PAGE',
    description: 'Страница управления правами доступа',
  },
  PAGE_PIPELINE_DETAILS: {
    code: 'page.pipeline-details',
    name: 'Страница детальных данных пайплайна',
    type: 'PAGE',
    description: 'Страница детальных данных пайплайна',
  },
  PAGE_SESSION_PROGRESS: {
    code: 'page.session-progress',
    name: 'Страница прогресса сессии',
    type: 'PAGE',
    description: 'Страница прогресса выполнения сессий',
  },
} as const;

export const SYS_MENU_RESOURCES = {
  MENU_PIPELINE_SCHEDULE: {
    code: 'menu.pipeline.schedule',
    name: 'Включить в расписание',
    type: 'MENU',
    description: 'Включить пайплайн в расписание',
  },
  MENU_PIPELINE_UNSCHEDULE: {
    code: 'menu.pipeline.unschedule',
    name: 'Исключить из расписания',
    type: 'MENU',
    description: 'Исключить пайплайни из расписания',
  },
  MENU_PIPELINE_DETAILS: {
    code: 'menu.pipeline.details',
    name: 'Детальная информация',
    type: 'MENU',
    description: 'Детальная информация о пайплайне',
  },
  MENU_SESSION_PROGRESS_OPEN: {
    code: 'menu.session-progress.open',
    name: 'Посмотр прогресса сессии',
    type: 'MENU',
    description: 'Посмотр прогресса сессии',
  },
  MENU_SESSION_PROGRESS_DETAILS: {
    code: 'menu.session-progress.details',
    name: 'Детальная информация прогресса сессии',
    type: 'MENU',
    description: 'Детельная информация прогресса сессии',
  },
  MENU_SESSIONS_OPEN: {
    code: 'menu.sessions.open',
    name: 'Информация о сессии',
    type: 'MENU',
    description: 'Информация о сессии',
  },
  MENU_PIPELINE_CREATE: {
    code: 'api.pipelines.create',
    name: 'Создание пайплайна',
    type: 'MENU',
    description: 'Создание нового пайплайна',
  },
  MENU_PIPELINE_UPDATE: {
    code: 'api.pipelines.update',
    name: 'Редактирование пайплайна',
    type: 'MENU',
    description: 'Редактирование существующего пайплайна',
  },
  MENU_PIPELINE_DELETE: {
    code: 'api.pipelines.delete',
    name: 'Удаление пайплайна',
    type: 'MENU',
    description: 'Удаление пайплайна',
  },
} as const;

export const ALL_RESOURCES = {
  ...SYS_TABLE_RESOURCES,
  ...SYS_PAGE_RESOURCES,
  ...SYS_MENU_RESOURCES,
} as const;

export type ResourceCode = (typeof ALL_RESOURCES)[keyof typeof ALL_RESOURCES]['code'];
export type TableResourceCode =
  (typeof SYS_TABLE_RESOURCES)[keyof typeof SYS_TABLE_RESOURCES]['code'];
export type PageResourceCode = (typeof SYS_PAGE_RESOURCES)[keyof typeof SYS_PAGE_RESOURCES]['code'];
export type MenuResourceCode = (typeof SYS_MENU_RESOURCES)[keyof typeof SYS_MENU_RESOURCES]['code'];

export const TABLE_PIPELINES = 'table.pipelines' as const;
export const PAGE_PIPELINES = 'page.pipelines' as const;
export const PAGE_SESSIONS = 'page.sessions' as const;
export const PAGE_USERS = 'page.users' as const;
export const PAGE_PERMISSIONS = 'page.permissions' as const;
export const PAGE_PIPELINE_DETAILS = 'page.pipeline-details' as const;
export const MENU_PIPELINE_SCHEDULE = 'menu.pipeline.schedule' as const;
export const MENU_PIPELINE_UNSCHEDULE = 'menu.pipeline.unschedule' as const;
export const MENU_PIPELINE_DETAILS = 'menu.pipeline.details' as const;
export const TABLE_ROLE_RESOURCES = 'table.role-resources' as const;
export const TABLE_ROLE_USERS = 'table.role-users' as const;
export const TABLE_ROLES = 'table.roles' as const;
export const TABLE_USERS = 'table.users' as const;
export const TABLE_RLS = 'table.rls' as const;
export const TABLE_RESOURCES = 'table.resources' as const;
export const PAGE_SESSION_PROGRESS = 'page.session-progress' as const;
export const TABLE_SESSIONS = 'table.sessions' as const;
export const TABLE_SESSION_PROGRESS = 'table.session-progress' as const;
export const MENU_SESSION_PROGRESS_OPEN = 'menu.session-progress.open' as const;
export const MENU_SESSION_PROGRESS_DETAILS = 'menu.session-progress.details' as const;
export const MENU_SESSIONS_OPEN = 'menu.sessions.open' as const;
export const API_PIPELINES_CREATE = 'api.pipelines.create' as const;
export const API_PIPELINES_UPDATE = 'api.pipelines.update' as const;
export const API_PIPELINES_DELETE = 'api.pipelines.delete' as const;

export type SpecificResourceCode =
  | 'table.pipelines'
  | 'page.pipelines'
  | 'page.sessions'
  | 'page.users'
  | 'page.permissions'
  | 'page.pipeline-details'
  | 'menu.pipeline.schedule'
  | 'menu.pipeline.unschedule'
  | 'menu.pipeline.details'
  | 'table.role-resources'
  | 'table.role-users'
  | 'table.roles'
  | 'table.users'
  | 'table.rls'
  | 'table.resources'
  | 'page.session-progress'
  | 'table.sessions'
  | 'table.session-progress'
  | 'menu.session-progress.open'
  | 'menu.session-progress.details'
  | 'menu.sessions.open'
  | 'api.pipelines.create'
  | 'api.pipelines.update'
  | 'api.pipelines.delete';

export function isResourceCode(code: string): code is ResourceCode {
  return Object.values(ALL_RESOURCES).some(resource => resource.code === code);
}

export function getResourceByCode(code: string): Resource | undefined {
  return Object.values(ALL_RESOURCES).find(resource => resource.code === code);
}

export function getResourcesByType(type: ResourceType): Resource[] {
  return Object.values(ALL_RESOURCES).filter(resource => resource.type === type);
}

export function getAllResourceCodes(): string[] {
  return Object.values(ALL_RESOURCES).map(resource => resource.code);
}
