import { SettingsNavigation } from './SettingsNavigation';
import '../../features/analytics/monitoring.css';
import { useEffect, useState } from 'react';
import {
  ldapApi,
  type LdapConfig,
  type LdapConfigInput,
  type SyncResult,
} from '../../features/settings/ldapApi';
import { Input, PasswordInput } from '../../shared/ui/Input';

const textFields: { key: keyof LdapConfig; label: string; hint?: string; required?: boolean }[] = [
  {
    key: 'url',
    label: 'Адрес сервера',
    hint: 'Адрес с портом: ldaps://ad.example.org:636 или ldap://ad.example.org:389 для StartTLS.',
    required: true,
  },
  { key: 'baseDn', label: 'Базовый DN', required: true },
  { key: 'bindDn', label: 'DN служебной учётной записи', required: true },
  {
    key: 'userFilter',
    label: 'Фильтр пользователей',
    hint: 'Используйте {login} для подстановки логина.',
    required: true,
  },
  {
    key: 'activeFilter',
    label: 'Фильтр активности',
    hint: 'Для общего LDAP задайте фильтр активных сотрудников. Для AD также проверяются флаги отключения и срок действия.',
  },
  { key: 'loginAttribute', label: 'Атрибут логина', required: true },
  {
    key: 'idAttribute',
    label: 'Атрибут стабильного ID',
    hint: 'Для AD — objectGUID, для LDAP — entryUUID.',
    required: true,
  },
  { key: 'displayNameAttribute', label: 'Атрибут имени', required: true },
  { key: 'emailAttribute', label: 'Атрибут email', required: true },
];
const numericFields = [
  { key: 'syncIntervalMinutes', label: 'Интервал синхронизации, мин', min: 1, max: 1440 },
  { key: 'connectTimeoutMs', label: 'Таймаут подключения, мс', min: 500, max: 10000 },
  { key: 'readTimeoutMs', label: 'Таймаут чтения, мс', min: 500, max: 15000 },
] as const;
const buttonClass =
  'rounded-md border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed';

