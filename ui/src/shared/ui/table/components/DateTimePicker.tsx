// DateTimePicker.tsx
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import {
  formatDateForDisplay,
  parseDisplayToIso,
  isValidDate,
  isValidTime,
  correctTimeDigits,
  formatTimeInput,
  parsePastedDateTime,
  parseFullDateTime,
} from '../../../utils/dateUtils';

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string, displayValue: string) => void;
  placeholder?: string;
  inputSize?: 'sm' | 'md' | 'lg';
  className?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  openOnClick?: boolean;
  editable?: boolean;
  debounceMs?: number;
}

const normalizeTime = (timeStr: string): string => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  const hh = parts[0]?.padStart(2, '0') || '00';
  const mm = parts[1]?.padStart(2, '0') || '00';
  const ss = parts[2]?.padStart(2, '0') || '00';
  return `${hh}:${mm}:${ss}`;
};

const formatDateTimeForDisplay = (isoValue: string): string => {
  if (!isoValue) return '';
  if (isoValue.includes('T')) {
    const [d, t] = isoValue.split('T');
    const datePart = formatDateForDisplay(d);
    const timePart = t.split('.')[0].split('+')[0].split('Z')[0];
    return `${datePart} ${timePart}`;
  }
  return formatDateForDisplay(isoValue);
};

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  onBlur,
  placeholder = 'Выберите дату',
  inputSize = 'sm',
  className = '',
  onKeyDown,
  openOnClick = true,
  editable = false,
  debounceMs = 300,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState('');
  const [dateDisplay, setDateDisplay] = useState('');
  const [time, setTime] = useState('');
  const [dateError, setDateError] = useState(false);
  const [timeError, setTimeError] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const [inputText, setInputText] = useState('');

  const triggerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const nativeDateInputRef = useRef<HTMLInputElement>(null);
  const displayDateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const displayValue = (): string => {
    if (!value) return '';
    return formatDateTimeForDisplay(value);
  };

  useEffect(() => {
    if (value) {
      if (value.includes('T')) {
        const [d, t] = value.split('T');
        setDate(d);
        setDateDisplay(formatDateForDisplay(d));
        const cleanTime = t.split('.')[0].split('+')[0].split('Z')[0];
        setTime(cleanTime);
        setInputText(formatDateForDisplay(d) + (cleanTime ? ` ${cleanTime}` : ''));
      } else {
        setDate(value);
        setDateDisplay(formatDateForDisplay(value));
        setTime('');
        setInputText(formatDateForDisplay(value));
      }
    } else {
      setDate('');
      setDateDisplay('');
      setTime('');
      setInputText('');
    }
    setDateError(false);
    setTimeError(false);
  }, [value]);

  useEffect(() => {
    const updateTriggerRect = () => {
      if (triggerRef.current) {
        setTriggerRect(triggerRef.current.getBoundingClientRect());
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && displayDateInputRef.current) {
      displayDateInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const openPicker = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsOpen(true);
    if (triggerRef.current) {
      setTriggerRect(triggerRef.current.getBoundingClientRect());
    }
  };

  const applySelection = () => {
    if (!date || dateError || timeError) return;
    let newValue = date;
    if (time) {
      const normalizedTime = normalizeTime(time);
      newValue = `${date}T${normalizedTime}`;
    }
    onChange(newValue);
    setIsOpen(false);
  };

  const handleClear = () => {
    setDate('');
    setDateDisplay('');
    setTime('');
    setInputText('');
    setDateError(false);
    setTimeError(false);
    onChange('');
    setIsOpen(false);
  };

  const handleTriggerClick = () => {
    if (editable) return;
    if (openOnClick) {
      openPicker();
    }
  };

  const handleKeyDownWrapper = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      if (openOnClick && !editable) {
        openPicker();
      }
    }
    onKeyDown?.(e);
  };

  // Исправленная функция форматирования: берёт все цифры, первые 8 для даты,
  // остальные для времени, вставляет точки на правильные позиции.
  const formatInputString = (raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 0) return '';

    const dateDigits = digits.slice(0, 8);
    const timeDigits = digits.slice(8);

    // Форматируем дату: DD.MM.YYYY, добавляя точки после 2-го и 4-го символа
    let formattedDate = '';
    if (dateDigits.length > 0) {
      formattedDate = dateDigits.slice(0, 2);
      if (dateDigits.length > 2) {
        formattedDate += '.' + dateDigits.slice(2, 4);
        if (dateDigits.length > 4) {
          formattedDate += '.' + dateDigits.slice(4, 8);
        }
      }
    }

    // Форматируем время: HH:MM:SS, добавляя двоеточия после 2-го и 4-го символа
    const correctedTimeDigits = correctTimeDigits(timeDigits);
    let formattedTime = '';
    if (correctedTimeDigits.length > 0) {
      formattedTime = correctedTimeDigits.slice(0, 2);
      if (correctedTimeDigits.length > 2) {
        formattedTime += ':' + correctedTimeDigits.slice(2, 4);
        if (correctedTimeDigits.length > 4) {
          formattedTime += ':' + correctedTimeDigits.slice(4, 6);
        }
      }
    }

    return formattedTime ? `${formattedDate} ${formattedTime}` : formattedDate;
  };

  const isComplete = (text: string): boolean => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < 8) return false;
    if (digits.length > 8) {
      const timeDigits = digits.slice(8);
      return timeDigits.length === 6;
    }
    return true;
  };

  const applyDebounced = (text: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const trimmed = text.trim();
    if (trimmed === '') {
      onChange('');
      return;
    }

    if (isComplete(text)) {
      const parsed = parseFullDateTime(text);
      if (parsed) {
        debounceTimerRef.current = setTimeout(() => {
          const newDate = parsed.dateIso;
          const newTime = parsed.time || '';
          let newValue = newDate;
          if (newTime && isValidTime(newTime)) {
            newValue = `${newDate}T${normalizeTime(newTime)}`;
          }
          onChange(newValue);
        }, debounceMs);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatInputString(raw);
    setInputText(formatted);
    applyDebounced(formatted);
  };

  const handleInputBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const trimmed = inputText.trim();
    if (trimmed === '') {
      setDate('');
      setDateDisplay('');
      setTime('');
      setDateError(false);
      setTimeError(false);
      if (onBlur) {
        onBlur('', '');
      } else {
        onChange('');
      }
      return;
    }

    const parsed = parseFullDateTime(inputText);
    if (parsed) {
      const newDate = parsed.dateIso;
      const newTime = parsed.time || '';
      setDate(newDate);
      setDateDisplay(formatDateForDisplay(newDate));
      setTime(newTime);
      setDateError(false);
      setTimeError(!!newTime && !isValidTime(newTime));
      let newValue = newDate;
      const displayDate = formatDateForDisplay(newDate);
      let displayStr = displayDate;
      if (newTime && isValidTime(newTime)) {
        newValue = `${newDate}T${normalizeTime(newTime)}`;
        displayStr = `${displayDate} ${newTime}`;
      }
      if (onBlur) {
        onBlur(newValue, displayStr);
      } else {
        onChange(newValue);
      }
    } else {
      setInputText(displayValue());
    }
  };

  const handleInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const parsed = parsePastedDateTime(pasted);
    if (parsed) {
      const newDate = parsed.dateIso;
      const newTime = parsed.time || '';
      setDate(newDate);
      setDateDisplay(parsed.dateDisplay);
      setTime(newTime);
      const displayStr = parsed.dateDisplay + (newTime ? ` ${newTime}` : '');
      setInputText(displayStr);
      setDateError(false);
      setTimeError(!!newTime && !isValidTime(newTime));
      let newValue = newDate;
      if (newTime && isValidTime(newTime)) {
        newValue = `${newDate}T${normalizeTime(newTime)}`;
      }
      if (onBlur) {
        onBlur(newValue, displayStr);
      } else {
        onChange(newValue);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    } else {
      setInputText(inputText + pasted);
    }
  };

  const handleDateDisplayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '');
    let formatted = digits;

    if (digits.length > 2 && digits[2] !== '.') {
      formatted = digits.slice(0, 2) + '.' + digits.slice(2);
    }
    if (digits.length > 5 && digits[5] !== '.') {
      formatted = formatted.slice(0, 5) + '.' + formatted.slice(5);
    }
    formatted = formatted.slice(0, 10);

    setDateDisplay(formatted);

    if (formatted.length === 10) {
      const iso = parseDisplayToIso(formatted);
      const valid = isValidDate(iso);
      setDateError(!valid);
      if (valid) {
        setDate(iso);
        timeInputRef.current?.focus();
      } else {
        setDate('');
      }
    } else {
      setDateError(false);
      setDate('');
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatTimeInput(raw);
    setTime(formatted);
    setTimeError(!isValidTime(formatted) && formatted !== '');
  };

  const handleDatePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const parsed = parsePastedDateTime(pasted);
    if (parsed) {
      setDate(parsed.dateIso);
      setDateDisplay(parsed.dateDisplay);
      setTime(parsed.time);
      setDateError(false);
      setTimeError(parsed.time ? !isValidTime(parsed.time) : false);
    }
  };

  const openNativeDatePicker = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nativeDateInputRef.current) {
      nativeDateInputRef.current.showPicker();
    }
  };

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (newDate) {
      setDate(newDate);
      const display = formatDateForDisplay(newDate);
      setDateDisplay(display);
      setDateError(false);
    }
  };

  const sizeClasses = {
    sm: 'px-1 py-0.5 text-xs',
    md: 'px-2 py-1.5 text-sm',
    lg: 'px-3 py-2 text-base',
  };

  const popupContent =
    isOpen &&
    triggerRect &&
    createPortal(
      <div
        ref={popupRef}
        className='fixed z-[1000] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg'
        style={{
          top: triggerRect.bottom + window.scrollY + 4,
          left: triggerRect.left + window.scrollX,
          minWidth: '320px',
        }}
      >
        <div className='p-3 space-y-3'>
          <div className='flex items-center gap-2'>
            <div className='relative flex-1 min-w-0'>
              <input
                ref={nativeDateInputRef}
                type='date'
                value={date}
                onChange={handleNativeDateChange}
                className='sr-only'
              />
              <input
                ref={displayDateInputRef}
                type='text'
                value={dateDisplay}
                onChange={handleDateDisplayChange}
                onPaste={handleDatePaste}
                placeholder='ДД.ММ.ГГГГ'
                className={clsx(
                  'w-full',
                  'text-xs px-1 py-0.5 pr-7 rounded-md',
                  'bg-white dark:bg-gray-800',
                  'border border-gray-300 dark:border-gray-600',
                  'focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400',
                  'dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400',
                  dateError && 'border-red-500 dark:border-red-400',
                )}
              />
              <button
                type='button'
                onClick={openNativeDatePicker}
                className='absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none'
                aria-label='Выбрать дату'
              >
                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                  />
                </svg>
              </button>
            </div>
            <div className='w-28 flex-shrink-0'>
              <input
                ref={timeInputRef}
                type='text'
                value={time}
                onChange={handleTimeChange}
                placeholder='ЧЧ:ММ:СС'
                className={clsx(
                  'w-full',
                  'text-xs px-1 py-0.5 rounded-md',
                  'bg-white dark:bg-gray-800',
                  'border border-gray-300 dark:border-gray-600',
                  'focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400',
                  'dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400',
                  timeError && 'border-red-500 dark:border-red-400',
                )}
              />
            </div>
          </div>
          <div className='flex justify-end items-center pt-1'>
            <div className='flex space-x-2'>
              <button
                type='button'
                onClick={handleClear}
                className='px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
              >
                Очистить
              </button>
              <button
                type='button'
                onClick={applySelection}
                className='px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-700 dark:hover:bg-blue-800'
                disabled={!date || dateError || timeError}
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <div className={`relative ${className}`} onKeyDown={handleKeyDownWrapper}>
      <div
        ref={triggerRef}
        className={clsx(
          'flex items-center border border-gray-300 dark:border-gray-600 rounded-md shadow-sm',
          editable ? 'bg-white dark:bg-gray-800' : 'cursor-text',
          sizeClasses[inputSize],
          'focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 dark:focus-within:ring-blue-400',
          'hover:border-gray-400 dark:hover:border-gray-500 transition-colors',
        )}
        onClick={handleTriggerClick}
        tabIndex={-1}
      >
        {editable ? (
          <>
            <input
              ref={inputRef}
              type='text'
              value={inputText}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onPaste={handleInputPaste}
              onClick={() => setIsOpen(false)}
              placeholder={placeholder}
              className={clsx(
                'w-full bg-transparent outline-none',
                sizeClasses[inputSize],
                !value
                  ? 'placeholder-gray-400 dark:placeholder-gray-400'
                  : 'text-gray-900 dark:text-gray-100',
              )}
            />
            <button
              type='button'
              onClick={openPicker}
              className='ml-auto flex-shrink-0 focus:outline-none p-1 -mr-1'
              aria-label='Выбрать дату'
            >
              <svg
                className='w-4 h-4 text-gray-400 dark:text-gray-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                />
              </svg>
            </button>
          </>
        ) : (
          <>
            <span
              className={clsx(
                'truncate',
                !value ? 'text-gray-400 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100',
              )}
            >
              {displayValue() || placeholder}
            </span>
            <button
              type='button'
              onClick={openPicker}
              className='ml-auto flex-shrink-0 focus:outline-none p-1 -mr-1'
              aria-label='Выбрать дату'
            >
              <svg
                className='w-4 h-4 text-gray-400 dark:text-gray-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                />
              </svg>
            </button>
          </>
        )}
      </div>
      {popupContent}
    </div>
  );
};
