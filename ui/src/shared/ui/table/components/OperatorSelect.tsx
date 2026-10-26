// OperatorSelect.tsx
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

interface OperatorOption {
  value: string;
  label: string;
}

interface OperatorSelectProps {
  options: OperatorOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export const OperatorSelect: React.FC<OperatorSelectProps> = ({
  options,
  value,
  onChange,
  disabled = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption?.label || options[0]?.label || '';

  // Сброс highlightedIndex при открытии/закрытии
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex(opt => opt.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen, options, value]);

  // Фокус на попап при открытии
  useEffect(() => {
    if (isOpen && popupRef.current) {
      popupRef.current.focus();
    }
  }, [isOpen]);

  // Закрытие по клику вне
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

  // Обновление позиции попапа
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

  // Прокрутка к выделенному элементу
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleButtonClick = () => {
    if (disabled) return;
    if (buttonRef.current) {
      setTriggerRect(buttonRef.current.getBoundingClientRect());
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    e.preventDefault();
    e.stopPropagation();

    switch (e.key) {
      case 'ArrowDown':
        setHighlightedIndex(prev => (prev + 1) % options.length);
        break;
      case 'ArrowUp':
        setHighlightedIndex(prev => (prev - 1 + options.length) % options.length);
        break;
      case 'Enter':
        if (highlightedIndex >= 0) {
          handleSelect(options[highlightedIndex].value);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
    }
  };

  const popupContent =
    isOpen &&
    triggerRect &&
    createPortal(
      <div
        ref={popupRef}
        className='fixed z-[1000] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto thin-scroll'
        style={{
          top: triggerRect.bottom + window.scrollY + 2,
          left: triggerRect.left + triggerRect.width / 2,
          transform: 'translateX(-50%)',
          minWidth: triggerRect.width,
        }}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {options.map((opt, index) => (
          <div
            key={opt.value}
            ref={el => {
              optionRefs.current[index] = el;
            }}
            className={clsx(
              'px-3 py-1.5 cursor-pointer text-xs transition-colors duration-150 text-gray-700 dark:text-gray-200',
              opt.value === value &&
                'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
              index === highlightedIndex &&
                'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white',
              'hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
            )}
            onClick={() => handleSelect(opt.value)}
            onMouseEnter={() => setHighlightedIndex(index)}
          >
            {opt.label}
          </div>
        ))}
      </div>,
      document.body,
    );

  return (
    <div className={clsx('relative inline-block', className)}>
      <button
        ref={buttonRef}
        type='button'
        className={clsx(
          'w-full px-2 py-1 text-xs font-normal rounded border focus:outline-none transition-colors',
          disabled
            ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500'
            : 'bg-transparent border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700',
          'focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400',
        )}
        onClick={handleButtonClick}
        disabled={disabled}
      >
        {displayLabel}
      </button>
      {popupContent}
    </div>
  );
};
