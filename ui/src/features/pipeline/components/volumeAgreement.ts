export type VolumePeriod = 'RUN' | 'DAY' | 'MONTH';
export type VolumeUnit = 'B' | 'KB' | 'MB' | 'GB' | 'TB';
export interface VolumeDraft { amount: string; unit: VolumeUnit; period: VolumePeriod }
export const volumePeriods: Record<VolumePeriod, string> = { RUN: 'За запуск', DAY: 'За сутки', MONTH: 'За месяц' };
const factors: Record<VolumeUnit, bigint> = { B: 1n, KB: 1000n, MB: 1000000n, GB: 1000000000n, TB: 1000000000000n };
export function parseVolume(amount: string, unit: VolumeUnit): { bytes?: number; error?: string } {
  const input = amount.trim().replace(',', '.');
  if (!input) return { bytes: undefined };
  const invalid = { error: 'Укажите положительный объём с точностью до байта, не более 9 007 199 254 740 991 байт.' };
  if (input.length > 40 || !/^\d+(\.\d+)?$/.test(input)) return invalid;
  const [whole, fraction = ''] = input.split('.');
  const scale = 10n ** BigInt(fraction.length);
  const numerator = BigInt(whole + fraction) * factors[unit];
  if (numerator % scale !== 0n) return invalid;
  const bytes = numerator / scale;
  return bytes > 0n && bytes <= BigInt(Number.MAX_SAFE_INTEGER) ? { bytes: Number(bytes) } : invalid;
}
export function volumeFromBytes(bytes?: number | null, period?: VolumePeriod | null): VolumeDraft {
  if (!bytes) return { amount: '', unit: 'GB', period: period ?? 'DAY' };
  const unit = (['TB', 'GB', 'MB', 'KB', 'B'] as VolumeUnit[]).find(u => BigInt(bytes) % factors[u] === 0n) ?? 'B';
  return { amount: String(BigInt(bytes) / factors[unit]), unit, period: period ?? 'DAY' };
}
