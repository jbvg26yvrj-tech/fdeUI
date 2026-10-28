import { useEffect, useState } from 'react';
import { apiClient } from '../../shared/api/apiClient';
import { SettingsNavigation } from './SettingsNavigation';
import { useUserContext } from '../../shared/hooks/useUserContext';

export default function AccessSettingsPage() {
  const { roles, isLoading } = useUserContext();
  const allowed = roles.includes('ADMIN');
  const [enabled,setEnabled] = useState<boolean | null>(null);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const [reload,setReload] = useState(0);
  useEffect(() => {
    if (!allowed) return;
    let active=true;
    setError('');
    apiClient.get<{registrationEnabled:boolean}>('/settings/access')
      .then(r => { if(active) setEnabled(r.registrationEnabled); })
      .catch(() => { if(active) setError('Не удалось загрузить настройки.'); });
    return () => { active=false; };
  },[allowed,reload]);
  if(isLoading) return <p role='status'>Проверка доступа…</p>;
  if(!allowed) return <p role='alert'>Доступ только для администратора.</p>;
  async function save() {
    setSaving(true);setError('');setMessage('');
    try { await apiClient.put('/settings/access',{registrationEnabled:enabled});setMessage('Настройки сохранены'); }
    catch { setError('Не удалось сохранить настройки. Повторите попытку.'); }
    finally { setSaving(false); }
  }
  return <div className='space-y-6'>
    <SettingsNavigation />
    <h1 className='text-2xl font-semibold'>Доступ к системе</h1>
    <section className='fde-entity-card p-6 space-y-5 max-w-2xl'>
      <h2 className='text-lg font-semibold'>Самостоятельная регистрация</h2>
      <p>Новый пользователь сразу может войти и прочитать информацию о системе. Доступ к потокам открывается после назначения роли администратором.</p>
      {enabled===null ? <p role='status'>Настройки ещё не загружены.</p> : <label className='flex items-center gap-3'><input type='checkbox' checked={enabled} disabled={saving} onChange={e=>{setEnabled(e.target.checked);setMessage('');}} />Разрешить регистрацию</label>}
      <p className='text-sm'>При отключении ссылка на регистрацию исчезнет, создание аккаунта через форму и API будет запрещено. Вход существующих пользователей и доменный вход продолжат работать.</p>
      {error && <div role='alert'>{error} {enabled===null && <button onClick={()=>setReload(v=>v+1)}>Повторить загрузку</button>}</div>}
      {message && <p role='status'>{message}</p>}
      <button className='rounded-md px-4 py-2 bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed' disabled={enabled===null || saving} onClick={()=>void save()}>{saving?'Сохранение…':'Сохранить'}</button>
    </section>
  </div>;
}
