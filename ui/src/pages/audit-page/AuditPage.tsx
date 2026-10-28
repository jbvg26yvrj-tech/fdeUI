import { Fragment, useEffect, useState } from 'react';
import { auditApi, type AuditEvent, type AuditPage as AuditResult } from '../../features/audit/api';
import { useUserContext } from '../../shared/hooks/useUserContext';
import './audit.css';

const results: Record<string, string> = {
  SUCCESS: 'Успешно',
  FAILURE: 'Ошибка',
  FORBIDDEN: 'Доступ запрещён',
  ACCEPTED: 'Команда принята',
  UNKNOWN: 'Результат неизвестен',
  REQUESTED: 'Запрос отправлен',
};
const entities: Record<string, string> = {
  'pipelines.pipelines': 'Поток',
  'pipelines.tasks': 'Шаг потока',
  'auth.users': 'Пользователь',
  'auth.registration_settings': 'Регистрация',
  'auth.roles': 'Роль',
  'auth.role_users': 'Назначение роли',
  'auth.role_resources': 'Права роли',
  'auth.role_client_scopes': 'Область доступа',
  'auth.role_rls': 'RLS',
  'auth.resources': 'Ресурс',
  'auth.ldap_settings': 'LDAP',
  'public.loki_connections': 'Loki',
  'public.system_information': 'Информация',
  schedule: 'Расписание',
  execution: 'Запуск / остановка',
};
const fields: Record<string, string> = {
  pipeline_name: 'Название',
  client_from: 'Источник',
  client_to: 'Получатель',
  primary_datacenter: 'Датацентр',
  all_or_nothing: 'Всё или ничего',
  login: 'Логин',
  activated: 'Активен',
  registration_enabled: 'Самостоятельная регистрация',
  password_change_required: 'Требуется смена пароля',
  credentialsChanged: 'Изменены реквизиты доступа',
  propertiesChanged: 'Изменены свойства шага',
  filterChanged: 'Изменён фильтр',
  configurationChanged: 'Изменена конфигурация',
  client_code: 'Код клиента',
  role_id: 'ID роли',
  user_id: 'ID пользователя',
  cron: 'Cron',
  enabled: 'Включено',
  name: 'Название',
  code: 'Код',
  version: 'Версия',
  task_order: 'Порядок шага',
  type_code: 'Тип шага',
};
const initial = {
  actor: '',
  targetId: '',
  targetType: '',
  result: '',
  from: '',
  to: '',
  correlationId: '',
};
function actionLabel(action: string) {
  const match = action.match(/^(.+)\.(insert|update|delete)$/);
  if (match)
    return (
      { insert: 'Создание', update: 'Изменение', delete: 'Удаление' } as Record<string, string>
    )[match[2]];
  const known: Record<string, string> = {
    'AuthController.login': 'Вход',
    'AuthController.logout': 'Выход',
    'AuthController.refresh': 'Обновление сессии',
    'AuthController.changePassword': 'Смена пароля',
    'security.authentication': 'Проверка авторизации',
    'security.authorization': 'Проверка прав',
  };
  return known[action] || action;
}
function valueText(value: unknown) {
  return value === undefined ? '—' : typeof value === 'string' ? value : JSON.stringify(value);
}
function Changes({ event }: { event: AuditEvent }) {
  const before = event.changes.before || {};
  const requested = event.changes.requested as Record<string, unknown> | undefined;
  const response = event.changes.response as Record<string, unknown> | undefined;
  const after = event.changes.after || response || requested || {};
  const afterLabel = event.changes.after
    ? 'Стало'
    : response
      ? 'Ответ dispatcher'
      : requested
        ? 'Запрошено'
        : 'Стало';
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    key => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  );
  return (
    <div className='audit-detail'>
      <dl>
        <div>
          <dt>Действие</dt>
          <dd>{event.action}</dd>
        </div>
        <div>
          <dt>Пользователь</dt>
          <dd>
            {event.actorName} · {event.actor}
          </dd>
        </div>
        <div>
          <dt>ID запроса</dt>
          <dd>
            <code>{event.correlationId}</code>
          </dd>
        </div>
        <div>
          <dt>Объект</dt>
          <dd>
            {event.targetType} · {event.targetId || '—'}
          </dd>
        </div>
      </dl>
      {keys.length ? (
        <div className='audit-diff'>
          <table>
            <caption className='sr-only'>Изменения события {event.id}</caption>
            <thead>
              <tr>
                <th>Поле</th>
                <th>Было</th>
                <th>{afterLabel}</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(key => (
                <tr key={key}>
                  <th scope='row'>{fields[key] || key}</th>
                  <td>{valueText(before[key])}</td>
                  <td>{valueText(after[key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>
          Событие результата операции. Изменения данных могут быть записаны отдельно с тем же ID
          запроса.
        </p>
      )}
      {Boolean(event.changes.beforeUnavailable) && <p>Предыдущее состояние dispatcher получить не удалось.</p>}
      {event.result === 'ACCEPTED' && (
        <p>Команда принята. Фактический результат выполнения смотрите в сессиях.</p>
      )}
      {event.result === 'UNKNOWN' && (
        <p>Результат неизвестен. Перед повторной отправкой проверьте состояние сессии.</p>
      )}
    </div>
  );
}
export default function AuditPage() {
  const { roles = [], isLoading: contextLoading } = useUserContext();
  const admin = roles.includes('ADMIN');
  const [draft, setDraft] = useState(initial),
    [filters, setFilters] = useState(initial);
  const [page, setPage] = useState(0),
    [revision, setRevision] = useState(0),
    [expanded, setExpanded] = useState<number | null>(null);
  const [data, setData] = useState<AuditResult | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    if (!admin || contextLoading) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setExpanded(null);
    const params = new URLSearchParams({ page: String(page), size: '20' });
    Object.entries(filters).forEach(([key, value]) => {
      if (value)
        params.set(
          key,
          key === 'from' || key === 'to' ? new Date(value).toISOString() : value.trim(),
        );
    });
    auditApi
      .list(params)
      .then(result => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setError('Не удалось загрузить аудит. Повторите попытку.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [admin, contextLoading, filters, page, revision]);
  if (contextLoading) return <p role='status'>Проверка доступа…</p>;
  if (!admin) return <p role='alert'>Аудит доступен только администратору.</p>;
  const field = (key: keyof typeof initial, label: string, type = 'text', placeholder?: string) => (
    <label>
      {label}
      <input
        type={type}
        value={draft[key]}
        maxLength={128}
        placeholder={placeholder}
        onChange={e => setDraft({ ...draft, [key]: e.target.value })}
      />
    </label>
  );
  return (
    <section className='audit-page'>
      <header className='audit-heading'>
        <div>
          <h1>Аудит действий</h1>
          <p>История изменений и результатов операций</p>
        </div>
        <button className='audit-button' onClick={() => setRevision(x => x + 1)} disabled={loading}>
          Обновить
        </button>
      </header>
      <details className='audit-help'>
        <summary>Справка об аудите</summary>
        <p>
          Записи доступны только для просмотра. Время показано в часовом поясе браузера. Пароли и
          секреты не сохраняются. Один запрос может содержать несколько изменений — их связывает ID
          запроса. История начинается с момента подключения аудита.
        </p>
      </details>
      <form
        className='audit-filters'
        onSubmit={e => {
          e.preventDefault();
          if (draft.from && draft.to && new Date(draft.from) > new Date(draft.to)) {
            setError('Начало периода должно быть раньше окончания.');
            return;
          }
          setFilters({ ...draft });
          setPage(0);
          setRevision(x => x + 1);
        }}
      >
        {field('actor', 'Пользователь', 'text', 'Логин или ID')}
        {field('targetId', 'ID объекта', 'text', 'Поток, пользователь или роль')}
        <label>
          Объект
          <select
            value={draft.targetType}
            onChange={e => setDraft({ ...draft, targetType: e.target.value })}
          >
            <option value=''>Все объекты</option>
            {Object.entries(entities).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Результат
          <select
            value={draft.result}
            onChange={e => setDraft({ ...draft, result: e.target.value })}
          >
            <option value=''>Все результаты</option>
            {Object.entries(results).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {field('from', 'С', 'datetime-local')}
        {field('to', 'По', 'datetime-local')}
        {field('correlationId', 'ID запроса', 'text', 'Связанные события')}
        <div className='audit-filter-actions'>
          <button className='audit-button audit-primary' type='submit'>
            Применить
          </button>
          <button
            className='audit-button'
            type='button'
            onClick={() => {
              setDraft(initial);
              setFilters(initial);
              setPage(0);
              setRevision(x => x + 1);
            }}
          >
            Сбросить
          </button>
        </div>
      </form>
      {error && (
        <p role='alert' className='audit-error'>
          {error}
        </p>
      )}
      <div className='audit-list' aria-busy={loading}>
        {loading ? (
          <p role='status' className='audit-empty'>
            Загрузка событий…
          </p>
        ) : data?.content.length ? (
          <div className='audit-table-wrap'>
            <table>
              <caption className='sr-only'>Журнал аудита</caption>
              <thead>
                <tr>
                  <th>Время</th>
                  <th>Пользователь</th>
                  <th>Действие / объект</th>
                  <th>Результат</th>
                  <th>
                    <span className='sr-only'>Подробности</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.content.map(event => (
                  <Fragment key={event.id}>
                    <tr>
                      <td>
                        <time dateTime={event.occurredAt}>
                          {new Date(event.occurredAt).toLocaleString('ru-RU')}
                        </time>
                      </td>
                      <td>
                        {event.actorName === 'system'
                          ? 'Система'
                          : event.actorName === 'anonymous'
                            ? 'Без авторизации'
                            : event.actorName || event.actor}
                      </td>
                      <td>
                        <strong>{actionLabel(event.action)}</strong>
                        <span className='audit-target'>
                          {entities[event.targetType] || event.targetType}
                          {event.targetId && (
                            <>
                              {' '}
                              · <code>{event.targetId}</code>
                            </>
                          )}
                        </span>
                      </td>
                      <td>
                        <span className={`audit-result audit-result-${event.result.toLowerCase()}`}>
                          {results[event.result] || event.result}
                        </span>
                      </td>
                      <td>
                        <button
                          className='audit-button'
                          aria-expanded={expanded === event.id}
                          aria-controls={`audit-event-${event.id}`}
                          aria-label={`Подробности события ${event.id}`}
                          onClick={() => setExpanded(expanded === event.id ? null : event.id)}
                        >
                          {expanded === event.id ? 'Скрыть' : 'Подробнее'}
                        </button>
                      </td>
                    </tr>
                    {expanded === event.id && (
                      <tr id={`audit-event-${event.id}`}>
                        <td colSpan={5}>
                          <Changes event={event} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !error && (
            <p className='audit-empty'>
              За выбранный период события не найдены. Измените фильтры или дождитесь новых действий.
            </p>
          )
        )}
      </div>
      {data && (
        <footer className='audit-pagination'>
          <span>
            Событий: {data.totalElements} · Страница {data.totalPages ? page + 1 : 0} из{' '}
            {data.totalPages}
          </span>
          <div>
            <button
              className='audit-button'
              disabled={loading || page === 0}
              onClick={() => setPage(page - 1)}
            >
              Назад
            </button>
            <button
              className='audit-button'
              disabled={loading || page + 1 >= data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Далее
            </button>
          </div>
        </footer>
      )}
    </section>
  );
}
