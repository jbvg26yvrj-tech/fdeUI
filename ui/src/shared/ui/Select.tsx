import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import type { BaseInputProps, InputSize } from './Input';
import { InputMessage } from './Input';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends BaseInputProps,
    Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[];
  placeholder?: string;
  hideArrow?: boolean; // скрывать стрелку
}

export const Select: React.FC<SelectProps> = ({
  inputSize = 'md',
  variant = 'default',
  disabled = false,
  label,
  hint,
  error,
  options,
  placeholder,
  className,
  value,
  onChange,
  hideArrow = false,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value || '');
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);

  const selectRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  useEffect(() => {
    const updateTriggerRect = () => {
      if (buttonRef.current) {
        setTriggerRect(buttonRef.current.getBoundingClientRect());
      }
    };
    if (isOpen) {
      updateTriggerRect();
      window.addEventListener('resize', updateTriggerRect);
      window.addEventListener('scroll', updateTriggerRect, true);
    }
    return () => {
      window.removeEventListener('resize', updateTriggerRect);
      window.removeEventListener('scroll', updateTriggerRect, true);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    setInternalValue(optionValue);
    setIsOpen(false);
    if (onChange) {
      const event = {
        target: { value: optionValue, name: props.name },
      } as React.ChangeEvent<HTMLSelectElement>;
      onChange(event);
    }
  };

  const handleButtonClick = () => {
    if (disabled) return;
    if (buttonRef.current) {
      setTriggerRect(buttonRef.current.getBoundingClientRect());
    }
    setIsOpen(!isOpen);
  };

  const sizeClasses: Record<InputSize, string> = {
    sm: 'py-1 px-3 text-sm',
    md: 'py-2 px-4 text-base',
    lg: 'py-3 px-6 text-lg',
  };

  const baseClasses =
    'w-full rounded border focus:outline-none transition-all duration-200 cursor-pointer flex items-center justify-between';

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

  const selectedOption = options.find(option => option.value === internalValue);
  const displayValue = selectedOption ? selectedOption.label : placeholder;

  const dropdownContent =
    isOpen &&
    triggerRect &&
    createPortal(
      <div
        ref={popupRef}
        // Добавлен класс thin-scroll для тонкого скролла
        className='fixed z-[1000] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto thin-scroll'
        style={{
          top: triggerRect.bottom + window.scrollY + 2,
          left: triggerRect.left + window.scrollX,
          width: triggerRect.width,
        }}
      >
        {options.map(option => (
          <div
            key={option.value}
            className={clsx(
              'px-4 py-2 cursor-pointer transition-colors duration-150 text-gray-700 dark:text-gray-200',
              option.value === internalValue &&
                'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
              option.disabled
                ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
              {
                'text-sm': inputSize === 'sm',
                'text-base': inputSize === 'md',
                'text-lg': inputSize === 'lg',
              },
            )}
            onClick={() => !option.disabled && handleSelect(option.value)}
          >
            {option.label}
          </div>
        ))}
      </div>,
      document.body,
    );

  return (
    <div className='w-full relative' ref={selectRef}>
      {label && (
        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
          {label}
        </label>
      )}
      <div className='relative'>
        <button
          ref={buttonRef}
          type='button'
          className={clsx(
            baseClasses,
            sizeClasses[inputSize],
            variantClasses,
            className,
            !hideArrow && 'pr-10',
            'text-left',
          )}
          onClick={handleButtonClick}
          disabled={disabled}
        >
          <span className={clsx(!internalValue && 'text-gray-400 dark:text-gray-500', 'truncate')}>
            {displayValue}
          </span>
          {!hideArrow && (
            <div className='absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400 dark:text-gray-500'>
              <svg
                className={clsx(
                  'h-5 w-5 transition-transform duration-200',
                  isOpen && 'transform rotate-180',
                )}
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M19 9l-7 7-7-7'
                />
              </svg>
            </div>
          )}
        </button>
        {dropdownContent}
      </div>
      <InputMessage message={error || hint} isError={!!error} />
    </div>
  );
};

export default Select;
