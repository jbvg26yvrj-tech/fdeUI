import React, { useEffect, useRef, useId } from 'react';
import clsx from 'clsx';
import { Button } from './Button';

const openDialogs: string[] = [];
let originalOverflow = '';

export type ModalVariant = 'alert' | 'confirm' | 'custom' | 'info';
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  children: React.ReactNode;
  variant?: ModalVariant;
  size?: ModalSize;
  className?: string;
  confirmText?: string;
  cancelText?: string;
  closeText?: string;
  showCloseButton?: boolean;
  disableBackdropClick?: boolean;
  additionalButtons?: React.ReactNode;
  maxHeight?: string;
  footer?: React.ReactNode; // новый проп для кастомного футера
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  variant = 'alert',
  size = 'md',
  className,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  closeText = 'Закрыть',
  showCloseButton = true,
  disableBackdropClick = false,
  additionalButtons,
  maxHeight,
  footer,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const dialogId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    if (!openDialogs.length) originalOverflow = document.body.style.overflow;
    openDialogs.push(dialogId);
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(modalRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
    ) || []).filter(el => !el.closest('[hidden], [aria-hidden="true"]'));
    if (!modalRef.current?.contains(document.activeElement)) (focusable()[0] || modalRef.current)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (openDialogs.at(-1) !== dialogId) return;
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key === 'Tab') {
        const items = focusable();
        const first = items[0], last = items.at(-1);
        if (!first) { event.preventDefault(); modalRef.current?.focus(); }
        else if (event.shiftKey && (document.activeElement === first || !modalRef.current?.contains(document.activeElement))) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !modalRef.current?.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const index = openDialogs.indexOf(dialogId);
      if (index >= 0) openDialogs.splice(index, 1);
      if (!openDialogs.length) document.body.style.overflow = originalOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [isOpen, dialogId]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !disableBackdropClick) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md max-h-[80vh]',
    md: 'max-w-lg max-h-[80vh]',
    lg: 'max-w-2xl max-h-[80vh]',
    xl: 'max-w-4xl max-h-[80vh]',
  };

  const modalStyle: React.CSSProperties = {};
  if (maxHeight) {
    modalStyle.maxHeight = maxHeight;
  }

  return (
    <div className='fixed inset-0 z-50 overflow-y-auto' onClick={handleBackdropClick}>
      <div
        className='fixed inset-0 transition-opacity pointer-events-none'
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      />
      <div className='flex min-h-full items-center justify-center p-4' onClick={handleBackdropClick}>
        <div
          ref={modalRef}
          role="dialog" aria-modal="true" aria-labelledby={dialogId} tabIndex={-1}
          className={clsx(
            'relative flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full',
            sizeClasses[size],
            className,
          )}
          style={modalStyle}
        >
          {/* Заголовок */}
          <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700'>
            <h2 id={dialogId} className='text-lg font-semibold text-gray-900 dark:text-white'>{title}</h2>
            <div className='flex items-center space-x-2'>
              {additionalButtons && <div className='flex items-center'>{additionalButtons}</div>}
              {showCloseButton && (
                <button
                  type='button'
                  className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
                  onClick={onClose}
                >
                  <span className='sr-only'>Закрыть</span>
                  <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M6 18L18 6M6 6l12 12'
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Контент */}
          <div
            className='p-4 min-h-0 overflow-auto dark:text-gray-200'
            style={maxHeight ? { maxHeight: `calc(${maxHeight} - 120px)` } : {}}
          >
            {children}
          </div>

          {/* Футер: если передан footer, рендерим его; иначе стандартный футер для некоторых вариантов */}
          {footer && (
            <div className='px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-lg'>
              {footer}
            </div>
          )}
          {!footer && (variant === 'alert' || variant === 'confirm' || variant === 'info') && (
            <div className='px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-lg'>
              <div className='flex justify-end space-x-2'>
                {variant === 'confirm' && (
                  <Button variant='outlined' size='sm' onClick={onClose}>
                    {cancelText}
                  </Button>
                )}
                {variant === 'info' && onConfirm ? (
                  <Button variant='primary' size='sm' onClick={onConfirm}>
                    {confirmText}
                  </Button>
                ) : (
                  <Button
                    variant={variant === 'confirm' ? 'primary' : 'primary'}
                    size='sm'
                    onClick={variant === 'confirm' ? handleConfirm : onClose}
                  >
                    {variant === 'confirm' ? confirmText : closeText}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AlertModal: React.FC<Omit<ModalProps, 'variant'>> = props => (
  <Modal {...props} variant='alert' />
);
export const ConfirmModal: React.FC<Omit<ModalProps, 'variant'>> = props => (
  <Modal {...props} variant='confirm' />
);
export const InfoModal: React.FC<Omit<ModalProps, 'variant'>> = props => (
  <Modal {...props} variant='info' />
);

export interface FieldConfig<T> {
  key: keyof T;
  label: string;
  type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'date';
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
}

export interface EditFormProps<T> {
  data: T;
  onSave: (data: T) => void;
  onCancel: () => void;
  fields: Array<FieldConfig<T>>;
}

export const EditForm = <T,>({ data, onSave, onCancel, fields }: EditFormProps<T>) => {
  const [formData, setFormData] = React.useState<T>(data);

  const handleChange = (key: keyof T, value: unknown) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      {fields.map(field => (
        <div key={field.key as string}>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
            {field.label}
            {field.required && <span className='text-red-500 ml-1'>*</span>}
          </label>
          {field.type === 'select' ? (
            <select
              className='w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white'
              value={formData[field.key] as unknown as string}
              onChange={e => handleChange(field.key, e.target.value)}
              required={field.required}
            >
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : field.type === 'textarea' ? (
            <textarea
              className='w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white'
              value={formData[field.key] as unknown as string}
              onChange={e => handleChange(field.key, e.target.value)}
              required={field.required}
              rows={4}
            />
          ) : (
            <input
              type={field.type}
              className='w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white'
              value={formData[field.key] as unknown as string}
              onChange={e => handleChange(field.key, e.target.value)}
              required={field.required}
            />
          )}
        </div>
      ))}
      <div className='flex justify-end space-x-3 pt-4'>
        <Button variant='outlined' onClick={onCancel}>
          Отмена
        </Button>
        <Button type='submit' variant='primary'>
          Сохранить
        </Button>
      </div>
    </form>
  );
};

export default Modal;
