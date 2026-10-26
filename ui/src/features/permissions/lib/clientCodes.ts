export const parseClientCodes = (value: string): string[] => [
  ...new Set(
    value
      .split(/[,;\s]+/)
      .map(code => code.trim().toUpperCase())
      .filter(Boolean),
  ),
];
