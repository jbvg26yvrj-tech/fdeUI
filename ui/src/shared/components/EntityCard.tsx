import React from 'react';
import '../ui/table/table.css';
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
    <div className={`fde-entity-card p-4 h-full flex flex-col min-w-0 ${className}`}>
      <div className='flex justify-between items-start gap-3 mb-3'>
        {title && (
          <h3 className='font-semibold text-base min-w-0 break-words' title={title}>
            {title}
          </h3>
        )}
        {actions.length > 0 && <MenuActions menuItems={menuItems} row={item} />}
      </div>

      <div className='space-y-2 text-sm flex-1'>
        {fields.map(field => {
          const value = item[field.key];
          return (
            <div
              key={field.key}
              className={`flex flex-wrap items-start gap-x-2 gap-y-1 ${field.className || ''}`}
            >
              <span className='text-gray-500 dark:text-gray-400 whitespace-nowrap'>
                {field.label}:
              </span>
              <span
                className='min-w-0 break-words'
                title={typeof value === 'string' ? value : undefined}
              >
                {field.render ? (
                  field.render(value, item)
                ) : typeof value === 'boolean' ? (
                  value ? (
                    <span className='fde-status fde-status-positive'>Да</span>
                  ) : (
                    <span className='fde-status fde-status-neutral'>Нет</span>
                  )
                ) : (
                  (value ?? '-')
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
