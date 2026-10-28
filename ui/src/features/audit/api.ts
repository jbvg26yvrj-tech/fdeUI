import { apiClient } from '../../shared/api/apiClient';
export interface AuditEvent {
  id: number;
  occurredAt: string;
  actor: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string | null;
  result: string;
  correlationId: string;
  changes: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    [key: string]: unknown;
  };
}
export interface AuditPage {
  content: AuditEvent[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
export const auditApi = {
  list: (params: URLSearchParams) => apiClient.get<AuditPage>(`/api/v1/audit?${params}`),
};
