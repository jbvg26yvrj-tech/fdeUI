import { apiClient } from '../../shared/api/apiClient';
export interface InformationLink {
  label: string;
  url: string;
}
export interface InformationBlock {
  id: string;
  title: string;
  body: string;
  links: InformationLink[];
  audience: 'ALL' | 'ADMIN';
}
export interface InformationDocument {
  version: number;
  blocks: InformationBlock[];
}
export const informationApi = {
  read: () => apiClient.get<InformationDocument>('/api/v1/information'),
  save: (document: InformationDocument) =>
    apiClient.put<InformationDocument>('/api/v1/information', document),
};
export function safeInformationUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return (
      ['http:', 'https:'].includes(u.protocol) &&
      !u.username &&
      !u.password &&
      !value.includes('\\')
    );
  } catch {
    return false;
  }
}
