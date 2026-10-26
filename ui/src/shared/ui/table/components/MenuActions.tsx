import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import ReactDOM from 'react-dom';
import clsx from 'clsx';
import type { MenuItem } from '../types/type';

interface MenuActionsProps<T> {
  menuItems: MenuItem<T>[];
  row: T;
  className?: string;
}

export const MenuActions = <T,>({ menuItems, row, className }: MenuActionsProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current || !menuRef.current) return;
    const buttonRect = buttonRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    let top = buttonRect.bottom;
    let left = buttonRect.left;
    if (buttonRect.bottom + menuRect.height > window.innerHeight) {
      top = buttonRect.top - menuRect.height;
    }
    if (top < 0) top = 10;
    if (buttonRect.left + menuRect.width > window.innerWidth) {
      left = buttonRect.right - menuRect.width;
    }
    if (left < 0) left = 10;
    setPosition({ top, left });
  }, [isOpen]);

  const handleMenuItemClick = (menuItem: MenuItem<T>) => {
    if (!menuItem.disabled) {
      menuItem.onClick(row);
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleWindowResize = () => setIsOpen(false);
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', handleWindowResize);
      window.addEventListener('orientationchange', handleWindowResize);
      window.addEventListener('fullscreenchange', handleWindowResize);
      window.addEventListener('maximize', handleWindowResize);
      window.addEventListener('minimize', handleWindowResize);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('orientationchange', handleWindowResize);
      window.removeEventListener('fullscreenchange', handleWindowResize);
      window.removeEventListener('maximize', handleWindowResize);
      window.removeEventListener('minimize', handleWindowResize);
    };
  }, [isOpen]);

  const filteredMenuItems = menuItems.filter(item => item.show !== false);

  const renderMenu = () => {
    if (!isOpen) return null;
    return ReactDOM.createPortal(
      <div
        ref={menuRef}
        className='fixed z-[9999] w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg focus:outline-none'
        style={{ top: position.top, left: position.left }}
      >
        <div className='py-1' role='menu' aria-orientation='vertical'>
          {filteredMenuItems.map(menuItem => (
            <button
              key={menuItem.action}
              className={clsx(
                'block w-full px-4 py-2 text-sm text-left transition-colors',
                menuItem.disabled
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
                menuItem.className,
              )}
              onClick={() => handleMenuItemClick(menuItem)}
              disabled={menuItem.disabled}
              role='menuitem'
              tabIndex={-1}
            >
              <div className='flex items-center'>
                {menuItem.icon && <span className='mr-3'>{menuItem.icon}</span>}
                {menuItem.label}
              </div>
            </button>
          ))}
        </div>
      </div>,
      document.body,
    );
  };

  return (
    <div className={clsx('relative inline-block text-left', className)}>
      <button
        ref={buttonRef}
        type='button'
        className='inline-flex justify-center w-6 h-6 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700'
        onClick={toggleMenu}
        aria-expanded={isOpen}
        aria-haspopup='true'
      >
        <span className='sr-only'>Open actions menu</span>
        <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
          <path d='M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z' />
        </svg>
      </button>
      {renderMenu()}
    </div>
  );
};
