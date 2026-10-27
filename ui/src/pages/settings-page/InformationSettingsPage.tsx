import { useEffect, useState } from 'react';
import {
  informationApi,
  safeInformationUrl,
  type InformationBlock,
  type InformationDocument,
} from '../../features/information/api';
import { InformationBlocks } from '../../features/information/InformationBlocks';
import { useUserContext } from '../../shared/hooks/useUserContext';
import { canAccessPath } from '../../shared/lib/access';
import { SettingsNavigation } from './SettingsNavigation';
function moved<T>(items: T[], index: number, direction: number): T[] {
  const next = [...items];
  [next[index], next[index + direction]] = [next[index + direction], next[index]];
  return next;
}
export default function InformationSettingsPage() {
  const { roles, permissions, isLoading: contextLoading } = useUserContext();
  const allowed = canAccessPath('/settings/information', permissions, roles);
  const [document, setDocument] = useState<InformationDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  const [preview, setPreview] = useState<'ALL' | 'ADMIN'>('ALL');
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setLoading(true);
    setError('');
    informationApi
      .read()
      .then(value => {
        if (active) {
          setDocument(value);
          setConflict(false);
          setMessage('');
        }
      })
      .catch(e => {
        if (active) setError(e instanceof Error ? e.message : 'Не удалось загрузить информацию');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [allowed, reload]);
  const change = (blocks: InformationBlock[]) => {
    if (document) setDocument({ ...document, blocks });
    setMessage('');
  };
  const update = (index: number, patch: Partial<InformationBlock>) => {
    if (document)
      change(document.blocks.map((block, i) => (i === index ? { ...block, ...patch } : block)));
  };
  const save = async () => {
    if (!document) return;
    if (
      document.blocks.some(
        b => !b.title.trim() || b.links.some(l => !l.label.trim() || !safeInformationUrl(l.url)),
      )
    ) {
      setError('Укажите заголовки, подписи и ссылки HTTP(S) без логина и пароля.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      setDocument(await informationApi.save(document));
      setConflict(false);
      setMessage('Изменения сохранены');
    } catch (e) {
      const stale = typeof e === 'object' && e !== null && 'status' in e && e.status === 409;
      setConflict(stale);
      setError(
        stale
          ? 'Другой администратор изменил информацию. Ваш текст сохранён в редакторе. Скопируйте нужные изменения перед загрузкой актуальной версии.'
          : e instanceof Error
            ? e.message
            : 'Не удалось сохранить информацию',
      );
    } finally {
      setSaving(false);
    }
  };
  if (contextLoading) return <p role='status'>Проверка доступа…</p>;
  if (!allowed) return <p role='alert'>Доступ только для администратора</p>;
  return (
    <main className='information-editor'>
      <SettingsNavigation />
      <h1 className='fde-page-title'>Информация о системе</h1>
      <p>
        Инструкции и полезные ссылки на странице «О системе». До 20 разделов; текст до 10 000
        знаков, до 10 ссылок в разделе.
      </p>
      {loading && <p role='status'>Загрузка информации…</p>}
      {error && (
        <div role='alert' className='information-notice information-error'>
          {error}
        </div>
      )}
      {message && (
        <p role='status' className='information-notice'>
          {message}
        </p>
      )}
      {!loading && !document && (
        <button onClick={() => setReload(n => n + 1)}>Повторить загрузку</button>
      )}
      {conflict && (
        <button disabled={saving || loading} onClick={() => setReload(n => n + 1)}>
          Загрузить актуальную версию
        </button>
      )}
      {document && !loading && (
        <>
          <fieldset disabled={saving}>
            {document.blocks.length === 0 && (
              <p className='information-notice'>
                Разделов пока нет. Вводная информация о FDE остаётся на странице «О системе».
              </p>
            )}
            {document.blocks.map((block, index) => (
              <fieldset key={block.id} className='fde-panel information-edit-block'>
                <legend>Раздел {index + 1}</legend>
                <div className='information-actions'>
                  <button
                    aria-label={`Раздел ${index + 1} выше`}
                    disabled={index === 0}
                    onClick={() => change(moved(document.blocks, index, -1))}
                  >
                    ↑ Выше
                  </button>
                  <button
                    aria-label={`Раздел ${index + 1} ниже`}
                    disabled={index === document.blocks.length - 1}
                    onClick={() => change(moved(document.blocks, index, 1))}
                  >
                    ↓ Ниже
                  </button>
                  <button onClick={() => change(document.blocks.filter((_, i) => i !== index))}>
                    Удалить раздел {index + 1}
                  </button>
                </div>
                <label>
                  Заголовок {index + 1}
                  <input
                    maxLength={160}
                    value={block.title}
                    onChange={e => update(index, { title: e.target.value })}
                  />
                </label>
                <label>
                  Текст {index + 1}
                  <textarea
                    maxLength={10000}
                    value={block.body}
                    onChange={e => update(index, { body: e.target.value })}
                  />
                </label>
                <label>
                  Аудитория {index + 1}
                  <select
                    value={block.audience}
                    onChange={e => update(index, { audience: e.target.value as 'ALL' | 'ADMIN' })}
                  >
                    <option value='ALL'>Все пользователи</option>
                    <option value='ADMIN'>Только администраторы</option>
                  </select>
                </label>
                {block.links.map((link, li) => (
                  <div className='information-link-row' key={li}>
                    <label>
                      Подпись ссылки {index + 1}.{li + 1}
                      <input
                        maxLength={160}
                        value={link.label}
                        onChange={e =>
                          update(index, {
                            links: block.links.map((l, i) =>
                              i === li ? { ...l, label: e.target.value } : l,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Адрес ссылки {index + 1}.{li + 1}
                      <input
                        type='url'
                        maxLength={2048}
                        placeholder='https://'
                        value={link.url}
                        onChange={e =>
                          update(index, {
                            links: block.links.map((l, i) =>
                              i === li ? { ...l, url: e.target.value } : l,
                            ),
                          })
                        }
                      />
                    </label>
                    <div className='information-actions'>
                      <button
                        aria-label={`Ссылка ${index + 1}.${li + 1} выше`}
                        disabled={li === 0}
                        onClick={() => update(index, { links: moved(block.links, li, -1) })}
                      >
                        ↑
                      </button>
                      <button
                        aria-label={`Ссылка ${index + 1}.${li + 1} ниже`}
                        disabled={li === block.links.length - 1}
                        onClick={() => update(index, { links: moved(block.links, li, 1) })}
                      >
                        ↓
                      </button>
                      <button
                        onClick={() =>
                          update(index, { links: block.links.filter((_, i) => i !== li) })
                        }
                      >
                        Удалить ссылку {index + 1}.{li + 1}
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  disabled={block.links.length >= 10}
                  onClick={() => update(index, { links: [...block.links, { label: '', url: '' }] })}
                >
                  Добавить ссылку в раздел {index + 1}
                </button>
              </fieldset>
            ))}
            <div className='information-actions'>
              <button
                disabled={document.blocks.length >= 20}
                onClick={() =>
                  change([
                    ...document.blocks,
                    { id: crypto.randomUUID(), title: '', body: '', links: [], audience: 'ALL' },
                  ])
                }
              >
                Добавить раздел
              </button>
              <button className='information-save' disabled={conflict} onClick={save}>
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </fieldset>
          <section>
            <h2 className='text-xl font-semibold mt-8'>Предпросмотр</h2>
            <label>
              Показать для
              <select value={preview} onChange={e => setPreview(e.target.value as 'ALL' | 'ADMIN')}>
                <option value='ALL'>Пользователя</option>
                <option value='ADMIN'>Администратора</option>
              </select>
            </label>
            <InformationBlocks
              blocks={document.blocks.filter(b => preview === 'ADMIN' || b.audience === 'ALL')}
            />
          </section>
        </>
      )}
    </main>
  );
}
