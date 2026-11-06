import { useId } from 'react';
import { parseVolume, volumePeriods } from './volumeAgreement';
import type { VolumeDraft, VolumePeriod, VolumeUnit } from './volumeAgreement';
export function VolumeAgreementFields({ value, onChange }: { value: VolumeDraft; onChange: (value: VolumeDraft) => void }) {
  const id = useId();
  const error = parseVolume(value.amount, value.unit).error;
  return <fieldset className='rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2'>
    <legend className='px-1 text-sm font-medium'>Согласованный объём передачи</legend>
    <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
      <label className='flex flex-col gap-1 text-sm'>Согласованный объём
        <input className='rounded border p-2 bg-transparent min-w-0' inputMode='decimal' value={value.amount} maxLength={40} placeholder='Не задан' aria-invalid={!!error} aria-describedby={id}
          onChange={e => onChange({ ...value, amount: e.target.value })} />
      </label>
      <label className='flex flex-col gap-1 text-sm'>Единица объёма
        <select className='rounded border p-2 bg-transparent' value={value.unit} onChange={e => onChange({ ...value, unit: e.target.value as VolumeUnit })}>
          {['B', 'KB', 'MB', 'GB', 'TB'].map(unit => <option key={unit}>{unit}</option>)}
        </select>
      </label>
      <label className='flex flex-col gap-1 text-sm'>Период согласования
        <select className='rounded border p-2 bg-transparent' value={value.period} onChange={e => onChange({ ...value, period: e.target.value as VolumePeriod })}>
          {Object.entries(volumePeriods).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
    </div>
    <p id={id} className={`text-xs ${error ? 'text-red-600 dark:text-red-300' : 'text-gray-500 dark:text-gray-400'}`}>{error || 'Необязательно. Успешно отправленные файлы; 1 GB = 1 000 000 000 байт. Превышение только отмечается, поток не останавливается.'}</p>
  </fieldset>;
}
