import { beforeEach, expect, it, vi } from 'vitest';
import { userContextApi, type UserContextResponse } from '../shared/api/userContextApi';
const get = vi.hoisted(() => vi.fn());
vi.mock('../shared/api/apiClient', () => ({ apiClient: { get } }));
const context = (id: string): UserContextResponse => ({ user: { id, login: id, activated: true, passwordChangeRequired: false }, roleCodes: id === 'admin' ? ['ADMIN'] : [], resourceCodes: [], settings: {}, rlsFilters: {} });
beforeEach(() => { userContextApi.clearCache(); get.mockReset(); });
it('invalidates old identity requests without clearing a newer pending request or caching old ADMIN data', async () => {
  let oldResolve!: (value: UserContextResponse) => void;
  let newResolve!: (value: UserContextResponse) => void;
  get.mockImplementationOnce(() => new Promise(resolve => { oldResolve = resolve; }))
    .mockImplementationOnce(() => new Promise(resolve => { newResolve = resolve; }));
  const oldRequest = userContextApi.getUserContext().catch(error => error);
  userContextApi.clearCache();
  const newRequest = userContextApi.getUserContext();
  expect(get).toHaveBeenCalledTimes(2);
  oldResolve(context('admin'));
  expect(await oldRequest).toBeInstanceOf(Error);
  expect(userContextApi.getCachedContext()).toBeNull();
  const sameIdentityRequest = userContextApi.getUserContext();
  expect(get).toHaveBeenCalledTimes(2);
  newResolve(context('employee'));
  expect((await newRequest).user.id).toBe('employee');
  expect((await sameIdentityRequest).roleCodes).toEqual([]);
  expect(userContextApi.getCachedContext()?.user.id).toBe('employee');
});
