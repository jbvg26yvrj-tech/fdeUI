import React from 'react';
import clsx from 'clsx';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'error'
  | 'success'
  | 'warning'
  | 'info'
  | 'text'
  | 'textPrimary'
  | 'textError'
  | 'outlined'
  | 'outlinedPrimary'
  | 'outlinedError';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonIcon = 'ok' | 'cancel' | 'save' | 'run' | 'stop' | 'reports' | React.ReactNode;

interface IconProps {
  className?: string;
  [key: string]: unknown;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  icon?: ButtonIcon;
  iconPosition?: 'left' | 'right';
  iconClassName?: string;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  icon,
  iconPosition = 'left',
  iconClassName,
  children,
  className,
  disabled,
  ...props
}) => {
  const baseClasses = 'fde-button relative inline-flex items-center justify-center';

  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'fde-button--primary',
    secondary: 'fde-button--secondary',
    error: 'fde-button--error',
    success: 'fde-button--success',
    warning: 'fde-button--warning',
    info: 'fde-button--info',
    text: 'fde-button--text',
    textPrimary: 'fde-button--textPrimary',
    textError: 'fde-button--textError',
    outlined: 'fde-button--outlined',
    outlinedPrimary: 'fde-button--outlinedPrimary',
    outlinedError: 'fde-button--outlinedError',
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'py-1 px-3 text-sm gap-1',
    md: 'py-2 px-4 text-sm gap-2',
    lg: 'py-3 px-6 text-lg gap-2',
  };

  const stateClasses = clsx((disabled || isLoading) && 'opacity-50 cursor-not-allowed');

  const classes = clsx(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    stateClasses,
    className,
  );

  const renderIcon = () => {
    if (!icon) return null;

    if (typeof icon === 'string') {
      const iconSize = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
      }[size];

      const iconClass = clsx(iconSize, 'shrink-0', iconClassName);

      switch (icon) {
        case 'ok':
          return (
            <svg className={iconClass} fill='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M5 13l4 4L19 7'
              />
            </svg>
          );
        case 'cancel':
          return (
            <svg className={iconClass} fill='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          );
        case 'save':
          return (
            <svg className={iconClass} fill='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4'
              />
            </svg>
          );
        case 'run':
          return (
            <svg className={iconClass} fill='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z'
              />
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          );
        case 'stop':
          return (
            <svg className={iconClass} fill='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z'
              />
            </svg>
          );
        case 'reports':
          return (
            <svg className={iconClass} fill='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
              />
            </svg>
          );
        default:
          return null;
      }
    }

    if (React.isValidElement<IconProps>(icon)) {
      return React.cloneElement(icon, {
        className: clsx(
          'shrink-0',
          {
            'w-4 h-4': size === 'sm',
            'w-5 h-5': size === 'md',
            'w-6 h-6': size === 'lg',
          },
          iconClassName,
          icon.props.className,
        ),
      } as Partial<IconProps>);
    }

    return icon;
  };

  return (
    <button className={classes} disabled={disabled || isLoading} {...props}>
      {isLoading ? (
        <>
          <span className='inline-flex items-center'>{children}</span>
          <div className='absolute inset-0 flex items-center justify-center'>
            <Spinner size={size} variant={variant} />
          </div>
          {loadingText && (
            <span className='sr-only' aria-live='polite'>
              {loadingText}
            </span>
          )}
        </>
      ) : (
        <>
          {iconPosition === 'left' && renderIcon()}
          <span className='truncate'>{children}</span>
          {iconPosition === 'right' && renderIcon()}
        </>
      )}
    </button>
  );
};

interface SpinnerProps {
  size: ButtonSize;
  variant: ButtonVariant;
}

const Spinner: React.FC<SpinnerProps> = ({ size, variant }) => {
  const spinnerSize = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  let spinnerColorClass;
  let spinnerStrokeClass;

  if (variant.startsWith('text') || variant.startsWith('outlined') || variant === 'secondary') {
    spinnerColorClass = 'text-blue-600 dark:text-blue-400';
    spinnerStrokeClass = 'stroke-white dark:stroke-gray-800 stroke-2';
  } else {
    spinnerColorClass = 'text-white';
    spinnerStrokeClass = 'stroke-blue-600 dark:stroke-blue-700 stroke-2';
  }

  return (
    <div className='relative'>
      <div className={`absolute inset-0 rounded-full ${spinnerStrokeClass} opacity-80`}></div>
      <svg
        className={`animate-spin ${spinnerSize[size]} ${spinnerColorClass} drop-shadow-lg`}
        xmlns='http://www.w3.org/2000/svg'
        fill='none'
        viewBox='0 0 24 24'
        aria-hidden='true'
      >
        <circle
          className='opacity-40'
          cx='12'
          cy='12'
          r='10'
          stroke='currentColor'
          strokeWidth='4'
        />
        <path
          className='opacity-90'
          fill='currentColor'
          d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
        />
      </svg>
    </div>
  );
};

export default Button;
