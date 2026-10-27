import { useEffect, useRef, useState } from 'react';
import { pipelineReuseApi } from '../../api/pipelinesCrudApi';
import type { PipelineData, SimplePipelineData } from '../../types/Types';
interface Props {
  onLoaded: (rows: SimplePipelineData[]) => void;
  onSelect: (source: PipelineData) => void;
  disabled: boolean;
}
export function ReusePicker({ onLoaded, onSelect, disabled }: Props) {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<SimplePipelineData[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const request = useRef(0);
  const selected = useRef(0);
  const loaded = useRef(onLoaded);
  loaded.current = onLoaded;
  useEffect(() => {
    const version = ++request.current;
    setBusy(true);
    const timer = setTimeout(() => {
      pipelineReuseApi
        .search(query, page)
        .then(result => {
          if (version !== request.current) return;
          setRows(prev =>
            page === 0
              ? result.content
              : [...prev, ...result.content.filter(row => !prev.some(p => p.id === row.id))],
          );
          setTotalPages(result.totalPages);
          loaded.current(result.content);
          setError('');
        })
        .catch(() => {
          if (version === request.current)
            setError('Не удалось загрузить пайплайны. Повторите поиск.');
        })
        .finally(() => {
          if (version === request.current) setBusy(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      ++request.current;
    };
  }, [query, page, retry]);
  useEffect(
    () => () => {
      ++selected.current;
    },
    [],
  );
  async function select(id: string) {
    const version = ++selected.current;
    setBusy(true);
    setError('');
    try {
      const source = await pipelineReuseApi.get(id);
      if (version === selected.current) onSelect(source);
    } catch {
      if (version === selected.current)
        setError('Не удалось загрузить настройки выбранного пайплайна.');
    } finally {
      if (version === selected.current) setBusy(false);
    }
  }
  return (
    <details className='pw-reuse'>
      <summary>На основе существующего пайплайна</summary>
      <p>
        Найдите доступный пайплайн по названию. Копируются только параметры операций, без учётных
        данных.
      </p>
      <label>
        Поиск пайплайна
        <input
          value={query}
          disabled={disabled}
          onChange={e => {
            setQuery(e.target.value);
            setPage(0);
            setRows([]);
          }}
          placeholder='Название пайплайна'
        />
      </label>
      {error && (
        <div role='alert'>
          {error}{' '}
          <button type='button' onClick={() => setRetry(v => v + 1)}>
            Повторить поиск
          </button>
        </div>
      )}
      {busy && <p role='status'>Загрузка пайплайнов…</p>}
      {!busy && !rows.length && !error && <p>Совпадений нет. Можно заполнить настройки вручную.</p>}
      <ul className='pw-source-list'>
        {rows.map(row => (
          <li key={row.id}>
            <span>
              <strong>{row.pipelineName}</strong>
              <small>
                {row.clientFrom} → {row.clientTo}
              </small>
            </span>
            <button type='button' disabled={busy || disabled} onClick={() => void select(row.id)}>
              Выбрать {row.pipelineName}
            </button>
          </li>
        ))}
      </ul>
      {page + 1 < totalPages && (
        <button type='button' disabled={busy || disabled} onClick={() => setPage(p => p + 1)}>
          Загрузить ещё
        </button>
      )}
      <small>
        Подсказки клиентов содержат значения из загруженных записей. Всегда можно ввести своё
        значение.
      </small>
    </details>
  );
}
