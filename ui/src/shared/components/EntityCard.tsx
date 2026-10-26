import React from 'react';
import { MenuActions } from '../ui/table/components/MenuActions';
import { type MenuAction } from '../ui/table/types/type';

export interface CardField {
  key: string;
  label: string;
  render?: (value: any, item: any) => React.ReactNode;
  className?: string;
}

export interface CardAction {
  label: string;
  onClick: (item: any) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  action?: MenuAction;
  show?: boolean;
}

interface EntityCardProps {
  item: any;
  fields: CardField[];
  actions?: CardAction[];
  titleKey?: string;
  titleRender?: (item: any) => React.ReactNode;
  className?: string;
}

export const EntityCard: React.FC<EntityCardProps> = ({
  item,
  fields,
  actions = [],
  titleKey,
  titleRender,
  className = '',
}) => {
  const title = titleRender ? titleRender(item) : titleKey ? item[titleKey] : undefined;

  const menuItems = actions.map(action => ({
    action: action.action || (action.label.toLowerCase().replace(/\s+/g, '-') as MenuAction),
    label: action.label,
    onClick: () => action.onClick(item),
    disabled: action.disabled,
    icon: action.icon,
    className: action.className,
    show: action.show,
  }));

  return (
    <div
      className={`border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-full flex flex-col ${className}`}
    >
      <div className='flex justify-between items-start mb-2'>
        {title && (
          <h3
            className='font-medium text-lg truncate text-gray-900 dark:text-gray-100'
            title={title}
          >
            {title}
          </h3>
        )}
        {actions.length > 0 && <MenuActions menuItems={menuItems} row={item} />}
      </div>

      <div className='space-y-1 text-sm text-gray-900 dark:text-gray-100 flex-1'>
        {fields.map(field => {
          const value = item[field.key];
          return (
            <div key={field.key} className={`flex items-start gap-1 ${field.className || ''}`}>
              <span className='text-gray-500 dark:text-gray-400 whitespace-nowrap'>
                {field.label}:
              </span>
              <span className='truncate' title={typeof value === 'string' ? value : undefined}>
                {field.render
                  ? field.render(value, item)
                  : typeof value === 'boolean'
                    ? value
                      ? '🟢 Да'
                      : '🔴 Нет'
                    : (value ?? '-')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
