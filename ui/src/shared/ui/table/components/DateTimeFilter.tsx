// DateTimeFilter.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { OperatorSelect } from './OperatorSelect';
import { DatePickerPopup } from './DatePickerPopup';
import clsx from 'clsx';
import type { DateTimeFilterValue } from '../types/type';
import {
  formatDateForDisplay,
  parseDisplayToIso,
  isValidDate,
  isValidTime,
  formatTimeInput,
  parsePastedDateTime,
  parseFullDateTime,
} from '../../../utils/dateUtils';

interface DateTimeFilterProps {
  field: string;
  value: DateTimeFilterValue | null;
  onChange: (field: string, value: DateTimeFilterValue | null) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

const OPERATORS = [
  { value: 'eq', label: '=' },
  { value: 'ne', label: '≠' },
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'gte', label: '≥' },
  { value: 'lte', label: '≤' },
  { value: 'between', label: '≬' },
];

const detectPrecision = (str: string): DateTimeFilterValue['precision'] => {
  if (!str.includes('T')) return 'DATE';
  if (!str.includes('.')) return 'SECOND';
  const frac = str.split('.')[1]?.length || 0;
  if (frac <= 3) return 'MILLISECOND';
  return 'MICROSECOND';
};

const isValidRange = (from: string, to: string): boolean => {
  if (!from || !to) return false;
  const d1 = new Date(from);
  const d2 = new Date(to);
  return (
    d1 instanceof Date &&
    !isNaN(d1.getTime()) &&
    d2 instanceof Date &&
    !isNaN(d2.getTime()) &&
    d1 <= d2
  );
};

