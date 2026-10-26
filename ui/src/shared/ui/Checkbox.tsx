import React from 'react';
import clsx from 'clsx';
import type { BaseInputProps } from './Input';
import { InputMessage } from './Input';

export interface CheckboxProps
  extends BaseInputProps,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  indeterminate?: boolean;
  containerClassName?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  inputSize = 'md',
  variant = 'default',
  disabled = false,
  label,
  hint,
  error,
  indeterminate = false,
  className,
  containerClassName,
  checked,
  ...props
}) => {
  const checkboxRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const baseClasses = 'rounded border focus:ring-2 focus:ring-offset-2 transition-all duration-200';

  const variantClasses = clsx({
    'border-gray-300 text-blue-600 focus:ring-blue-200 dark:border-gray-600 dark:text-blue-400 dark:focus:ring-blue-900':
      variant === 'default' && !disabled && !error,
    'border-red-300 text-red-600 focus:ring-red-200 dark:border-red-400 dark:text-red-400 dark:focus:ring-red-900':
      (variant === 'error' || error) && !disabled,
    'border-green-300 text-green-600 focus:ring-green-200 dark:border-green-400 dark:text-green-400 dark:focus:ring-green-900':
      variant === 'success' && !disabled,
    'border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed dark:border-gray-700 dark:text-gray-500 dark:bg-gray-800':
      disabled,
  });

  const labelSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className={clsx('w-full', containerClassName)}>
      <label
        className={clsx(
          'flex items-start gap-3 cursor-pointer',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <div className='flex items-center h-5 mt-0.5'>
          <input
            ref={checkboxRef}
            type='checkbox'
            className={clsx(baseClasses, sizeClasses[inputSize], variantClasses, className)}
            disabled={disabled}
            checked={checked}
            {...props}
          />
        </div>

        <div className='flex flex-col'>
          {label && (
            <span
              className={clsx(
                'font-medium text-gray-700 dark:text-gray-200',
                labelSizeClasses[inputSize],
              )}
            >
              {label}
            </span>
          )}

          {hint && !error && <InputMessage message={hint} isError={false} />}
        </div>
      </label>

      {error && (
        <div className='ml-8'>
          <InputMessage message={error} isError={true} />
        </div>
      )}
    </div>
  );
};

export const CheckboxGroup: React.FC<{
  label?: string;
  hint?: string;
  error?: string;
  direction?: 'vertical' | 'horizontal';
  children: React.ReactNode;
}> = ({ label, hint, error, direction = 'vertical', children }) => {
  return (
    <div className='w-full'>
      {label && (
        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
          {label}
        </label>
      )}
      <div
        className={clsx('flex gap-4', direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap')}
      >
        {children}
      </div>
      <InputMessage message={error || hint} isError={!!error} />
    </div>
  );
};

export default Checkbox;
