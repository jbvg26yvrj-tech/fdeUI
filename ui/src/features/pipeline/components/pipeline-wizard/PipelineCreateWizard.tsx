import { useEffect, useRef, useState } from 'react';
import type { PipelineData, SimplePipelineData } from '../../types/Types';
import type { TaskType } from '../../types/TaskTypes';
import type { PipelineFormSaveValues } from '../PipelineFormModal';
import { pipelinesCrudApi } from '../../api/pipelinesCrudApi';
import { ReusePicker } from './ReusePicker';
import {
  actionLabels,
  actions,
  allowed,
  copyPipeline,
  copyTask,
  emptyDraft,
  emptyTask,
  labels,
  newId,
  propValue,
  protocolLabels,
  protocols,
  serialize,
  splitType,
  supported,
  taskTitle,
} from './model';
import type { Draft, DraftTask, Schema } from './model';
import './pipeline-wizard.css';
interface Props {
  onClose: () => void;
  onSave: (values: PipelineFormSaveValues) => void | Promise<PipelineData | undefined>;
  isLoading?: boolean;
}
export function PipelineCreateWizard({ onClose, onSave, isLoading = false }: Props) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [step, setStep] = useState(0);
  const [visited, setVisited] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [schemas, setSchemas] = useState<Record<string, Schema>>({});
  const [schemaError, setSchemaError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [created, setCreated] = useState<PipelineData>();
  const [closing, setClosing] = useState(false);
  const [source, setSource] = useState<PipelineData>();
  const [replace, setReplace] = useState(false);
  const [records, setRecords] = useState<SimplePipelineData[]>([]);
  const dialog = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const alive = useRef(true);
  const typeKey = [...new Set(draft.tasks.map(t => t.typeCode))].sort().join(',');
  const busy = saving || isLoading;
  const review = step === draft.tasks.length + 1;
  const task = step > 0 && !review ? draft.tasks[step - 1] : undefined;
  useEffect(() => {
    alive.current = true;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    title.current?.focus();
    return () => {
      alive.current = false;
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    title.current?.focus();
  }, [step, created]);
  useEffect(() => {
    let cancelled = false;
    setSchemaError(false);
    const types = typeKey.split(',').filter(Boolean);
    void Promise.all(
      types.map(async type => ({ type, schema: await pipelinesCrudApi.getTaskProps(type) })),
    )
      .then(results => {
        if (!cancelled)
          setSchemas(previous => ({
            ...previous,
            ...Object.fromEntries(results.map(({ type, schema }) => [type, schema])),
          }));
      })
      .catch(() => {
        if (!cancelled) setSchemaError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [typeKey, retry]);
  function change(update: (previous: Draft) => Draft) {
    setDraft(update);
    setDirty(true);
    setError('');
  }
  function close() {
    if (savingRef.current || isLoading) return;
    if (dirty && !created) setClosing(true);
    else onClose();
  }
  function go(next: number) {
    setStep(next);
    setVisited(v => Math.max(v, next));
    setError('');
  }
  function generalError() {
    if (
      draft.pipelineName.length > 255 ||
      draft.clientFrom.length > 100 ||
      draft.clientTo.length > 100
    )
      return 'Название — не более 255 символов, имена клиентов — не более 100.';
    return !draft.pipelineName.trim() || !draft.clientFrom.trim() || !draft.clientTo.trim()
      ? 'Заполните название, клиента-источника и клиента-получателя.'
      : '';
  }
  function taskError(t: DraftTask) {
    if (draft.tasks[0]?.id === t.id && splitType(t.typeCode).action !== 'Download')
      return 'Первая операция получает файлы: выберите Скачать (Download).';
    if (
      schemas[t.typeCode]?.optional.includes('preserveStructure') &&
      propValue(t, 'preserveStructure') === 'true' &&
      propValue(t, 'recursive') !== 'true'
    )
      return 'Чтобы сохранять структуру, включите рекурсивный обход в дополнительных параметрах.';
    if (!supported(t.typeCode)) return 'Выберите поддерживаемый протокол и действие.';
    const schema = schemas[t.typeCode];
    if (!schema || schemaError)
      return 'Дождитесь загрузки параметров операции или повторите загрузку.';
    const missing = schema.required.filter(key => !allowed.has(key) || !propValue(t, key).trim());
    return missing.length
      ? `Заполните обязательные параметры: ${missing.map(key => labels[key] || key).join(', ')}.`
      : '';
  }
  function next() {
    const problem = step === 0 ? generalError() : task ? taskError(task) : '';
    if (problem) setError(problem);
    else go(step + 1);
  }
  function updateTask(id: string, update: (t: DraftTask) => DraftTask) {
    change(prev => ({ ...prev, tasks: prev.tasks.map(t => (t.id === id ? update(t) : t)) }));
  }
  function addTask(copy?: DraftTask) {
    const added = copy
      ? { ...copy, id: newId(), props: copy.props.map(p => ({ ...p })) }
      : emptyTask();
    change(prev => ({ ...prev, tasks: [...prev.tasks, added] }));
    go(draft.tasks.length + 1);
  }
  function moveTask(index: number, offset: number) {
    const first =
      index + offset === 0
        ? draft.tasks[index]
        : index === 0
          ? draft.tasks[index + offset]
          : draft.tasks[0];
    if (splitType(first.typeCode).action !== 'Download') {
      setError(
        'Первая операция получает файлы: на первом месте должна оставаться операция Скачать (Download).',
      );
      return;
    }
    change(prev => {
      const tasks = [...prev.tasks];
      [tasks[index], tasks[index + offset]] = [tasks[index + offset], tasks[index]];
      return { ...prev, tasks };
    });
    go(index + offset + 1);
  }
  function applySource() {
    if (!source) return;
    change(() => copyPipeline(source));
    setReplace(false);
    setStep(0);
    setVisited(0);
  }
  async function save() {
    if (savingRef.current || isLoading || created) return;
    const problem =
      generalError() ||
      (!draft.tasks.length
        ? 'Добавьте хотя бы одну операцию.'
        : draft.tasks.map(taskError).find(Boolean));
    if (problem) {
      setError(problem);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const result = await onSave(serialize(draft, schemas));
      if (alive.current) {
        if (result?.id) setCreated(result);
        else
          setError(
            'Сохранение не подтверждено. Настройки сохранены в форме; проверьте результат и повторите попытку.',
          );
      }
    } catch (cause) {
      if (alive.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Не удалось создать пайплайн. Настройки сохранены в форме.',
        );
    } finally {
      savingRef.current = false;
      if (alive.current) setSaving(false);
    }
  }
  const clientValues = [...new Set(records.flatMap(row => [row.clientFrom, row.clientTo]))].filter(
    Boolean,
  );
  function suggestions(key: string, current: DraftTask) {
    const { protocol, action } = splitType(current.typeCode);
    const client = action === 'Upload' ? draft.clientTo : draft.clientFrom;
    const values: { value: string; from: string }[] = [];
    draft.tasks
      .filter(
        t =>
          t.id !== current.id &&
          splitType(t.typeCode).protocol === protocol &&
          (splitType(t.typeCode).action === 'Upload' ? draft.clientTo : draft.clientFrom) ===
            client,
      )
      .forEach(t => {
        const value = propValue(t, key);
        if (value)
          values.push({ value, from: `Операция ${draft.tasks.indexOf(t) + 1} этого пайплайна` });
      });
    source?.tasks
      .filter(
        t =>
          splitType(t.typeCode).protocol === protocol &&
          (splitType(t.typeCode).action === 'Upload' ? source.clientTo : source.clientFrom) ===
            client,
      )
      .forEach(t => {
        if (t.props[key]) values.push({ value: t.props[key], from: source.pipelineName });
      });
    return values.filter(
      (value, index) => values.findIndex(other => other.value === value.value) === index,
    );
  }
  function field(key: string, current: DraftTask, required: boolean) {
    const value = propValue(current, key);
    const id = `pw-${current.id}-${key}`;
    const update = (value: string) =>
      updateTask(current.id, t => ({
        ...t,
        props: [...t.props.filter(p => p.key !== key), { key, value }],
      }));
    const options = suggestions(key, current);
    return (
      <label key={key} htmlFor={id} className='pw-field'>
        <span className={required ? 'pw-required' : undefined}>{labels[key] || key}</span>
        {['recursive', 'preserveStructure'].includes(key) ? (
          <input
            id={id}
            aria-label={labels[key] || key}
            type='checkbox'
            checked={value === 'true'}
            onChange={e => update(String(e.target.checked))}
          />
        ) : key === 'maskType' ? (
          <select
            id={id}
            aria-label={labels[key] || key}
            value={value}
            onChange={e => update(e.target.value)}
          >
            <option value='GLOB'>GLOB</option>
            <option value='REGEX'>REGEX</option>
          </select>
        ) : (
          <input
            id={id}
            aria-label={labels[key] || key}
            required={required}
            value={value}
            list={`${id}-options`}
            onChange={e => update(e.target.value)}
          />
        )}
        {options.length > 0 && (
          <>
            <datalist id={`${id}-options`}>
              {options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.from}
                </option>
              ))}
            </datalist>
            <small>
              Известные значения: {options.map(o => `${o.value} (${o.from})`).join('; ')}
            </small>
          </>
        )}
      </label>
    );
  }
  const reviewTasks = draft.tasks.every(t => schemas[t.typeCode])
    ? serialize(draft, schemas).tasks
    : draft.tasks;
  function renderFlow() {
    return (
      <div className='pw-flow'>
        <div className='pw-endpoint'>
          <small>Клиент-источник</small>
          <strong>{draft.clientFrom}</strong>
        </div>
        <ol>
          {reviewTasks.map((t, i) => (
            <li key={t.id}>
              <div className='pw-flow-number'>{i + 1}</div>
              <div className='pw-flow-details'>
                <strong>{taskTitle(t)}</strong>
                {splitType(t.typeCode).action !== 'Delete' && (
                  <span>
                    Клиент:{' '}
                    {splitType(t.typeCode).action === 'Upload' ? draft.clientTo : draft.clientFrom}
                  </span>
                )}
                <span>
                  {splitType(t.typeCode).action === 'Upload' ? 'В директорию' : 'Из директории'}:{' '}
                  {propValue(
                    t,
                    splitType(t.typeCode).action === 'Upload' ? 'targetDir' : 'sourceDir',
                  ) || 'не указана'}
                </span>
                {schemas[t.typeCode]?.optional.includes('fileMask') && (
                  <span>
                    Маска: {propValue(t, 'fileMask') || 'не задана'}
                    {propValue(t, 'fileMask') ? ` (${propValue(t, 'maskType')})` : ''}
                  </span>
                )}
                {['recursive', 'preserveStructure']
                  .filter(
                    key =>
                      schemas[t.typeCode]?.optional.includes(key) ||
                      schemas[t.typeCode]?.required.includes(key),
                  )
                  .map(key => (
                    <span key={key}>
                      {labels[key]}: {propValue(t, key) === 'true' ? 'да' : 'нет'}
                    </span>
                  ))}
                {splitType(t.typeCode).action === 'Delete' && (
                  <strong className='pw-warning'>
                    Удаление файлов — проверьте область действия
                  </strong>
                )}
                {!created && (
                  <button type='button' onClick={() => go(i + 1)}>
                    Изменить операцию {i + 1}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
        <div className='pw-endpoint'>
          <small>Клиент-получатель</small>
          <strong>{draft.clientTo}</strong>
        </div>
      </div>
    );
  }
  return (
    <div
      className='pw-backdrop'
      onMouseDown={e => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialog}
        className='pw-dialog'
        role='dialog'
        aria-modal='true'
        aria-labelledby='pw-title'
        onKeyDown={e => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            close();
          }
          if (e.key === 'Tab') {
            const nodes = Array.from(
              dialog.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, a[href], [tabindex="0"]',
              ) ?? [],
            ).filter(node => node.getClientRects().length > 0);
            const first = nodes[0],
              last = nodes[nodes.length - 1];
            if (
              e.shiftKey &&
              (document.activeElement === first || document.activeElement === title.current)
            ) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <header className='pw-header'>
          <div>
            <h2 ref={title} tabIndex={-1} id='pw-title'>
              {created ? 'Пайплайн создан' : 'Создание пайплайна'}
            </h2>
            <p>
              {created
                ? 'Конфигурация сохранена'
                : `Шаг ${step + 1} из ${draft.tasks.length + 2} · ${step === 0 ? 'Общие настройки' : review ? 'Проверка перед созданием' : `Операция ${step}`}`}
            </p>
          </div>
          <button type='button' aria-label='Закрыть' onClick={close} disabled={busy}>
            ×
          </button>
        </header>
        {closing && (
          <div className='pw-confirm' role='alert'>
            <p>Закрыть мастер? Несохранённые настройки будут потеряны.</p>
            <button type='button' onClick={() => setClosing(false)}>
              Продолжить настройку
            </button>
            <button
              type='button'
              disabled={busy}
              onClick={() => {
                if (!savingRef.current && !isLoading) onClose();
              }}
            >
              Закрыть без сохранения
            </button>
          </div>
        )}
        {!closing &&
          (created ? (
            <div className='pw-success'>
              <h3>{draft.pipelineName}</h3>
              <p>ID: {created.id}</p>
              <p>Созданы настройки пайплайна. Передача файлов не запускалась.</p>
              {renderFlow()}
              <a className='pw-primary' href={`/pipelines/${encodeURIComponent(created.id)}`}>
                Открыть пайплайн
              </a>
              <button type='button' onClick={onClose}>
                Готово
              </button>
            </div>
          ) : (
            <>
              <nav className='pw-steps' aria-label='Шаги создания'>
                <button
                  type='button'
                  aria-current={step === 0 ? 'step' : undefined}
                  disabled={busy}
                  onClick={() => go(0)}
                >
                  1. Общие настройки
                </button>
                {draft.tasks.map((t, i) => (
                  <button
                    type='button'
                    key={t.id}
                    disabled={busy || i + 1 > visited}
                    aria-current={step === i + 1 ? 'step' : undefined}
                    onClick={() => go(i + 1)}
                  >
                    {i + 2}. {taskTitle(t)}
                  </button>
                ))}
                <button
                  type='button'
                  disabled={busy || draft.tasks.length + 1 > visited}
                  aria-current={review ? 'step' : undefined}
                  onClick={() => go(draft.tasks.length + 1)}
                >
                  Проверка
                </button>
              </nav>
              <main className='pw-content'>
                {error && (
                  <div role='alert' className='pw-error'>
                    {error}
                  </div>
                )}
                {schemaError && (
                  <div className='pw-warning'>
                    Не удалось загрузить параметры операций.{' '}
                    <button
                      type='button'
                      onClick={() => {
                        setSchemas({});
                        setRetry(n => n + 1);
                      }}
                    >
                      Повторить загрузку
                    </button>
                  </div>
                )}
                <fieldset disabled={busy} className='pw-fields'>
                  {step === 0 && (
                    <>
                      <h3>Общие настройки</h3>
                      <p className='pw-muted'>
                        Укажите участников и датацентр, затем добавьте операции в порядке
                        выполнения.
                      </p>
                      <div className='pw-grid'>
                        <label className='pw-field'>
                          Название
                          <input
                            value={draft.pipelineName}
                            maxLength={255}
                            required
                            onChange={e => change(p => ({ ...p, pipelineName: e.target.value }))}
                          />
                        </label>
                        <label className='pw-field'>
                          Датацентр
                          <select
                            value={draft.primaryDatacenter}
                            onChange={e =>
                              change(p => ({ ...p, primaryDatacenter: e.target.value }))
                            }
                          >
                            <option value='SP'>SP (SouthPort)</option>
                            <option value='SC'>SC (SberCloud)</option>
                          </select>
                        </label>
                        <label className='pw-field'>
                          Клиент-источник
                          <input
                            value={draft.clientFrom}
                            maxLength={100}
                            required
                            list='pw-clients'
                            onChange={e => change(p => ({ ...p, clientFrom: e.target.value }))}
                          />
                        </label>
                        <label className='pw-field'>
                          Клиент-получатель
                          <input
                            value={draft.clientTo}
                            maxLength={100}
                            required
                            list='pw-clients'
                            onChange={e => change(p => ({ ...p, clientTo: e.target.value }))}
                          />
                        </label>
                      </div>
                      <datalist id='pw-clients'>
                        {clientValues.map(value => (
                          <option key={value} value={value} />
                        ))}
                      </datalist>
                      <p className='pw-muted'>
                        Начните вводить клиента для поиска среди загруженных значений или введите
                        новое имя.
                      </p>
                      <label className='pw-check'>
                        <input
                          type='checkbox'
                          checked={draft.allOrNothing}
                          onChange={e => change(p => ({ ...p, allOrNothing: e.target.checked }))}
                        />
                        Все или ничего
                      </label>
                    </>
                  )}
                  {task && (
                    <>
                      <div className='pw-section-heading'>
                        <h3>Операция {step}</h3>
                        <span>
                          {draft.clientFrom} → {draft.clientTo}
                        </span>
                      </div>
                      <div className='pw-grid'>
                        <label className='pw-field'>
                          Действие
                          <select
                            value={splitType(task.typeCode).action}
                            onChange={e =>
                              updateTask(task.id, t => ({
                                ...t,
                                typeCode:
                                  `${splitType(t.typeCode).protocol}${e.target.value}Task` as TaskType,
                              }))
                            }
                          >
                            {actions.map(a => (
                              <option key={a} value={a} disabled={step === 1 && a !== 'Download'}>
                                {actionLabels[a]} ({a})
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className='pw-field'>
                          Протокол
                          <select
                            value={splitType(task.typeCode).protocol}
                            onChange={e =>
                              updateTask(task.id, t => ({
                                ...t,
                                typeCode:
                                  `${e.target.value}${splitType(t.typeCode).action}Task` as TaskType,
                              }))
                            }
                          >
                            {protocols.map(p => (
                              <option key={p} value={p}>
                                {protocolLabels[p]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      {step === 1 && (
                        <p className='pw-muted'>
                          Первая операция получает файлы: Скачать (Download).
                        </p>
                      )}
                      {splitType(task.typeCode).action === 'Delete' && (
                        <p className='pw-warning'>
                          Эта операция удаляет файлы. Проверьте директорию перед созданием.
                        </p>
                      )}
                      {!schemas[task.typeCode] ? (
                        <p role='status'>Загрузка параметров операции…</p>
                      ) : (
                        <>
                          <div className='pw-grid'>
                            {schemas[task.typeCode].required.map(key => field(key, task, true))}
                          </div>
                          {schemas[task.typeCode].optional.length > 0 && (
                            <details className='pw-optional'>
                              <summary>Дополнительные параметры</summary>
                              <div className='pw-grid'>
                                {schemas[task.typeCode].optional.map(key =>
                                  field(key, task, false),
                                )}
                              </div>
                            </details>
                          )}
                        </>
                      )}
                      <div className='pw-task-actions'>
                        <button type='button' onClick={() => addTask()}>
                          Добавить следующую операцию
                        </button>
                        <button type='button' onClick={() => addTask(task)}>
                          Скопировать эту операцию
                        </button>
                        <button
                          type='button'
                          disabled={step === 1}
                          onClick={() => moveTask(step - 1, -1)}
                        >
                          Выше
                        </button>
                        <button
                          type='button'
                          disabled={step === draft.tasks.length}
                          onClick={() => moveTask(step - 1, 1)}
                        >
                          Ниже
                        </button>
                        <button
                          type='button'
                          disabled={draft.tasks.length === 1}
                          onClick={() => {
                            if (
                              step === 1 &&
                              splitType(draft.tasks[1].typeCode).action !== 'Download'
                            ) {
                              setError(
                                'Первая операция получает файлы: сначала поставьте другой Download на первое место.',
                              );
                              return;
                            }
                            change(p => ({ ...p, tasks: p.tasks.filter(t => t.id !== task.id) }));
                            go(Math.max(1, step - 1));
                          }}
                        >
                          Убрать операцию
                        </button>
                      </div>
                    </>
                  )}
                  {review && (
                    <>
                      <h3>Проверьте порядок операций</h3>
                      <p>
                        {draft.pipelineName} · {draft.primaryDatacenter} · Все или ничего:{' '}
                        {draft.allOrNothing ? 'да' : 'нет'}
                      </p>
                      {renderFlow()}
                      <p className='pw-muted'>
                        Проверяется заполнение настроек. Доступность клиентов, соединение и наличие
                        файлов здесь не проверяются.
                      </p>
                    </>
                  )}
                </fieldset>
                {!review && (
                  <>
                    <ReusePicker
                      disabled={busy}
                      onLoaded={rows =>
                        setRecords(prev => [
                          ...prev,
                          ...rows.filter(row => !prev.some(p => p.id === row.id)),
                        ])
                      }
                      onSelect={selected => {
                        setSource(selected);
                        setReplace(false);
                      }}
                    />
                    {source && (
                      <section className='pw-selected'>
                        <h4>Выбран: {source.pipelineName}</h4>
                        <button
                          type='button'
                          disabled={busy}
                          onClick={() => (dirty ? setReplace(true) : applySource())}
                        >
                          Скопировать весь пайплайн
                        </button>
                        {replace && (
                          <div className='pw-confirm'>
                            <p>Заменить текущие настройки копией «{source.pipelineName}»?</p>
                            <button type='button' onClick={applySource}>
                              Заменить настройки
                            </button>
                            <button type='button' onClick={() => setReplace(false)}>
                              Оставить текущие
                            </button>
                          </div>
                        )}
                        <label className='pw-field'>
                          Скопировать операцию
                          <select
                            disabled={busy}
                            value=''
                            onChange={e => {
                              const selected = source.tasks.find(
                                t => String(t.id) === e.target.value,
                              );
                              if (selected) addTask(copyTask(selected, draft.tasks.length + 1));
                            }}
                          >
                            <option value=''>Выберите операцию из {source.pipelineName}</option>
                            {[...source.tasks]
                              .sort((a, b) => a.taskOrder - b.taskOrder)
                              .map(t => (
                                <option key={t.id} value={String(t.id)}>
                                  {t.taskOrder}. {t.typeCode}
                                </option>
                              ))}
                          </select>
                        </label>
                      </section>
                    )}
                  </>
                )}
              </main>
              <footer className='pw-footer'>
                <button type='button' onClick={close} disabled={busy}>
                  Отмена
                </button>
                <div>
                  <button type='button' onClick={() => go(step - 1)} disabled={busy || step === 0}>
                    Назад
                  </button>
                  {review ? (
                    <button
                      type='button'
                      className='pw-primary'
                      onClick={() => void save()}
                      disabled={busy}
                    >
                      {busy ? 'Создание…' : 'Подтвердить и создать'}
                    </button>
                  ) : (
                    <button type='button' className='pw-primary' onClick={next} disabled={busy}>
                      Далее
                    </button>
                  )}
                </div>
              </footer>
            </>
          ))}
      </div>
    </div>
  );
}
