import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

interface DatePickerPopupProps {
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  onSelect: (isoDate: string) => void;
  initialDate?: string;
  align?: 'left' | 'center' | 'right';
}

// Вспомогательные функции
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

const getMonthDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1).getDay(); // 0 = воскресенье
  const daysInMonth = getDaysInMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);
  const days = [];
  // Дни предыдущего месяца
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: prevMonthDays - i, month: month - 1, year: year - (month === 0 ? 1 : 0) });
  }
  // Дни текущего месяца
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, month, year });
  }
  // Дни следующего месяца (чтобы заполнить до 6 строк)
  const totalCells = 42; // 6 строк * 7 дней
  const remaining = totalCells - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, month: month + 1, year: year + (month === 11 ? 1 : 0) });
  }
  return days;
};

const monthNames = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

export const DatePickerPopup: React.FC<DatePickerPopupProps> = ({
  isOpen,
  anchorRef,
  onClose,
  onSelect,
  initialDate,
  align = 'left',
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewDate, setViewDate] = useState<Date>(new Date());

  const prevMonthBtnRef = useRef<HTMLButtonElement>(null);
  const nextMonthBtnRef = useRef<HTMLButtonElement>(null);
  const todayBtnRef = useRef<HTMLButtonElement>(null);
  const clearBtnRef = useRef<HTMLButtonElement>(null);
  const applyBtnRef = useRef<HTMLButtonElement>(null);
  const dayRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const POPUP_WIDTH = 288; // соответствует w-72

  // Инициализация по initialDate или сегодняшней дате
  useEffect(() => {
    if (initialDate) {
      const d = new Date(initialDate + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setSelectedDate(d);
        setViewDate(d);
        return;
      }
    }
    const today = new Date();
    setSelectedDate(today);
    setViewDate(today);
  }, [initialDate]);

  // Закрытие по клику вне
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, anchorRef, onClose]);

  // Позиционирование
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (isOpen && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      let left = rect.left + window.scrollX;
      if (align === 'center') {
        left = rect.left + rect.width / 2 - POPUP_WIDTH / 2 + window.scrollX;
      } else if (align === 'right') {
        left = rect.right - POPUP_WIDTH + window.scrollX;
      }
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left,
      });
    }
  }, [isOpen, anchorRef, align]);

  // Фокус на первый элемент при открытии
  useEffect(() => {
    if (isOpen && prevMonthBtnRef.current) {
      prevMonthBtnRef.current.focus();
    }
  }, [isOpen]);

  // Форматирование даты в ISO без учёта часового пояса
  const formatISODate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Навигация с клавиатуры
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const focusedElement = document.activeElement;
    const dayIndex = dayRefs.current.findIndex(ref => ref === focusedElement);

    if (dayIndex !== -1) {
      const days = getMonthDays(viewDate.getFullYear(), viewDate.getMonth());
      let newIndex = dayIndex;

      if (e.key === 'ArrowLeft') {
        newIndex = dayIndex - 1;
      } else if (e.key === 'ArrowRight') {
        newIndex = dayIndex + 1;
      } else if (e.key === 'ArrowUp') {
        newIndex = dayIndex - 7;
      } else if (e.key === 'ArrowDown') {
        newIndex = dayIndex + 7;
      }

      if (newIndex >= 0 && newIndex < days.length) {
        e.preventDefault();
        const targetDay = days[newIndex];
        if (targetDay.month !== viewDate.getMonth() || targetDay.year !== viewDate.getFullYear()) {
          setViewDate(new Date(targetDay.year, targetDay.month, 1));
          setTimeout(() => {
            const newDays = getMonthDays(targetDay.year, targetDay.month);
            const newDayIndex = newDays.findIndex(
              d =>
                d.day === targetDay.day && d.month === targetDay.month && d.year === targetDay.year,
            );
            if (newDayIndex !== -1 && dayRefs.current[newDayIndex]) {
              dayRefs.current[newDayIndex]?.focus();
            }
          }, 0);
        } else {
          dayRefs.current[newIndex]?.focus();
        }
      }
    }
  };

  const handlePrevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setTimeout(() => prevMonthBtnRef.current?.focus(), 0);
  };

  const handleNextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setTimeout(() => nextMonthBtnRef.current?.focus(), 0);
  };

  const handleDayClick = (day: number, month: number, year: number) => {
    const newDate = new Date(year, month, day);
    const iso = formatISODate(newDate);
    onSelect(iso);
    onClose();
  };

  const handleTodayClick = () => {
    const today = new Date();
    const iso = formatISODate(today);
    onSelect(iso);
    onClose();
  };

  const handleClear = () => {
    onSelect('');
    onClose();
  };

  const handleApply = () => {
    if (selectedDate) {
      const iso = formatISODate(selectedDate);
      onSelect(iso);
    }
    onClose();
  };

  const isSelected = (day: number, month: number, year: number) => {
    return (
      selectedDate?.getDate() === day &&
      selectedDate?.getMonth() === month &&
      selectedDate?.getFullYear() === year
    );
  };

  if (!isOpen || !position) return null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const days = getMonthDays(year, month);

  // Обновляем длину массива refs
  dayRefs.current = dayRefs.current.slice(0, days.length);

  return createPortal(
    <div
      ref={popupRef}
      className={clsx(
        'fixed z-[1000] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4',
        'w-72',
      )}
      style={{
        top: position.top,
        left: position.left,
      }}
      onKeyDown={handleKeyDown}
      role='dialog'
      aria-label='Выбор даты'
    >
      {/* Заголовок с выбором месяца и года */}
      <div className='flex items-center justify-between mb-4'>
        <button
          ref={prevMonthBtnRef}
          type='button'
          onClick={handlePrevMonth}
          className='p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400'
          aria-label='Предыдущий месяц'
        >
          ←
        </button>
        <div className='text-sm font-medium text-gray-800 dark:text-gray-200'>
          {monthNames[month]} {year}
        </div>
        <button
          ref={nextMonthBtnRef}
          type='button'
          onClick={handleNextMonth}
          className='p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400'
          aria-label='Следующий месяц'
        >
          →
        </button>
      </div>

      {/* Сетка дней недели */}
      <div className='grid grid-cols-7 gap-1 text-center text-xs text-gray-500 dark:text-gray-400 mb-2'>
        {['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'].map(d => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Сетка дней */}
      <div className='grid grid-cols-7 gap-1'>
        {days.map((item, idx) => {
          const isCurrentMonth = item.month === month;
          return (
            <button
              key={idx}
              ref={el => {
                dayRefs.current[idx] = el;
              }}
              type='button'
              onClick={() => handleDayClick(item.day, item.month, item.year)}
              className={clsx(
                'w-8 h-8 text-xs rounded flex items-center justify-center transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400',
                !isCurrentMonth && 'text-gray-300 dark:text-gray-600',
                isCurrentMonth &&
                  'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                isSelected(item.day, item.month, item.year) &&
                  'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800',
              )}
              aria-label={`${item.day} ${monthNames[item.month]} ${item.year}`}
            >
              {item.day}
            </button>
          );
        })}
      </div>

      {/* Кнопки действий */}
      <div className='flex justify-between items-center mt-4'>
        <button
          ref={todayBtnRef}
          type='button'
          onClick={handleTodayClick}
          className='px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400'
        >
          Сегодня
        </button>
        <div className='flex gap-2'>
          <button
            ref={clearBtnRef}
            type='button'
            onClick={handleClear}
            className='px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400'
          >
            Очистить
          </button>
          <button
            ref={applyBtnRef}
            type='button'
            onClick={handleApply}
            className='px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400'
          >
            Применить
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
