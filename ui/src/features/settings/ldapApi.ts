import { apiClient } from '../../shared/api/apiClient';

export interface LdapConfig {
  enabled: boolean;
  syncEnabled: boolean;
  directoryType: 'AD' | 'LDAP';
  url: string;
  tlsMode: 'LDAPS' | 'STARTTLS';
  baseDn: string;
  bindDn: string;
  userFilter: string;
  activeFilter: string;
  loginAttribute: string;
  idAttribute: string;
  displayNameAttribute: string;
  emailAttribute: string;
  syncIntervalMinutes: number;
  connectTimeoutMs: number;
  readTimeoutMs: number;
  bindPasswordConfigured?: boolean;
}
export type LdapConfigInput = Omit<LdapConfig, 'bindPasswordConfigured'> & {
  bindPassword?: string;
};
export interface SyncResult {
  status: string;
  message?: string;
  checked: number;
  updated: number;
  deactivated: number;
  finishedAt?: string;
}
export const ldapApi = {
  get: () => apiClient.get<LdapConfig>('/settings/ldap'),
  save: (config: LdapConfigInput) => apiClient.put<LdapConfig>('/settings/ldap', config),
  test: (config: LdapConfigInput) =>
    apiClient.post<{ success: boolean; message: string }>('/settings/ldap/test', config),
  status: () => apiClient.get<SyncResult | null>('/settings/ldap/sync'),
  sync: () => apiClient.post<SyncResult>('/settings/ldap/sync'),
};
