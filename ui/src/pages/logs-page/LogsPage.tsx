import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useUserContext } from '../../shared/hooks/useUserContext';
import { useRead } from '../../features/analytics/useRead';
import {
  connectionWindow,
  logWindow,
  lokiApi,
  safeLogQuery,
  type LogsResponse,
} from '../../features/logs/api';
import '../../features/analytics/monitoring.css';
export default function LogsPage() {
  const [search, setSearch] = useSearchParams();
  const { roles, isLoading: contextLoading } = useUserContext();
  const admin = roles.includes('ADMIN');
  const connections = useRead('log-connections', lokiApi.connections);
  const [draft, setDraft] = useState(() => Object.fromEntries(safeLogQuery(search)));
  const [result, setResult] = useState<LogsResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const version = useRef(0);
  const submittedUrl = useRef('');
  useEffect(
    () => () => {
      version.current++;
    },
    [],
  );
  useEffect(() => {
    if (submittedUrl.current === search.toString()) return;
    setDraft(Object.fromEntries(safeLogQuery(search)));
    setResult(null);
    setError('');
    version.current++;
    setBusy(false);
  }, [search]);
  const selected = connections.data?.find(c => c.id === draft.connectionId);
  useEffect(() => {
    if (!connections.data?.length) return;
    if (draft.connectionId && !selected) return;
    if (!selected && connections.data.length !== 1) return;
    const connection = selected ?? connections.data[0];
    if (!draft.connectionId || !draft.from || !draft.to) {
      const window = logWindow(search.get('start'), connection.maxHours);
      setDraft(old => ({
        ...old,
        connectionId: connection.id,
        from: old.from || window.from,
        to: old.to || window.to,
      }));
    }
  }, [connections.data, selected, draft.connectionId, draft.from, draft.to, search]);
  function edit(key: string, value: string) {
    version.current++;
    setBusy(false);
    setResult(null);
    setError('');
    setDraft(old => ({ ...old, [key]: value }));
  }
  async function run() {
    if (!selected) return;
    if (!admin && !draft.sessionId) {
      setError('Для просмотра логов выберите доступную сессию.');
      return;
    }
    if (!admin && !selected.sessionField) {
      setError(
        'Источник не поддерживает корреляцию с сессиями. Общие логи доступны только администратору.',
      );
      return;
    }
    const from = Date.parse(draft.from),
      to = Date.parse(draft.to);
    const instant = /T.*(?:Z|[+-]\d{2}:\d{2})$/;
    if (
      !instant.test(draft.from) ||
      !instant.test(draft.to) ||
      !Number.isFinite(from) ||
      !Number.isFinite(to) ||
      from >= to ||
      to - from > selected.maxHours * 3600000
    ) {
      setError(
        `Введите ISO-время с Z или смещением. Начало должно быть раньше конца; максимум ${selected.maxHours} ч.`,
      );
      return;
    }
    const params = safeLogQuery(new URLSearchParams(draft));
    params.set('limit', String(selected.limit));
    // URL carries only safe search parameters; never credentials, server URL or arbitrary LogQL.
    submittedUrl.current = params.toString();
    setSearch(params, { replace: true });
    setResult(null);
    setError('');
    setBusy(true);
    const request = ++version.current;
    try {
      const response = await lokiApi.query(params);
      if (version.current === request) setResult(response);
    } catch (failure) {
      if (version.current === request)
        setError(failure instanceof Error ? failure.message : 'Источник логов недоступен.');
    } finally {
      if (version.current === request) setBusy(false);
    }
  }
  // Submit changes URL before issuing a request; the effect above must not invalidate its own search.
  return (
    <section className='monitor-page'>
      <header>
        <h1 className='fde-page-title'>Логи</h1>
        <p>Поиск в подключённом Loki. Время задаётся явно в ISO 8601 с часовым поясом.</p>
      </header>
      {connections.error && (
        <p role='alert'>Не удалось получить подключения: {connections.error}</p>
      )}
      {connections.loading && <p role='status'>Загрузка подключений…</p>}
      {connections.data?.length === 0 && (
        <div className='monitor-panel'>
          <h2>Нет доступных подключений</h2>
          <p>Администратор может добавить и включить сервер Loki в настройках.</p>
          {admin && <Link to='/settings/loki'>Настройки Loki</Link>}
        </div>
      )}
      {!!connections.data?.length && (
        <form
          className='monitor-panel monitor-filters'
          onSubmit={e => {
            e.preventDefault();
            void run();
          }}
        >
          <label>
            Подключение
            <select
              required
              value={draft.connectionId ?? ''}
              onChange={e => {
                const c = connections.data!.find(c => c.id === e.target.value)!;
                version.current++;
                setResult(null);
                setError('');
                setBusy(false);
                setDraft(old => ({
                  ...old,
                  connectionId: c.id,
                  ...connectionWindow(old.from, old.to, c.maxHours, search.get('start')),
                }));
              }}
            >
              <option value='' disabled>
                Выберите подключение
              </option>
              {draft.connectionId && !selected && (
                <option value={draft.connectionId}>Подключение недоступно или отключено</option>
              )}
              {connections.data.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.datacenter ? ` (${c.datacenter})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            ID сессии{!admin ? ' (обязательно)' : ''}
            <input
              value={draft.sessionId ?? ''}
              required={!admin}
              onChange={e => edit('sessionId', e.target.value)}
            />
          </label>
          {(['from', 'to'] as const).map(key => (
            <label key={key}>
              {key === 'from' ? 'Начало' : 'Конец'} (ISO с зоной)
              <input
                required
                value={draft[key] ?? ''}
                placeholder='2026-10-27T12:00:00Z'
                onChange={e => edit(key, e.target.value)}
              />
            </label>
          ))}
          <label>
            Уровень
            <select value={draft.level ?? ''} onChange={e => edit('level', e.target.value)}>
              <option value=''>Все уровни</option>
              {['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].map(level => (
                <option key={level}>{level}</option>
              ))}
            </select>
          </label>
          <label>
            Текст сообщения
            <input value={draft.text ?? ''} onChange={e => edit('text', e.target.value)} />
          </label>
          <button className='monitor-primary' disabled={busy || contextLoading || !selected}>
            {busy ? 'Поиск…' : 'Найти логи'}
          </button>
          {selected && (
            <p className='monitor-note'>
              Окно до {selected.maxHours} ч.; до {selected.limit} строк.{' '}
              {!selected.sessionField ? 'Источник не поддерживает корреляцию с сессиями.' : ''}
            </p>
          )}
          {search.get('start') && (
            <p className='monitor-note'>
              Окно начинается за 5 минут до запуска. Для старой сессии показано первое ограниченное
              окно; время окончания сессии неизвестно. Измените границы для поиска следующих строк.
            </p>
          )}
        </form>
      )}
      {error && <p role='alert'>Поиск не выполнен: {error}</p>}
      {busy && <p role='status'>Получение логов…</p>}
      {result && (
        <section className='monitor-panel'>
          <h2>Результаты: {result.entries.length}</h2>
          {result.message && <p role='status'>{result.message}</p>}
          {result.truncated && (
            <p role='alert'>
              Достигнут лимит, результат усечён. Сузьте период или уточните текст. Полнота строк с
              одинаковым временем не гарантируется.
            </p>
          )}
          {!result.entries.length && <p>Нет строк в выбранном окне.</p>}
          <ol className='monitor-log-list'>
            {result.entries.map((entry, i) => (
              <li key={`${entry.timestamp}-${i}`}>
                <time>{entry.timestamp}</time>
                <pre>{entry.line}</pre>
                <details>
                  <summary>Поля записи</summary>
                  <pre>{JSON.stringify(entry.labels, null, 2)}</pre>
                </details>
              </li>
            ))}
          </ol>
        </section>
      )}
    </section>
  );
}
