import { userContextApi } from '../api/userContextApi';
import type { TableParams } from '../ui/table/types/type';

export interface ListReturnState {
  params?: TableParams;
  lastId?: string;
  scrollY?: number;
  mainScrollTop?: number;
}
// Tab-local, identity-scoped memory only: no entity or filter payload is persisted.
const snapshots = new Map<string, ListReturnState>();
export function listStateKey(resource: string, search = window.location.search) {
  const userId = userContextApi.getCachedContext()?.user?.id;
  return userId ? JSON.stringify([userId, resource, search]) : null;
}
export function readListState(key: string | null): ListReturnState {
  return key ? snapshots.get(key) || {} : {};
}
export function writeListState(key: string | null, update: Partial<ListReturnState>) {
  if (!key) return;
  snapshots.set(key, { ...readListState(key), ...update });
  // Bound memory when navigating many query-filtered lists.
  if (snapshots.size > 100) snapshots.delete(snapshots.keys().next().value!);
}
