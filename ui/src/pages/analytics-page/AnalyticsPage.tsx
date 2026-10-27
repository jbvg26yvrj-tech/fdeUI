import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../shared/api/apiClient';
import {
  analyticsApi,
  bytes,
  sessionLogsLink,
  wallTime,
  type Totals,
  type AnalyticsSession,
} from '../../features/analytics/api';
import { useRead } from '../../features/analytics/useRead';
import '../../features/analytics/monitoring.css';
export const statusSeries = [
  { key: 'success', name: 'Успешно', status: 'SUCCESS', color: '#269b79' },
  { key: 'failed', name: 'Ошибка', status: 'FAILED', color: '#df6572' },
  { key: 'aborted', name: 'Прервано', status: 'ABORTED', color: '#ad80cd' },
  { key: 'active', name: 'Выполняется', status: 'ACTIVE', color: '#5d91ef' },
  { key: 'prepare', name: 'Подготовка', status: 'PREPARE', color: '#c59b40' },
  { key: 'unknown', name: 'Другой статус', color: '#8d9aaa' },
] as const;
type SeriesKey = keyof Totals;
type Metric = { key: SeriesKey; name: string; color: string; status?: string };
const statusLabel = (value: string) =>
  statusSeries.find(s => 'status' in s && s.status === value)?.name ?? value;
