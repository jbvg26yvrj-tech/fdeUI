import type { TableApiResponse } from '../../../shared/types/types';
import type { UserDto } from '../../auth/types/types';

export type ResourceType = 'PAGE' | 'BUTTON' | 'API' | 'TABLE' | 'MENU' | 'GLOBAL';

export interface RoleDto {
  clientCodes?: string[];
  id: string;
  code: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateRoleRequest {
  clientCodes?: string[];
  code: string;
  name: string;
  description?: string;
}

export interface UpdateRoleRequest {
  clientCodes?: string[];
  name?: string;
  description?: string;
}

export interface ResourceDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: ResourceType;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateResourceRequest {
  code: string;
  name: string;
  description?: string;
  type: ResourceType;
}

/**
 * DTO разрешения роли (связь роль-ресурс).
 * Поля enabled и updatedAt удалены (бэкенд больше их не возвращает).
 * Информация о роли и ресурсе может быть подгружена через вложенные объекты.
 */
export interface RoleResourceDto {
  id: string;
  roleId: string;
  resourceId: string;
  resource?: ResourceDto;
  role?: RoleDto;
  createdAt: string;
}

/**
 * Запрос на массовое добавление/удаление ресурсов в/из роли.
 * Используется в методах addResourcesToRole и removeResourcesFromRole.
 */
export interface RoleResourceAssignmentRequest {
  /** Массив идентификаторов ресурсов (UUID в виде строк) */
  resourceIds: string[];
}

export interface AddUsersToRoleRequest {
  userIds: string[];
}

export interface RlsFilter {
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  logicalOperator: 'AND' | 'OR';
}

export interface RoleFilter {
  code?: string;
  name?: string;
  description?: string;
}

export interface ResourceFilter {
  code?: string;
  name?: string;
  description?: string;
  type?: string;
}

export interface RoleRlsFilter {
  roleId?: string;
  roleCode?: string;
  resourceId?: string;
  resourceCode?: string;
  resourceType?: string;
}

export interface RoleRlsDto {
  id: string;
  roleId: string;
  roleName?: string;
  resourceId: string;
  resourceName?: string;
  resourceCode?: string;
  filter: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Упрощённое представление разрешения для таблицы (пагинированный список).
 * Поля enabled и updatedAt удалены.
 */

export type RoleApiResponse = TableApiResponse<RoleDto>;
export type ResourceApiResponse = TableApiResponse<ResourceDto>;
export type UserApiResponse = TableApiResponse<UserDto>;
export type RlsApiResponse = TableApiResponse<RoleRlsDto>;
