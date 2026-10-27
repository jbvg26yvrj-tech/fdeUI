import { useEffect, useState } from 'react';
import { lokiApi, safeDraft, type LokiConnection } from '../../features/logs/api';
import { SettingsNavigation } from './SettingsNavigation';
import '../../features/analytics/monitoring.css';
const empty: LokiConnection = {
  name: '',
  description: '',
  enabled: true,
  baseUrl: '',
  authType: 'NONE',
  username: '',
  tenantId: '',
  labels: {},
  sessionField: 'sessionId',
  pipelineField: 'pipelineId',
  levelField: 'level',
  correlationMode: 'JSON',
  datacenter: '',
  timeoutSeconds: 10,
  limit: 500,
  maxHours: 24,
};
export default function LokiSettingsPage() {
  const [connections, setConnections] = useState<LokiConnection[]>([]);
  const [draft, setDraft] = useState<LokiConnection | null>(null);
  const [labels, setLabels] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    let current = true;
    lokiApi
      .list()
      .then(
        data => {
          if (current) setConnections(data.map(safeDraft));
        },
        () => {
          if (current) setError('Не удалось загрузить подключения Loki. Обновите страницу.');
        },
      )
      .finally(() => {
        if (current) setBusy(false);
      });
    return () => {
      current = false;
    };
  }, []);
  function select(connection: LokiConnection) {
    setDraft(safeDraft(connection));
    setLabels(
      Object.entries(connection.labels)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n'),
    );
    setError('');
    setMessage('');
  }
  function update<K extends keyof LokiConnection>(key: K, value: LokiConnection[K]) {
    setDraft(old => (old ? { ...old, [key]: value } : old));
    setMessage('');
    setError('');
  }
  async function perform(action: 'save' | 'test') {
    if (!draft || busy) return;
    setError('');
    setMessage('');
    const parsed: Record<string, string> = {};
    for (const line of labels.split('\n').filter(x => x.trim())) {
      const index = line.indexOf('=');
      if (index < 1) {
        setError('Каждая метка должна иметь вид имя=значение.');
        return;
      }
      const key = line.slice(0, index).trim();
      if (Object.prototype.hasOwnProperty.call(parsed, key)) {
        setError('Имена меток не должны повторяться.');
        return;
      }
      parsed[key] = line.slice(index + 1).trim();
    }
    setBusy(true);
    try {
      const payload = { ...draft, labels: parsed };
      if (action === 'test') {
        const result = await lokiApi.test(payload);
        const text = `${result.message} Проверено: ${result.checkedAt ?? new Date().toISOString()}. Настройки не сохранены.`;
        if (result.success) setMessage(text);
        else setError(text);
      } else {
        const saved = safeDraft(await lokiApi.save(payload));
        setConnections(old => [...old.filter(c => c.id !== saved.id), saved]);
        select(saved);
        setMessage(saved.enabled ? 'Подключение сохранено.' : 'Подключение сохранено и отключено.');
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Действие не выполнено. Проверьте параметры и доступность источника. Хост и порт должны быть разрешены на сервере FDE; секреты и сертификаты проверяет сервер.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className='monitor-page'>
      <SettingsNavigation />
      <header>
        <h1 className='fde-page-title'>Подключения Loki</h1>
        <p>Внешние источники логов. Проверка использует форму и не сохраняет изменения.</p>
      </header>
      {error && <p role='alert'>{error}</p>}
      {message && <p role='status'>{message}</p>}
      <div className='monitor-settings-layout'>
        <section className='monitor-panel'>
          <h2>Источники</h2>
          {busy && !draft && <p role='status'>Загрузка…</p>}
          {!busy && !connections.length && !error && <p>Подключения ещё не добавлены.</p>}
          <ul className='monitor-connection-list'>
            {connections.map(c => (
              <li key={c.id}>
                <button disabled={busy} aria-pressed={draft?.id === c.id} onClick={() => select(c)}>
                  {c.name}
                  <small>{c.enabled ? 'Включено' : 'Отключено'}</small>
                </button>
              </li>
            ))}
          </ul>
          <button disabled={busy} onClick={() => select({ ...empty })}>
            Добавить подключение
          </button>
        </section>
        {draft && (
          <form
            className='monitor-panel'
            onSubmit={e => {
              e.preventDefault();
              void perform('save');
            }}
          >
            <h2>{draft.id ? 'Изменить подключение' : 'Новое подключение'}</h2>
            <fieldset disabled={busy}>
              <div className='monitor-filters'>
                {(
                  [
                    { key: 'name', label: 'Название', required: true },
                    { key: 'description', label: 'Описание' },
                    { key: 'baseUrl', label: 'URL сервера', required: true },
                    { key: 'tenantId', label: 'Tenant ID' },
                    { key: 'datacenter', label: 'Датацентр' },
                  ] as const
                ).map(field => (
                  <label key={field.key}>
                    {field.label}
                    <input
                      required={'required' in field && field.required}
                      value={draft[field.key]}
                      onChange={e => update(field.key, e.target.value)}
                    />
                  </label>
                ))}
                <label>
                  Авторизация
                  <select
                    value={draft.authType}
                    onChange={e => update('authType', e.target.value as LokiConnection['authType'])}
                  >
                    <option value='NONE'>Без авторизации</option>
                    <option value='BASIC'>Basic</option>
                    <option value='BEARER'>Bearer token</option>
                  </select>
                </label>
                {draft.authType === 'BASIC' && (
                  <label>
                    Имя пользователя
                    <input
                      autoComplete='off'
                      value={draft.username}
                      onChange={e => update('username', e.target.value)}
                    />
                  </label>
                )}
                {draft.authType !== 'NONE' && (
                  <label>
                    {draft.authType === 'BASIC' ? 'Пароль' : 'Токен'}
                    <input
                      type='password'
                      autoComplete='new-password'
                      value={draft.secret ?? ''}
                      disabled={draft.clearSecret}
                      onChange={e => update('secret', e.target.value)}
                    />
                    <small>
                      {draft.secretConfigured
                        ? 'Секрет сохранён. Пустое поле сохраняет его.'
                        : 'Секрет ещё не задан.'}
                    </small>
                  </label>
                )}
                <label className='monitor-check'>
                  <input
                    type='checkbox'
                    checked={draft.clearSecret ?? false}
                    onChange={e => {
                      update('clearSecret', e.target.checked);
                      if (e.target.checked) update('secret', '');
                    }}
                  />
                  Удалить сохранённый секрет при сохранении
                </label>
                <label className='monitor-check'>
                  <input
                    type='checkbox'
                    checked={draft.enabled}
                    onChange={e => update('enabled', e.target.checked)}
                  />
                  Подключение включено
                </label>
              </div>
              <p className='monitor-note'>
                Отключение скрывает источник из поиска и сохраняет его настройки. TLS проверяется
                обязательно; корпоративные CA и разрешённые адреса настраиваются на сервере FDE.
              </p>
              <label className='monitor-label'>
                Базовые метки (по одной имя=значение в строке)
                <textarea
                  rows={3}
                  required
                  value={labels}
                  onChange={e => {
                    setLabels(e.target.value);
                    setMessage('');
                  }}
                  placeholder='app=fde'
                />
              </label>
              <div className='monitor-filters'>
                <label>
                  Корреляция
                  <select
                    value={draft.correlationMode}
                    onChange={e =>
                      update('correlationMode', e.target.value as LokiConnection['correlationMode'])
                    }
                  >
                    <option value='JSON'>Поля JSON</option>
                    <option value='METADATA'>Structured metadata</option>
                  </select>
                </label>
                {(
                  [
                    { key: 'sessionField', label: 'Поле sessionId' },
                    { key: 'pipelineField', label: 'Поле pipelineId' },
                    { key: 'levelField', label: 'Поле уровня' },
                  ] as const
                ).map(f => (
                  <label key={f.key}>
                    {f.label}
                    <input value={draft[f.key]} onChange={e => update(f.key, e.target.value)} />
                  </label>
                ))}
                {(
                  [
                    { key: 'timeoutSeconds', label: 'Таймаут, секунды', max: 30 },
                    { key: 'limit', label: 'Лимит строк', max: 1000 },
                    { key: 'maxHours', label: 'Максимальное окно, часы', max: 24 },
                  ] as const
                ).map(f => (
                  <label key={f.key}>
                    {f.label}
                    <input
                      type='number'
                      min={1}
                      max={f.max}
                      required
                      value={draft[f.key]}
                      onChange={e => update(f.key, Number(e.target.value))}
                    />
                  </label>
                ))}
              </div>
              <p className='monitor-note'>
                Без поля sessionId просмотр логов сессий недоступен обычным пользователям.
              </p>
              <div className='monitor-toolbar'>
                <button className='monitor-primary' type='submit'>
                  {busy ? 'Выполнение…' : 'Сохранить'}
                </button>
                <button
                  type='button'
                  onClick={e => {
                    if (e.currentTarget.form?.reportValidity()) void perform('test');
                  }}
                >
                  Проверить подключение
                </button>
              </div>
            </fieldset>
          </form>
        )}
      </div>
    </section>
  );
}
