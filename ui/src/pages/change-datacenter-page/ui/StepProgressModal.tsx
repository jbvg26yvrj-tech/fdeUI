import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';

export interface StepItem {
  id: string;
  label: string;
}

export type ItemResult = 'success' | 'skipped' | 'error';

interface StepProgressModalProps {
  isOpen: boolean;
  title: string;
  items: StepItem[];
  onExecute: (id: string) => Promise<ItemResult>;
  onComplete: () => void;
  onCancel?: () => void;
  skipLabel?: string;
  nextLabel?: string;
  allowRetry?: boolean;
}

const StepProgressModal: React.FC<StepProgressModalProps> = ({
  isOpen,
  title,
  items,
  onExecute,
  onComplete,
  onCancel,
  skipLabel,
  nextLabel = 'Далее',
  allowRetry = true,
}) => {
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [completed, setCompleted] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [results, setResults] = useState<Map<string, ItemResult>>(new Map());
  const runningRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setCompleted(0);
      setErrors([]);
      setResults(new Map());

    }
  }, [isOpen]);

  const run = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setStatus('running');
    const pending = items.filter(item => !results.has(item.id) || results.get(item.id) === 'error');
    setCompleted(items.length - pending.length);
    setErrors([]);
    const newResults = new Map(results);

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      try {
        const result = await onExecute(item.id);
        newResults.set(item.id, result);
        if (result === 'error') setErrors(prev => [...prev, `${item.label}: Ошибка`]);
      } catch (err) {
        newResults.set(item.id, 'error');
        setErrors(prev => [...prev, `${item.label}: ${err instanceof Error ? err.message : 'Ошибка'}`]);
      }
      setCompleted(items.length - pending.length + i + 1);
      setResults(new Map(newResults));
    }

    runningRef.current = false;
    setStatus('done');
  }, [items, onExecute, results]);

  useEffect(() => {
    if (isOpen && status === 'idle') {
      if (items.length === 0) {
        // Nothing to process — auto-complete
        setStatus('done');
      } else {
        run();
      }
    }
  }, [isOpen, status, items.length, run]);

  const percent = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
  const successCount = Array.from(results.values()).filter(r => r === 'success').length;
  const skippedCount = Array.from(results.values()).filter(r => r === 'skipped').length;
  const errorCount = Array.from(results.values()).filter(r => r === 'error').length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title={title}
      variant='custom'
      size='md'
      showCloseButton={false}
      disableBackdropClick={true}
      footer={
        <div className='flex justify-end gap-2'>
          {status === 'done' && onCancel && (
            <Button variant='outlined' size='sm' onClick={onCancel}>
              Восстановить расписания и завершить
            </Button>
          )}
          {status === 'done' && errorCount > 0 && allowRetry && (
            <Button variant='outlined' size='sm' onClick={run}>Повторить ошибки</Button>
          )}
          {status === 'done' && skipLabel && (
            <Button variant='outlined' size='sm' disabled={errorCount > 0} onClick={onComplete}>
              {skipLabel}
            </Button>
          )}
          {status === 'done' && (
            <Button variant='primary' size='sm' disabled={errorCount > 0} onClick={onComplete}>
              {nextLabel}
            </Button>
          )}
        </div>
      }
    >
      <div className='space-y-4'>
        {/* Progress bar */}
        <div>
          <div className='flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1'>
            <span>{completed} из {items.length}</span>
            <span>{percent}%</span>
          </div>
          <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3'>
            <div
              className='bg-blue-600 h-3 rounded-full transition-all duration-300'
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Status summary */}
        {status === 'done' && (
          <div className='text-sm space-y-1'>
            {successCount > 0 && (
              <p className='text-green-600 dark:text-green-400'>Успешно: {successCount}</p>
            )}
            {skippedCount > 0 && (
              <p className='text-gray-500 dark:text-gray-400'>Пропущено: {skippedCount}</p>
            )}
            {errorCount > 0 && (
              <p className='text-red-600 dark:text-red-400'>Ошибок: {errorCount}</p>
            )}
          </div>
        )}

        {!allowRetry && errorCount > 0 && (
          <p role='alert' className='text-sm text-amber-700 dark:text-amber-300'>
            Результат запуска не подтверждён. Проверьте сессии; повторный запрос может запустить поток ещё раз.
          </p>
        )}
        {/* Errors list */}
        {errors.length > 0 && (
          <div className='max-h-32 overflow-y-auto text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-2 space-y-1'>
            {errors.map((e, i) => <p key={i}>{e}</p>)}
          </div>
        )}

        {/* Running indicator */}
        {status === 'running' && (
          <p className='text-sm text-gray-500 dark:text-gray-400 text-center animate-pulse'>
            Выполняется... Дождитесь завершения. Затем можно восстановить расписания и завершить операцию.
          </p>
        )}
      </div>
    </Modal>
  );
};

export default StepProgressModal;