export default function LdapSettingsPage() {
  const [config, setConfig] = useState<LdapConfig | null>(null);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<SyncResult | null>(null);
  const [busy, setBusy] = useState<string | null>('load');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [savedSyncEnabled, setSavedSyncEnabled] = useState(false);

  async function load() {
    setBusy('load');
    setError('');
    try {
      const settings = await ldapApi.get();
      setConfig(settings);
      setSavedSyncEnabled(settings.syncEnabled);
      try {
        setStatus(await ldapApi.status());
      } catch {
        setError('Настройки загружены, но итог последней синхронизации недоступен.');
      }
    } catch {
      setError('Не удалось загрузить настройки LDAP. Повторите попытку.');
    } finally {
      setBusy(null);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  function update<K extends keyof LdapConfig>(key: K, value: LdapConfig[K]) {
    setConfig(previous => (previous ? { ...previous, [key]: value } : previous));
    setDirty(true);
    setMessage('');
  }
  function payload(): LdapConfigInput {
    const { bindPasswordConfigured: _configured, ...fields } = config!;
    return { ...fields, ...(password ? { bindPassword: password } : {}) };
  }
  async function perform(action: 'save' | 'test' | 'sync') {
    if (!config || busy) return;
    setBusy(action);
    setError('');
    setMessage('');
    try {
      if (action === 'save') {
        const result = await ldapApi.save(payload());
        setConfig(result);
        setSavedSyncEnabled(result.syncEnabled);
        setPassword('');
        setDirty(false);
        setMessage('Настройки LDAP сохранены.');
      } else if (action === 'test') {
        const result = await ldapApi.test(payload());
        if (result.success) setMessage(result.message);
        else setError(result.message);
      } else {
        const result = await ldapApi.sync();
        setStatus(result);
        if (result.status === 'FAILED' || result.status === 'ERROR')
          setError(result.message || 'Синхронизация завершилась с ошибкой.');
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Не удалось выполнить действие. Повторите попытку.',
      );
      if (action === 'sync') {
        try {
          setStatus(await ldapApi.status());
        } catch {
          /* The last confirmed result remains visible. */
        }
      }
    } finally {
      setBusy(null);
    }
  }

  if (!config)
    return (
      <section className='max-w-4xl mx-auto'>
        <h1 className='text-3xl font-semibold mb-6'>Настройки LDAP</h1>
        {busy ? (
          <p role='status'>Загрузка настроек…</p>
        ) : (
          <div role='alert'>
            <p>{error}</p>
            <button className={`${buttonClass} mt-4`} onClick={() => void load()}>
              Повторить
            </button>
          </div>
        )}
      </section>
    );

  return (
    <section className='fde-settings max-w-5xl mx-auto pb-8'>
      <SettingsNavigation />
      <h1 className='fde-page-title'>Доменный вход и синхронизация</h1>
      <p className='mt-3 max-w-2xl text-slate-600 dark:text-slate-300'>
        Сотрудники входят с учётной записью организации. После первого входа администратор назначает
        роли в разделе «Права доступа».
      </p>
      {error && (
        <div
          role='alert'
          className='mt-6 rounded-md border border-red-300 bg-red-50 text-red-900 p-4'
        >
          {error}
        </div>
      )}
      {message && (
        <div
          role='status'
          className='mt-6 rounded-md border border-green-300 bg-green-50 text-green-900 p-4'
        >
          {message}
        </div>
      )}
      <form
        className='fde-panel mt-6'
        onSubmit={event => {
          event.preventDefault();
          void perform('save');
        }}
      >
        <fieldset disabled={Boolean(busy)} className='space-y-8'>
          <div className='flex flex-wrap gap-6 border-b border-slate-200 dark:border-slate-700 pb-6'>
            <label className='flex items-center gap-3'>
              <input
                type='checkbox'
                checked={config.enabled}
                onChange={event => update('enabled', event.target.checked)}
              />
              Доменный вход включён
            </label>
            <label className='flex items-center gap-3'>
              <input
                type='checkbox'
                checked={config.syncEnabled}
                onChange={event => update('syncEnabled', event.target.checked)}
              />
              Синхронизация включена
            </label>
          </div>
          <div className='grid sm:grid-cols-2 gap-5'>
            <label className='text-sm font-medium'>
              Тип каталога
              <select
                className='block w-full mt-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-2'
                value={config.directoryType}
                onChange={event =>
                  update('directoryType', event.target.value as LdapConfig['directoryType'])
                }
              >
                <option value='AD'>Active Directory</option>
                <option value='LDAP'>LDAP</option>
              </select>
            </label>
            <label className='text-sm font-medium'>
              Защищённое соединение
              <select
                className='block w-full mt-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-2'
                value={config.tlsMode}
                onChange={event => update('tlsMode', event.target.value as LdapConfig['tlsMode'])}
              >
                <option value='LDAPS'>LDAPS</option>
                <option value='STARTTLS'>StartTLS</option>
              </select>
            </label>
            {textFields.slice(0, 3).map(field => (
              <Input
                key={field.key}
                label={field.label}
                value={String(config[field.key] ?? '')}
                required={field.required}
                hint={field.hint}
                onChange={event => update(field.key, event.target.value)}
              />
            ))}
            <PasswordInput
              label='Пароль служебной учётной записи'
              autoComplete='new-password'
              value={password}
              onChange={event => {
                setPassword(event.target.value);
                setDirty(true);
              }}
              hint={
                config.bindPasswordConfigured
                  ? 'Пароль уже сохранён. Оставьте поле пустым, чтобы сохранить его.'
                  : 'Пароль ещё не задан.'
              }
            />
          </div>
          <p className='text-sm text-slate-600 dark:text-slate-300'>
            Сертификат и имя сервера проверяются обязательно. Для корпоративного центра сертификации
            настройте доверенный сертификат на сервере FDE.
          </p>
          <div className='fde-section'>
            <h2 className='font-semibold text-lg mb-5'>Поиск и атрибуты сотрудников</h2>
            <div className='grid sm:grid-cols-2 gap-6'>
              {textFields.slice(3).map(field => (
                <Input
                  key={field.key}
                  label={field.label}
                  value={String(config[field.key] ?? '')}
                  required={field.required}
                  hint={field.hint}
                  onChange={event => update(field.key, event.target.value)}
                />
              ))}
            </div>
          </div>
          <div className='fde-section grid sm:grid-cols-3 gap-5'>
            {numericFields.map(field => (
              <Input
                key={field.key}
                type='number'
                required
                min={field.min}
                max={field.max}
                step={1}
                label={field.label}
                value={config[field.key]}
                onChange={event => update(field.key, Number(event.target.value))}
              />
            ))}
          </div>
          <div className='flex flex-wrap items-center gap-3'>
            <button
              type='submit'
              className={`${buttonClass} !bg-blue-700 !text-white !border-blue-700`}
            >
              {busy === 'save' ? 'Сохранение…' : 'Сохранить'}
            </button>
            <button
              type='button'
              className={buttonClass}
              onClick={event => {
                if (event.currentTarget.form?.reportValidity()) void perform('test');
              }}
            >
              {busy === 'test' ? 'Проверка…' : 'Проверить подключение'}
            </button>
            <span className='text-sm text-slate-500'>
              {dirty ? 'Есть несохранённые изменения' : ''}
            </span>
          </div>
          <p className='text-sm text-slate-600 dark:text-slate-300'>
            Проверка использует заполненную форму и не сохраняет настройки.
          </p>
        </fieldset>
      </form>
      <section className='fde-panel mt-6' aria-labelledby='sync-heading'>
        <h2 id='sync-heading' className='text-xl font-semibold'>
          Синхронизация сотрудников
        </h2>
        <p className='mt-3 text-slate-600 dark:text-slate-300 max-w-2xl'>
          Проверяются только сотрудники, которые уже входили в FDE. Отключение применяется после
          успешной проверки каталога. Ошибка соединения не блокирует пользователей.
        </p>
        <button
          type='button'
          disabled={Boolean(busy) || !savedSyncEnabled}
          className={`${buttonClass} mt-5`}
          onClick={() => void perform('sync')}
        >
          {busy === 'sync' ? 'Синхронизация…' : 'Синхронизировать сейчас'}
        </button>
        <p className='mt-2 text-sm text-slate-500 dark:text-slate-400'>
          {savedSyncEnabled
            ? 'Запуск использует сохранённые настройки.'
            : 'Для запуска включите синхронизацию и сохраните настройки.'}
        </p>
        <div className='mt-5 p-5 bg-slate-100 dark:bg-slate-800 rounded-md' aria-live='polite'>
          {!status || status.status === 'NEVER' ? (
            <p>Синхронизация ещё не выполнялась.</p>
          ) : (
            <>
              <p className='font-medium'>
                Последняя попытка:{' '}
                {status.finishedAt
                  ? new Date(status.finishedAt).toLocaleString('ru-RU')
                  : 'Время не указано'}
              </p>
              <p className='mt-2'>{status.message || status.status}</p>
              <div className='flex flex-wrap gap-5 mt-3 text-sm'>
                <span>Проверено: {status.checked}</span>
                <span>Обновлено: {status.updated}</span>
                <span>Деактивировано: {status.deactivated}</span>
              </div>
            </>
          )}
        </div>
      </section>
    </section>
  );
}
