export type ResourceType = 'TABLE' | 'PAGE' | 'MENU' | 'API' | 'GLOBAL';

export interface Resource {
  code: string;
  name: string;
  type: ResourceType;
  description?: string;
}

export const PermissionActions = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  RUN: 'run',
  STOP: 'stop',
  CLICK: 'click',
} as const;

export type PermissionAction = (typeof PermissionActions)[keyof typeof PermissionActions];
