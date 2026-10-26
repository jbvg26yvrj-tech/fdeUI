import React from 'react';

interface IconProps {
  className?: string;
}

export const ChevronUpIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 15l7-7 7 7' />
  </svg>
);

export const ChevronDownIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
  </svg>
);

export const ChevronUpDownIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4'
    />
  </svg>
);

// Новые иконки для активной сортировки (отдельные стрелки вверх/вниз)
export const ArrowUpIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M7 16V4m0 0L3 8m4-4l4 4'
    />
  </svg>
);

export const ArrowDownIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M17 8v12m0 0l4-4m-4 4l-4-4'
    />
  </svg>
);

// TableIcon
export const TableIcon = ({ active }: { active?: boolean }) => (
  <svg
    className={`w-5 h-5 ${
      active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
    }`}
    fill='none'
    viewBox='0 0 24 24'
    stroke='currentColor'
  >
    <rect x='3' y='5' width='18' height='14' strokeWidth='1.5' />
    <path strokeLinecap='round' strokeWidth='1.5' d='M3 9h18M9 5v14' />
  </svg>
);

// CardsIcon
export const CardsIcon = ({ active }: { active?: boolean }) => (
  <svg
    className={`w-5 h-5 ${
      active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
    }`}
    fill='none'
    viewBox='0 0 24 24'
    stroke='currentColor'
  >
    <rect x='4' y='4' width='7' height='7' strokeWidth='1.2' stroke='currentColor' fill='none' />
    <rect x='13' y='4' width='7' height='7' strokeWidth='1.2' stroke='currentColor' fill='none' />
    <rect x='4' y='13' width='7' height='7' strokeWidth='1.2' stroke='currentColor' fill='none' />
    <rect x='13' y='13' width='7' height='7' strokeWidth='1.2' stroke='currentColor' fill='none' />
  </svg>
);