// Вспомогательный компонент для одного поля даты+времени
const DateTimeInput: React.FC<{
  value: string; // ISO значение (может быть с T)
  onChange: (isoValue: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}> = ({ value, onChange, onKeyDown }) => {
  const [dateDisplay, setDateDisplay] = useState('');
  const [time, setTime] = useState('');
  const [dateError, setDateError] = useState(false);
  const [timeError, setTimeError] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);
  const [dateIso, setDateIso] = useState('');

  // Синхронизация с пропом value
  useEffect(() => {
    if (value) {
      if (value.includes('T')) {
        const [d, t] = value.split('T');
        setDateIso(d);
        setDateDisplay(formatDateForDisplay(d));
        setTime(t.split('.')[0].split('+')[0].split('Z')[0]);
      } else {
        setDateIso(value);
        setDateDisplay(formatDateForDisplay(value));
        setTime('');
      }
    } else {
      setDateIso('');
      setDateDisplay('');
      setTime('');
    }
    setDateError(false);
    setTimeError(false);
  }, [value]);

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const applyDebounced = (newDateDisplay: string, newTime: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    const dateDigits = newDateDisplay.replace(/\D/g, '');
    const timeDigits = newTime.replace(/\D/g, '');

    // Условие для применения: либо оба пустые (сброс), либо дата полная (8 цифр) и время пустое, либо дата полная и время полное (6 цифр)
    if (dateDigits.length === 0 && timeDigits.length === 0) {
      // Полный сброс
      debounceTimerRef.current = setTimeout(() => {
        onChange('');
      }, 300);
      return;
    }

    const dateComplete = dateDigits.length === 8;
    const timeComplete = timeDigits.length === 6 || timeDigits.length === 0;
    if (dateComplete && timeComplete) {
      const parsed = parseFullDateTime(`${newDateDisplay} ${newTime}`); // передаём объединённую строку
      if (parsed) {
        debounceTimerRef.current = setTimeout(() => {
          const newIso = parsed.time ? `${parsed.dateIso}T${parsed.time}` : parsed.dateIso;
          onChange(newIso);
        }, 300);
      }
    }
    // Если неполные данные – таймер не ставится
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length > 2) {
      formatted = digits.slice(0, 2) + '.' + digits.slice(2);
    }
    if (digits.length > 5) {
      formatted = formatted.slice(0, 5) + '.' + formatted.slice(5);
    }
    formatted = formatted.slice(0, 10);
    setDateDisplay(formatted);

    if (formatted === '') {
      // Пустое поле даты – сбрасываем
      setDateIso('');
      setDateError(false);
      applyDebounced('', time);
      return;
    }

    const valid = formatted.length === 10 && isValidDate(parseDisplayToIso(formatted));
    setDateError(!valid && formatted.length > 0);

    if (formatted.length === 10 && valid) {
      const iso = parseDisplayToIso(formatted);
      setDateIso(iso);
      timeInputRef.current?.focus();
    } else {
      setDateIso('');
    }
    applyDebounced(formatted, time);
  };

  const handleDatePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const parsed = parsePastedDateTime(pasted);
    if (parsed) {
      setDateDisplay(parsed.dateDisplay);
      setTime(parsed.time);
      setDateIso(parsed.dateIso);
      setDateError(false);
      setTimeError(parsed.time ? !isValidTime(parsed.time) : false);
      applyDebounced(parsed.dateDisplay, parsed.time);
    }
    // Если не распарсилось, ничего не делаем (игнорируем вставку)
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatTimeInput(raw);
    setTime(formatted);
    const valid = formatted.length === 8 ? isValidTime(formatted) : true;
    setTimeError(!valid && formatted.length > 0);
    applyDebounced(dateDisplay, formatted);
  };

  const handleTimePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const digits = pasted.replace(/\D/g, '');
    const formatted = formatTimeInput(digits);
    setTime(formatted);
    applyDebounced(dateDisplay, formatted);
  };

  const toggleCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCalendarOpen(prev => !prev);
  };

  const handleDateSelect = (newIsoDate: string) => {
    if (newIsoDate) {
      const display = formatDateForDisplay(newIsoDate);
      setDateDisplay(display);
      setDateIso(newIsoDate);
      setDateError(false);
      applyDebounced(display, time);
    } else {
      // очистка
      setDateDisplay('');
      setDateIso('');
      setDateError(false);
      applyDebounced('', time);
    }
  };

  return (
    <div className='flex items-center gap-2 w-full'>
      <div className='relative flex-1 min-w-0'>
        <input
          ref={dateInputRef}
          type='text'
          value={dateDisplay}
          onChange={handleDateChange}
          onPaste={handleDatePaste}
          placeholder='ДД.ММ.ГГГГ'
          className={clsx(
            'w-full text-xs px-1 py-0.5 pr-7 rounded-md',
            'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600',
            'focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400',
            'dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400',
            dateError && 'border-red-500 dark:border-red-400',
          )}
          onKeyDown={onKeyDown}
        />
        <button
          ref={calendarButtonRef}
          type='button'
          onClick={toggleCalendar}
          className='absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none'
          aria-label='Выбрать дату'
          tabIndex={-1}
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
        <DatePickerPopup
          isOpen={isCalendarOpen}
          anchorRef={calendarButtonRef as React.RefObject<HTMLElement>}
          onClose={() => setIsCalendarOpen(false)}
          onSelect={handleDateSelect}
          initialDate={dateIso}
          align='center'
        />
      </div>
      <div className='w-20 flex-shrink-0'>
        <input
          ref={timeInputRef}
          type='text'
          value={time}
          onChange={handleTimeChange}
          onPaste={handleTimePaste}
          placeholder='ЧЧ:ММ:СС'
          className={clsx(
            'w-full text-xs px-1 py-0.5 rounded-md',
            'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600',
            'focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400',
            'dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400',
            timeError && 'border-red-500 dark:border-red-400',
          )}
          onKeyDown={onKeyDown}
        />
      </div>
    </div>
  );
};