export function Chart({
  title,
  rows,
  metrics,
  onSelect,
  format = String,
  stacked = false,
}: {
  title: string;
  rows: ({ time: string } & Totals)[];
  metrics: readonly Metric[];
  onSelect: (time: string, status?: string) => void;
  format?: (n: number) => string;
  stacked?: boolean;
}) {
  const maximum = Math.max(
    1,
    ...rows.map(row =>
      stacked
        ? metrics.reduce((sum, m) => sum + Number(row[m.key] ?? 0), 0)
        : Math.max(...metrics.map(m => Number(row[m.key] ?? 0))),
    ),
  );
  const cell = 540 / Math.max(1, rows.length);
  const values = rows.flatMap(row => metrics.map(m => row[m.key]));
  const noMeasurements = values.length > 0 && values.every(v => v === null);
  const allZero = values.length > 0 && !noMeasurements && values.every(v => v === null || v === 0);
  return (
    <section className='monitor-panel'>
      <h2>{title}</h2>
      <div className='monitor-legend'>
        {metrics.map(m => (
          <span key={m.key}>
            <i style={{ background: m.color }} />
            {m.name}
          </span>
        ))}
      </div>
      <svg
        viewBox='0 0 620 190'
        role='group'
        aria-label={`${title}. Числа и переходы доступны в таблице под графиком.`}
      >
        {[0, 0.5, 1].map(tick => (
          <g key={tick} aria-hidden='true'>
            <line
              x1='70'
              x2='610'
              y1={150 - tick * 120}
              y2={150 - tick * 120}
              stroke='currentColor'
              opacity='.15'
            />
            <text x='62' y={154 - tick * 120} textAnchor='end' fill='currentColor' fontSize='11'>
              {format(maximum * tick)}
            </text>
          </g>
        ))}
        {rows.map((row, index) => {
          let accumulated = 0;
          return metrics.map((metric, j) => {
            const value = row[metric.key];
            if (value === null) return null;
            const h = (Number(value) / maximum) * 120;
            const y = 150 - h - accumulated;
            if (stacked) accumulated += h;
            return (
              <rect
                key={`${row.time}-${metric.key}`}
                x={70 + index * cell + (stacked ? 0 : (j * cell) / metrics.length)}
                y={y}
                width={Math.max(0.5, cell / (stacked ? 1 : metrics.length) - 1)}
                height={h}
                role='button'
                tabIndex={value > 0 ? 0 : -1}
                aria-label={`${row.time.replace('T', ' ')}: ${metric.name} ${format(Number(value))}`}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(row.time, stacked ? metric.status : undefined);
                  }
                }}
                fill={metric.color}
                onClick={() => onSelect(row.time, stacked ? metric.status : undefined)}
              >
                <title>
                  {row.time}: {metric.name} {format(Number(value))}
                </title>
              </rect>
            );
          });
        })}
      </svg>
      <div className='monitor-axis'>
        <span>{rows[0]?.time.replace('T', ' ')}</span>
        <span>Максимум: {format(maximum)}</span>
        <span>{rows[rows.length - 1]?.time.replace('T', ' ')}</span>
      </div>
      {!rows.length && <p className='monitor-chart-empty'>Нет данных за выбранный период.</p>}
      {noMeasurements && <p className='monitor-chart-empty'>Нет завершённых сессий.</p>}
      {allZero && <p className='monitor-chart-empty'>Все значения за период равны нулю.</p>}
      <details>
        <summary>Данные графика и переход к сессиям</summary>
        <div className='monitor-scroll'>
          <table>
            <thead>
              <tr>
                <th>Интервал</th>
                {metrics.map(m => (
                  <th key={m.key}>{m.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.time}>
                  <td>
                    <button onClick={() => onSelect(row.time)}>{row.time.replace('T', ' ')}</button>
                  </td>
                  {metrics.map(m => (
                    <td key={m.key}>
                      {row[m.key] === null ? (
                        'Нет завершённых сессий'
                      ) : (
                        <button onClick={() => onSelect(row.time, stacked ? m.status : undefined)}>
                          {format(Number(row[m.key]))}
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
function LogsLink({ session, zone }: { session: AnalyticsSession; zone: string }) {
  try {
    return <Link to={sessionLogsLink(session, zone)}>Логи</Link>;
  } catch {
    return (
      <span title='Не удалось однозначно определить время сессии в зоне источника'>
        Время логов недоступно
      </span>
    );
  }
}
export default function AnalyticsPage() {
  const { id } = useParams();
  const [search, setSearch] = useSearchParams();
  const config = useRead('analytics-config', () =>
    apiClient.get<{ sourceTimeZone: string; testStand: boolean }>('/analytics/config'),
  );
  if (config.error)
    return (
      <section className='monitor-page'>
        <h1>Аналитика</h1>
        <p role='alert'>Не удалось определить временную зону источника: {config.error}</p>
      </section>
    );
  if (!config.data) return <p role='status'>Загрузка параметров аналитики…</p>;
  return (
    <AnalyticsContent
      id={id}
      search={search}
      setSearch={setSearch}
      zone={config.data.sourceTimeZone}
      testStand={config.data.testStand}
    />
  );
}
function AnalyticsContent({
  id,
  search,
  setSearch,
  zone,
  testStand,
}: {
  id?: string;
  search: URLSearchParams;
  setSearch: ReturnType<typeof useSearchParams>[1];
  zone: string;
  testStand: boolean;
}) {
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [lookupPage, setLookupPage] = useState(0);
  const pipelines = useRead(`pipeline-options:${pipelineSearch}:${lookupPage}`, () =>
    apiClient.get<{
      content: {
        id: string;
        pipelineName: string;
        clientFrom: string;
        clientTo: string;
        primaryDatacenter: string;
      }[];
      totalPages: number;
    }>(
      `/analytics/pipelines?${new URLSearchParams({ query: pipelineSearch, page: String(lookupPage), size: '100' })}`,
    ),
  );
  const initial = useMemo(
    () => ({
      from: wallTime(new Date(Date.now() - 7 * 86400000), zone),
      to: wallTime(new Date(), zone),
    }),
    [zone],
  );
  const query = new URLSearchParams();
  for (const key of [
    'from',
    'to',
    'pipelineId',
    'clientFrom',
    'clientTo',
    'datacenter',
    'bucket',
  ]) {
    const value = search.get(key);
    if (value) query.set(key, value);
  }
  if (!query.has('from')) query.set('from', initial.from);
  if (!query.has('to')) query.set('to', initial.to);
  if (id) query.set('pipelineId', id);
  const queryString = query.toString();
  const [draft, setDraft] = useState(() => Object.fromEntries(query));
  useEffect(() => setDraft(Object.fromEntries(new URLSearchParams(queryString))), [queryString]);
  const overview = useRead(queryString + id, () => analyticsApi.overview(queryString, id));
  const page = Math.max(0, Number(search.get('page')) || 0);
  const sessionQuery = new URLSearchParams(query);
  sessionQuery.set('page', String(page));
  sessionQuery.set('size', '20');
  for (const key of ['status', 'errorMessage']) {
    const value = search.get(key);
    if (value) sessionQuery.set(key, value);
  }
  // Drill-down bounds affect the session list only; aggregate error rate keeps its original denominator.
  if (search.get('sessionFrom')) sessionQuery.set('from', search.get('sessionFrom')!);
  if (search.get('sessionTo')) sessionQuery.set('to', search.get('sessionTo')!);
  const sessions = useRead(sessionQuery.toString(), () =>
    analyticsApi.sessions(sessionQuery.toString()),
  );
  const data = overview.data;
  function updateSearch(changes: Record<string, string>) {
    const next = new URLSearchParams(query);
    for (const key of ['status', 'sessionFrom', 'sessionTo', 'errorMessage']) {
      const v = search.get(key);
      if (v) next.set(key, v);
    }
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setSearch(next);
  }
  function drill(time: string, status?: string) {
    const end = new Date(Date.parse(time + 'Z') + (data?.bucket === 'hour' ? 3600000 : 86400000))
      .toISOString()
      .slice(0, 19);
    updateSearch({
      sessionFrom: time < query.get('from')! ? query.get('from')! : time,
      sessionTo: end > query.get('to')! ? query.get('to')! : end,
      status: status ?? '',
      errorMessage: '',
      page: '0',
    });
    document.getElementById('analytics-sessions')?.scrollIntoView({ block: 'start' });
  }
  return (
    <section className='monitor-page'>
      <header className='monitor-heading'>
        <h1 className='fde-page-title'>{id ? 'Аналитика потока' : 'Аналитика'}</h1>
        <p>
          По времени запуска сессии · {zone}
          {testStand ? ' · Тестовый стенд' : ''}
        </p>
        <details className='monitor-help'>
          <summary aria-label='Справка об аналитике'>
            ? <span>Как читать данные</span>
          </summary>
          <div>
            <p>
              Время запуска — в зоне {zone}. Конец периода не включён. Максимальный период — 366
              дней.
            </p>
            <p>
              Нажмите столбец или значение в таблице графика, чтобы выбрать сессии. Таблица доступна
              с клавиатуры.
            </p>
            <p>Ошибки: FAILED / (SUCCESS + FAILED). Без завершённых сессий доля не определена.</p>
            <p>
              Записи и объём — успешные Download / Upload без дедупликации имён, не сетевой трафик.
              Отсутствие записей не доказывает отсутствие файлов на источнике.
            </p>
          </div>
        </details>
        {id && (
          <Link
            to={`/analytics?${new URLSearchParams([...query].filter(([key]) => key !== 'pipelineId'))}`}
          >
            Все потоки
          </Link>
        )}
      </header>
      <form
        className='monitor-panel monitor-filters'
        onSubmit={e => {
          e.preventDefault();
          const next = new URLSearchParams();
          Object.entries(draft).forEach(([k, v]) => {
            if (v) next.set(k, v);
          });
          setSearch(next);
        }}
      >
        <label>
          Период
          <select
            aria-label='Период'
            defaultValue='custom'
            onChange={e => {
              if (e.target.value !== 'custom') {
                const days = Number(e.target.value);
                setDraft(old => ({
                  ...old,
                  from: wallTime(new Date(Date.now() - days * 86400000), zone),
                  to: wallTime(new Date(), zone),
                }));
              }
            }}
          >
            <option value='1'>24 часа</option>
            <option value='7'>7 дней</option>
            <option value='30'>30 дней</option>
            <option value='custom'>Свой период</option>
          </select>
        </label>
        {[
          { key: 'from', name: 'Начало', type: 'datetime-local' },
          { key: 'to', name: 'Конец (не включён)', type: 'datetime-local' },
          { key: 'clientFrom', name: 'Источник' },
          { key: 'clientTo', name: 'Получатель' },
          { key: 'datacenter', name: 'Датацентр' },
        ].map(field => (
          <label key={field.key}>
            {field.name}
            <input
              type={field.type ?? 'text'}
              step={field.type ? '1' : undefined}
              required={Boolean(field.type)}
              disabled={field.key === 'pipelineId' && !!id}
              value={draft[field.key] ?? ''}
              onChange={e => setDraft(old => ({ ...old, [field.key]: e.target.value }))}
            />
          </label>
        ))}
        <label>
          Поиск потока
          <input
            value={pipelineSearch}
            onChange={e => {
              setPipelineSearch(e.target.value);
              setLookupPage(0);
            }}
            placeholder='Название или ID пайплайна'
          />
        </label>
        <label>
          Поток
          <select
            disabled={!!id}
            value={draft.pipelineId ?? ''}
            onChange={e => setDraft(old => ({ ...old, pipelineId: e.target.value }))}
          >
            <option value=''>Все доступные потоки</option>
            {draft.pipelineId && !pipelines.data?.content.some(p => p.id === draft.pipelineId) && (
              <option value={draft.pipelineId}>{draft.pipelineId}</option>
            )}
            {pipelines.data?.content.map(p => (
              <option key={p.id} value={p.id}>
                {p.pipelineName} · {p.clientFrom} → {p.clientTo}
              </option>
            ))}
          </select>
        </label>
        {pipelines.error && (
          <small role='alert'>Список потоков недоступен: {pipelines.error}</small>
        )}
        {(pipelines.data?.totalPages ?? 0) > 1 && (
          <div>
            <button
              type='button'
              disabled={lookupPage === 0}
              onClick={() => setLookupPage(p => p - 1)}
            >
              Предыдущие потоки
            </button>
            <button
              type='button'
              disabled={lookupPage + 1 >= (pipelines.data?.totalPages ?? 0)}
              onClick={() => setLookupPage(p => p + 1)}
            >
              Следующие потоки
            </button>
          </div>
        )}
        <button className='monitor-primary'>Применить</button>
      </form>
      {overview.loading && <p role='status'>Обновление показателей…</p>}
      {overview.error && (
        <p role='alert'>
          Не удалось обновить показатели: {overview.error}.{' '}
          {data
            ? 'Ниже последний успешный результат; он может не соответствовать выбранным фильтрам.'
            : ''}
        </p>
      )}
      {data && (
        <div aria-busy={overview.loading}>
          <div className='monitor-metrics'>
            {(
              [
                { key: 'sessions', name: 'Запуски' },
                { key: 'errorRate', name: 'Ошибки, %' },
                { key: 'active', name: 'Выполняется' },
                { key: 'receivedBytes', name: 'Получено' },
                { key: 'sentBytes', name: 'Отправлено' },
              ] as { key: SeriesKey; name: string }[]
            ).map(m => (
              <div key={m.key}>
                <span>{m.name}</span>
                <strong>
                  {data.summary[m.key] === null
                    ? '—'
                    : m.key.endsWith('Bytes')
                      ? bytes(Number(data.summary[m.key]))
                      : m.key === 'errorRate'
                        ? Number(data.summary[m.key]).toFixed(1)
                        : data.summary[m.key]}
                </strong>
              </div>
            ))}
          </div>
          {data.extra && (
            <details className='monitor-panel monitor-diagnostics'>
              <summary>Диагностика периода</summary>
              <dl className='monitor-detail-metrics'>
                {(
                  [
                    ['Получено записей', data.summary.receivedFiles],
                    ['Отправлено записей', data.summary.sentFiles],
                    ['Ошибочные записи', data.summary.failedFiles],
                    ['Пропущено записей', data.summary.skippedFiles],
                    ['Без размера', data.summary.unknownSizeFiles],
                  ] as const
                ).map(([name, value]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <p>
                Успешно без записей файлов: {data.extra.successfulEmptySessions}. Отсутствие записей
                не доказывает отсутствие файлов на источнике.
              </p>
              {data.extra.consecutiveFailures !== null && (
                <p>Ошибок подряд в конце периода: {data.extra.consecutiveFailures}.</p>
              )}
              {data.extra.commonErrors.length > 0 && (
                <>
                  <h3>Частые сообщения ошибок</h3>
                  <ul>
                    {data.extra.commonErrors.map((e, i) => (
                      <li key={i}>
                        <button
                          onClick={() =>
                            updateSearch({
                              errorMessage: e.message,
                              sessionFrom: '',
                              sessionTo: '',
                              status: 'FAILED',
                              page: '0',
                            })
                          }
                        >
                          {e.message} — {e.count} сессий
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </details>
          )}
          {data.warnings?.map((warning, i) => (
            <p role='status' key={i}>
              {warning}
            </p>
          ))}
          <p className='monitor-note'>
            Шаг графика: {data.bucket === 'hour' ? 'час' : 'день'}. До 400 точек. Обновлено:{' '}
            {data.generatedAt}.
          </p>
          {id && (
            <p>
              За всю доступную историю: последний запуск — {data.lastStart ?? 'нет'}; последний
              успешный запуск — {data.lastSuccess ?? 'нет'} ({data.sourceTimeZone}).
            </p>
          )}
          <Chart
            title='Запуски по статусам'
            rows={data.series}
            metrics={statusSeries}
            stacked
            onSelect={drill}
          />
          <div className='monitor-charts'>
            <Chart
              title='Успешные записи файлов'
              rows={data.series}
              metrics={[
                { key: 'receivedFiles', name: 'Получено', color: '#5d91ef' },
                { key: 'sentFiles', name: 'Отправлено', color: '#269b79' },
              ]}
              onSelect={drill}
            />
            <Chart
              title='Объём успешных операций'
              rows={data.series}
              metrics={[
                { key: 'receivedBytes', name: 'Получено', color: '#5d91ef' },
                { key: 'sentBytes', name: 'Отправлено', color: '#269b79' },
              ]}
              format={bytes}
              onSelect={drill}
            />
          </div>
          <Chart
            title='Доля ошибочных сессий, %'
            rows={data.series}
            metrics={[{ key: 'errorRate', name: 'Доля ошибок', color: '#df6572' }]}
            onSelect={drill}
          />
        </div>
      )}
      <section id='analytics-sessions' className='monitor-panel'>
        <div className='monitor-toolbar'>
          <h2>Сессии</h2>
          <label>
            Статус
            <select
              value={search.get('status') ?? ''}
              onChange={e => updateSearch({ status: e.target.value, page: '0' })}
            >
              <option value=''>Все статусы</option>
              {statusSeries
                .filter(s => s.key !== 'unknown')
                .map(s => (
                  <option key={s.key} value={'status' in s ? s.status : ''}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          {search.has('errorMessage') && (
            <>
              <span>Ошибка: {search.get('errorMessage')}</span>
              <button onClick={() => updateSearch({ errorMessage: '', page: '0' })}>
                Сбросить сообщение ошибки
              </button>
            </>
          )}
          {search.has('sessionFrom') && (
            <>
              <span>
                Интервал: {search.get('sessionFrom')} — {search.get('sessionTo')}
              </span>
              <button
                onClick={() =>
                  updateSearch({ sessionFrom: '', sessionTo: '', status: '', page: '0' })
                }
              >
                Сбросить выбор графика
              </button>
            </>
          )}
        </div>
        {sessions.loading && <p role='status'>Загрузка сессий…</p>}
        {sessions.error && <p role='alert'>Не удалось обновить список: {sessions.error}</p>}
        {!sessions.loading && !sessions.error && sessions.data?.content.length === 0 && (
          <p>Нет сессий для выбранных фильтров.</p>
        )}
        {sessions.data && !sessions.error && !sessions.loading && (
          <>
            <p className='monitor-note'>Найдено сессий: {sessions.data.totalElements}</p>
            <div className='monitor-scroll'>
              <table>
                <thead>
                  <tr>
                    {[
                      'Запуск',
                      'Поток',
                      'Статус',
                      'Получено / объём',
                      'Отправлено / объём',
                      'Ошибка',
                      'Подробности',
                    ].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.data.content.map(s => (
                    <tr key={s.id}>
                      <td>{s.startDt.replace('T', ' ')}</td>
                      <td>
                        <Link
                          to={`/analytics/pipelines/${encodeURIComponent(s.pipelineId)}?${query}`}
                        >
                          {s.pipelineName || s.pipelineId}
                        </Link>
                      </td>
                      <td>
                        <span className={`monitor-status monitor-status-${s.status.toLowerCase()}`}>
                          {statusLabel(s.status)}
                        </span>
                      </td>
                      <td>
                        {s.receivedFiles} / {bytes(s.receivedBytes)}
                      </td>
                      <td>
                        {s.sentFiles} / {bytes(s.sentBytes)}
                        {s.unknownSizeFiles > 0 && <small>Есть неизвестный размер</small>}
                      </td>
                      <td className='monitor-error-cell'>{s.errorMessage ?? '—'}</td>
                      <td>
                        <Link to={`/sessions/${encodeURIComponent(s.id)}`}>Сессия</Link>
                        {' · '}
                        <LogsLink session={s} zone={data?.sourceTimeZone ?? zone} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {id && sessions.data.content.length > 0 && (
              <div className='monitor-charts'>
                {(['files', 'bytes'] as const).map(kind => (
                  <section className='monitor-panel' key={kind}>
                    <h2>{kind === 'files' ? 'Записи файлов' : 'Объём'} по сессиям на странице</h2>
                    <p className='monitor-note'>
                      Синий — получено, зелёный — отправлено. Подробные значения и ссылки — в
                      таблице выше.
                    </p>
                    <svg
                      viewBox='0 0 620 180'
                      role='img'
                      aria-label={`${kind === 'files' ? 'Количество файлов' : 'Объём'} по ${sessions.data!.content.length} сессиям текущей страницы`}
                    >
                      {sessions.data!.content.map((s, i) => {
                        const values =
                          kind === 'files'
                            ? [s.receivedFiles, s.sentFiles]
                            : [s.receivedBytes, s.sentBytes];
                        const max = Math.max(
                          1,
                          ...sessions.data!.content.flatMap(row =>
                            kind === 'files'
                              ? [row.receivedFiles, row.sentFiles]
                              : [row.receivedBytes, row.sentBytes],
                          ),
                        );
                        const step = 600 / sessions.data!.content.length;
                        return (
                          <a
                            key={s.id}
                            href={`/sessions/${encodeURIComponent(s.id)}`}
                            aria-label={`Сессия ${s.startDt}: получено ${kind === 'files' ? values[0] : bytes(values[0])}, отправлено ${kind === 'files' ? values[1] : bytes(values[1])}`}
                          >
                            {values.map((v, j) => (
                              <rect
                                key={j}
                                x={10 + i * step + (j * step) / 2}
                                y={150 - (v / max) * 130}
                                width={Math.max(1, step / 2 - 2)}
                                height={(v / max) * 130}
                                fill={j === 0 ? '#5d91ef' : '#269b79'}
                              >
                                <title>
                                  {s.startDt}: {j === 0 ? 'Получено' : 'Отправлено'}{' '}
                                  {kind === 'files' ? v : bytes(v)}
                                </title>
                              </rect>
                            ))}
                          </a>
                        );
                      })}
                    </svg>
                  </section>
                ))}
              </div>
            )}
            <div className='monitor-toolbar'>
              <button
                disabled={page === 0}
                onClick={() => updateSearch({ page: String(page - 1) })}
              >
                Назад
              </button>
              <span>
                Страница {page + 1} из {Math.max(1, sessions.data.totalPages)}
              </span>
              <button
                disabled={page + 1 >= sessions.data.totalPages}
                onClick={() => updateSearch({ page: String(page + 1) })}
              >
                Далее
              </button>
            </div>
          </>
        )}
      </section>
    </section>
  );
}
