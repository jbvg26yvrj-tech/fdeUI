import React, { useState, useId } from 'react';
import clsx from 'clsx';

export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'default' | 'error' | 'success';

export interface BaseInputProps {
  inputSize?: InputSize;
  variant?: InputVariant;
  disabled?: boolean;
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
}

export const InputMessage: React.FC<{ message?: string; isError?: boolean }> = ({
  message,
  isError = false,
}) => {
  if (!message) return null;
  return (
    <p
      className={clsx(
        'mt-1 text-sm',
        isError ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400',
      )}
    >
      {message}
    </p>
  );
};

export interface InputProps
  extends BaseInputProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Input: React.FC<InputProps> = ({
  inputSize = 'md',
  variant = 'default',
  disabled = false,
  label,
  hint,
  error,
  icon,
  iconPosition = 'left',
  className,
  ...props
}) => {
  const generatedId = useId();
  const inputId = props.id || generatedId;
  const sizeClasses: Record<InputSize, string> = {
    sm: 'py-1 px-3 text-sm',
    md: 'py-2 px-3 text-sm',
    lg: 'py-3 px-6 text-lg',
  };

  const baseClasses =
    'fde-input w-full rounded border focus:outline-none transition-colors duration-150';

  const variantClasses = clsx({
    'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:focus:border-blue-400 dark:focus:ring-blue-900':
      variant === 'default' && !disabled && !error,
    'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-400 dark:focus:ring-red-900':
      (variant === 'error' || error) && !disabled,
    'border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:border-green-400 dark:focus:ring-green-900':
      variant === 'success' && !disabled,
    'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500':
      disabled,
  });

  const iconPaddingClasses = icon ? (iconPosition === 'left' ? 'pl-10' : 'pr-10') : '';

  const inputClasses = clsx(
    baseClasses,
    sizeClasses[inputSize],
    variantClasses,
    iconPaddingClasses,
    'bg-white dark:bg-gray-700', // явный фон для обычного состояния
    'text-gray-900 dark:text-white', // явный цвет текста
    'placeholder-gray-400 dark:placeholder-gray-300', // цвет плейсхолдера
    className,
  );

  return (
    <div className='w-full'>
      {label && (
        <label
          htmlFor={inputId}
          className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
        >
          {label}
        </label>
      )}
      <div className='relative'>
        {icon && iconPosition === 'left' && (
          <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500'>
            {icon}
          </div>
        )}
        <input className={inputClasses} disabled={disabled} {...props} id={inputId} />
        {icon && iconPosition === 'right' && (
          <div className='absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500'>
            {icon}
          </div>
        )}
      </div>
      <InputMessage message={error || hint} isError={!!error} />
    </div>
  );
};

export const PasswordInput: React.FC<
  BaseInputProps & React.InputHTMLAttributes<HTMLInputElement>
> = ({
  inputSize = 'md',
  variant = 'default',
  disabled = false,
  label,
  hint,
  error,
  className,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const generatedId = useId();
  const inputId = props.id || generatedId;
  const currentVariant = error ? 'error' : variant;

  return (
    <div className='w-full'>
      {label && (
        <label
          htmlFor={inputId}
          className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
        >
          {label}
        </label>
      )}
      <div className='relative'>
        <Input
          type={showPassword ? 'text' : 'password'}
          inputSize={inputSize}
          variant={currentVariant}
          disabled={disabled}
          className={clsx('pr-10', className)}
          {...props}
          id={inputId}
        />
        <button
          type='button'
          className={clsx(
            'absolute inset-y-0 right-0 pr-3 flex items-center',
            disabled
              ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
          )}
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
          aria-pressed={showPassword}
          disabled={disabled}
        >
          {showPassword ? <EyeOffIcon className='h-5 w-5' /> : <EyeIcon className='h-5 w-5' />}
        </button>
      </div>
      <InputMessage message={error || hint} isError={!!error} />
    </div>
  );
};

export const Textarea: React.FC<
  BaseInputProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>
> = ({
  inputSize = 'md',
  variant = 'default',
  disabled = false,
  label,
  hint,
  error,
  className,
  ...props
}) => {
  const sizeClasses: Record<InputSize, string> = {
    sm: 'py-1 px-3 text-sm',
    md: 'py-2 px-3 text-sm',
    lg: 'py-3 px-6 text-lg',
  };

  const baseClasses =
    'fde-input w-full rounded border focus:outline-none transition-colors duration-150 resize-none';

  const variantClasses = clsx({
    'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:focus:border-blue-400 dark:focus:ring-blue-900':
      variant === 'default' && !disabled && !error,
    'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-400 dark:focus:ring-red-900':
      (variant === 'error' || error) && !disabled,
    'border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:border-green-400 dark:focus:ring-green-900':
      variant === 'success' && !disabled,
    'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500':
      disabled,
  });

  const inputClasses = clsx(
    baseClasses,
    sizeClasses[inputSize],
    variantClasses,
    'bg-white dark:bg-gray-700',
    'text-gray-900 dark:text-white',
    'placeholder-gray-400 dark:placeholder-gray-300',
    className,
  );

  return (
    <div className='w-full'>
      {label && (
        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
          {label}
        </label>
      )}
      <textarea className={inputClasses} disabled={disabled} {...props} />
      <InputMessage message={error || hint} isError={!!error} />
    </div>
  );
};

// Иконки (без изменений)
const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
    />
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
    />
  </svg>
);

const EyeOffIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21'
    />
  </svg>
);

export default Input;
