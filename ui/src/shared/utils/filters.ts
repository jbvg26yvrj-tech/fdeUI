export const cleanFiltersFromRoleCode = (
  filters: Record<string, any> = {},
): Record<string, any> => {
  const cleanedFilters = { ...filters };
  if (cleanedFilters.roleCode) delete cleanedFilters.roleCode;
  return cleanedFilters;
};
