import React from 'react';
import clsx from 'clsx';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled = false, label }) => {
  return (
    <label
      className={clsx(
        'flex items-center cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <div className='relative'>
        <input
          type='checkbox'
          className='sr-only'
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
        />
        <div
          className={clsx(
            'block w-12 h-6 rounded-full transition-colors duration-300',
            checked ? 'bg-blue-600 dark:bg-blue-700' : 'bg-gray-300 dark:bg-gray-600',
          )}
        ></div>
        <div
          className={clsx(
            'absolute left-1 top-1 bg-white dark:bg-gray-300 w-4 h-4 rounded-full transition-transform duration-300',
            checked && 'transform translate-x-6',
          )}
        ></div>
      </div>
      {label && <span className='ml-3 text-sm text-gray-700 dark:text-gray-300'>{label}</span>}
    </label>
  );
};

export default Switch;