export const DateTimeFilter: React.FC<DateTimeFilterProps> = ({
  field,
  value,
  onChange,
  onKeyDown,
}) => {
  const [operator, setOperator] = useState<string>(value?.operator || 'eq');
  const [singleValue, setSingleValue] = useState<string>('');
  const [fromValue, setFromValue] = useState<string>('');
  const [toValue, setToValue] = useState<string>('');

  const isRangeInvalid = useMemo(() => {
    return operator === 'between' && fromValue && toValue && !isValidRange(fromValue, toValue);
  }, [operator, fromValue, toValue]);

  const prevFilterValueRef = useRef<DateTimeFilterValue | null>(value);

  // Синхронизация с пропом value
  useEffect(() => {
    if (!value) {
      setSingleValue('');
      setFromValue('');
      setToValue('');
      return;
    }
    setOperator(value.operator);
    if (value.operator === 'between') {
      const parts = value.value.split(',');
      setFromValue(parts[0] || '');
      setToValue(parts[1] || '');
      setSingleValue('');
    } else {
      setSingleValue(value.value);
      setFromValue('');
      setToValue('');
    }
  }, [value]);

  useEffect(() => {
    prevFilterValueRef.current = value;
  }, [value]);

  const emitChange = (op: string, single: string, from: string, to: string) => {
    // Обработка режима between
    if (op === 'between') {
      // Случай 1: оба поля пустые -> сброс
      if (!from && !to) {
        const newValue = null;
        if (JSON.stringify(prevFilterValueRef.current) !== JSON.stringify(newValue)) {
          onChange(field, newValue);
          prevFilterValueRef.current = newValue;
        }
        return;
      }
      // Случай 2: одно поле пустое, другое нет -> ничего не делаем
      if (!from || !to) {
        return;
      }
      // Случай 3: оба не пусты, но невалидны -> ничего не делаем
      if (!isValidRange(from, to)) {
        return;
      }
      // Случай 4: оба не пусты и валидны -> применяем фильтр
      const valueStr = `${from},${to}`;
      const precision = detectPrecision(from);
      const filterValue = {
        value: valueStr,
        operator: op as DateTimeFilterValue['operator'],
        precision,
      };
      if (JSON.stringify(prevFilterValueRef.current) !== JSON.stringify(filterValue)) {
        onChange(field, filterValue);
        prevFilterValueRef.current = filterValue;
      }
      return;
    }

    // Для не-between режимов
    if (!single) {
      const newValue = null;
      if (JSON.stringify(prevFilterValueRef.current) !== JSON.stringify(newValue)) {
        onChange(field, newValue);
        prevFilterValueRef.current = newValue;
      }
      return;
    }

    // Одиночный режим с непустым значением
    const precision = detectPrecision(single);
    const filterValue = {
      value: single,
      operator: op as DateTimeFilterValue['operator'],
      precision,
    };
    if (JSON.stringify(prevFilterValueRef.current) !== JSON.stringify(filterValue)) {
      onChange(field, filterValue);
      prevFilterValueRef.current = filterValue;
    }
  };

  const handleOperatorChange = (newOp: string) => {
    let currentValue = '';
    if (operator === 'between') {
      currentValue = fromValue || toValue || '';
    } else {
      currentValue = singleValue;
    }

    setOperator(newOp);

    if (newOp === 'between') {
      setFromValue(currentValue);
      setToValue(currentValue);
      emitChange(newOp, '', currentValue, currentValue);
    } else {
      setSingleValue(currentValue);
      emitChange(newOp, currentValue, '', '');
    }
  };

  const handleSingleChange = (isoVal: string) => {
    setSingleValue(isoVal);
    emitChange(operator, isoVal, fromValue, toValue);
  };

  const handleFromChange = (isoVal: string) => {
    setFromValue(isoVal);
    emitChange(operator, singleValue, isoVal, toValue);
  };

  const handleToChange = (isoVal: string) => {
    setToValue(isoVal);
    emitChange(operator, singleValue, fromValue, isoVal);
  };

  return (
    <div className='flex items-start w-full min-w-0'>
      <div className='w-12 flex-shrink-0 mr-0.5'>
        <OperatorSelect
          options={OPERATORS.map(op => ({ value: op.value, label: op.label }))}
          value={operator}
          onChange={handleOperatorChange}
        />
      </div>

      {operator === 'between' ? (
        <div className='flex flex-col gap-1 flex-1 min-w-0'>
          <div className='flex items-center gap-1 w-full min-w-0'>
            <span className='text-xs text-gray-500 dark:text-gray-300 whitespace-nowrap flex-shrink-0'>
              от:
            </span>
            <div
              className={`flex-1 min-w-0 ${isRangeInvalid ? 'border border-red-500 dark:border-red-400 rounded' : ''}`}
            >
              <DateTimeInput value={fromValue} onChange={handleFromChange} onKeyDown={onKeyDown} />
            </div>
          </div>
          <div className='flex items-center gap-1 w-full min-w-0'>
            <span className='text-xs text-gray-500 dark:text-gray-300 whitespace-nowrap flex-shrink-0'>
              до:
            </span>
            <div
              className={`flex-1 min-w-0 ${isRangeInvalid ? 'border border-red-500 dark:border-red-400 rounded' : ''}`}
            >
              <DateTimeInput value={toValue} onChange={handleToChange} onKeyDown={onKeyDown} />
            </div>
          </div>
        </div>
      ) : (
        <div className='flex-1 min-w-0'>
          <DateTimeInput value={singleValue} onChange={handleSingleChange} onKeyDown={onKeyDown} />
        </div>
      )}
    </div>
  );
};
