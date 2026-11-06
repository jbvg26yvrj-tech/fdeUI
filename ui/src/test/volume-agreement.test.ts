import { describe, expect, it } from 'vitest';
import { parseVolume, volumeFromBytes } from '../features/pipeline/components/volumeAgreement';
describe('agreed transfer volume', () => {
  it('converts decimal GB exactly and accepts a comma', () => {
    expect(parseVolume('1,25', 'GB')).toEqual({ bytes: 1250000000 });
    expect(parseVolume('0.000000001', 'GB')).toEqual({ bytes: 1 });
  });
  it('leaves empty unset but rejects zero, negative, fractional bytes and overflow', () => {
    expect(parseVolume('', 'GB')).toEqual({ bytes: undefined });
    for (const amount of ['0', '-1', '1e3', 'NaN', '0.0000000001', '9007199254740992'])
      expect(parseVolume(amount, 'GB').error).toBeTruthy();
  });
  it('roundtrips stored bytes without rounding', () => {
    for (const bytes of [1, 1000000, 1234567890, Number.MAX_SAFE_INTEGER]) {
      const value = volumeFromBytes(bytes, 'MONTH');
      expect(parseVolume(value.amount, value.unit).bytes).toBe(bytes);
      expect(value.period).toBe('MONTH');
    }
  });
});
