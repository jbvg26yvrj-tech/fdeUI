/**
 * Converts bytes to human-readable file size string.
 * Uses binary units (1024-based): bytes -> KB -> MB -> GB -> TB.
 */
export const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 Б';

  const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  const base = 1024;
  const unitIndex = Math.min(
    Math.floor(Math.log(Math.abs(bytes)) / Math.log(base)),
    units.length - 1,
  );
  const value = bytes / Math.pow(base, unitIndex);

  // Show integers for bytes, 1 decimal for KB, 2 decimals for MB+
  const decimals = unitIndex === 0 ? 0 : unitIndex === 1 ? 1 : 2;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
};

/**
 * Formats a duration between two ISO date strings into a human-readable string.
 * Returns null if dates are invalid or missing.
 */
export const formatDuration = (startIso: string, endIso?: string | null): string | null => {
  if (!startIso) return null;
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  if (isNaN(start) || isNaN(end)) return null;

  const diffMs = Math.max(0, end - start);
  const totalSeconds = Math.floor(diffMs / 1000);

  if (totalSeconds < 60) return `${totalSeconds} сек`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes < 60) return `${minutes} мин ${seconds} сек`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} ч ${remainingMinutes} мин`;
};
