import { bytes } from './api';
import type { Overview } from './api';
export function DailyTransfers({ rows, zone, onSelect }: { rows: Overview['series']; zone: string; onSelect: (time: string) => void }) {
  return <section className='monitor-panel'>
    <h2>Передачи по дням</h2>
    <p className='monitor-note'>По дате запуска сессии · {zone}. Успешные операции, включая повторные передачи. Получение и отправка считаются отдельно.</p>
    <div className='overflow-x-auto max-h-96'>
      <table className='w-full text-sm text-left'>
        <thead><tr>{['День', 'Запуски', 'Ошибки', 'Получено файлов', 'Получено', 'Отправлено файлов', 'Отправлено', 'Полнота данных'].map(text => <th className='p-2 whitespace-nowrap' key={text} scope='col'>{text}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr className='border-t border-gray-200 dark:border-gray-700' key={row.time}>
          <th className='p-2' scope='row'><button className='text-blue-600 dark:text-blue-300 underline whitespace-nowrap' onClick={() => onSelect(row.time)}>{row.time.slice(0, 10)}</button></th>
          <td className='p-2'>{row.sessions}</td><td className='p-2'>{row.failed}</td>
          <td className='p-2'>{row.receivedFiles}</td><td className='p-2 whitespace-nowrap'>{bytes(row.receivedBytes)}</td>
          <td className='p-2'>{row.sentFiles}</td><td className='p-2 whitespace-nowrap'>{bytes(row.sentBytes)}</td>
          <td className='p-2'>{row.unknownSizeFiles > 0 ? `Неполный объём: ${row.unknownSizeFiles}` : 'Известные размеры'}</td>
        </tr>)}</tbody>
      </table>
      {!rows.length && <p>Нет данных за выбранный период.</p>}
    </div>
  </section>;
}
