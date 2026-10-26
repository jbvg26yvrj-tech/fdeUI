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
}) => {
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [completed, setCompleted] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [results, setResults] = useState<Map<string, ItemResult>>(new Map());
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setCompleted(0);
      setErrors([]);
      setResults(new Map());
      cancelledRef.current = false;
    }
  }, [isOpen]);

  const run = useCallback(async () => {
    setStatus('running');
    setCompleted(0);
    setErrors([]);
    const newResults = new Map<string, ItemResult>();

    for (let i = 0; i < items.length; i++) {
      if (cancelledRef.current) break;
      const item = items[i];
      try {
        const result = await onExecute(item.id);
        newResults.set(item.id, result);
      } catch (err) {
        newResults.set(item.id, 'error');
        setErrors(prev => [...prev, `${item.label}: ${err instanceof Error ? err.message : 'Ошибка'}`]);
      }
      setCompleted(i + 1);
      setResults(new Map(newResults));
    }

    setStatus('done');
  }, [items, onExecute]);

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
          {status === 'running' && onCancel && (
            <Button variant='outlined' size='sm' onClick={() => { cancelledRef.current = true; onCancel(); }}>
              Отмена
            </Button>
          )}
          {status === 'done' && skipLabel && (
            <Button variant='outlined' size='sm' onClick={onComplete}>
              {skipLabel}
            </Button>
          )}
          {status === 'done' && (
            <Button variant='primary' size='sm' onClick={onComplete}>
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

        {/* Errors list */}
        {errors.length > 0 && (
          <div className='max-h-32 overflow-y-auto text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-2 space-y-1'>
            {errors.map((e, i) => <p key={i}>{e}</p>)}
          </div>
        )}

        {/* Running indicator */}
        {status === 'running' && (
          <p className='text-sm text-gray-500 dark:text-gray-400 text-center animate-pulse'>
            Выполняется...
          </p>
        )}
      </div>
    </Modal>
  );
};

export default StepProgressModal;
