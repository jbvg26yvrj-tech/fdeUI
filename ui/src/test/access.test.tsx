import { expect, it } from 'vitest';
import { landingPath, canAccessPath } from '../shared/lib/access';
it('routes users only to available pages and reserves settings for ADMIN', () => {
  expect(landingPath([], [])).toBe('/about');
  expect(landingPath(['page.sessions'], [])).toBe('/sessions');
  expect(canAccessPath('/pipelines/123', [], [])).toBe(false);
  expect(canAccessPath('/settings/ldap', ['page.settings'], [])).toBe(false);
  expect(canAccessPath('/settings/ldap', [], ['ADMIN'])).toBe(true);
  expect(canAccessPath('//external.example', [], ['ADMIN'])).toBe(false);
});
