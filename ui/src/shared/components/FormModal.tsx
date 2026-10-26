import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input, PasswordInput, Textarea } from '../ui/Input';
import { Checkbox } from '../ui/Checkbox';
import { Select } from '../ui/Select';

export interface FormField {
  name: string;
  label: string;
  // Учитываем, что пароль нам тоже может понадобиться (для UserFormModal при создании)
  type: 'text' | 'password' | 'checkbox' | 'select' | 'textarea';
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: Record<string, any>) => void;
  title: string;
  fields: FormField[];
  initialValues: Record<string, any>;
  mode: 'create' | 'edit' | 'view';
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  fields,
  initialValues,
  mode,
  isLoading = false,
  size = 'sm',
}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setValues(initialValues);
      setErrors({});
    }
  }, [isOpen, initialValues]);

  const handleChange = (name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    fields.forEach(field => {
      // Для чекбоксов проверка на required может быть специфичной, пока оставим как есть
      if (field.required && !values[field.name] && values[field.name] !== false) {
        newErrors[field.name] = `Поле "${field.label}" обязательно`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(values);
  };

  const handleConfirm = () => {
    if (mode === 'view') {
      onClose();
    } else {
      // Имитируем отправку формы, чтобы сработала валидация
      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    }
  };

  const renderField = (field: FormField) => {
    const commonProps = {
      disabled: mode === 'view' || field.disabled,
      required: field.required,
      error: errors[field.name],
    };

    switch (field.type) {
      case 'checkbox':
        return (
          <Checkbox
            label={field.label}
            checked={!!values[field.name]}
            onChange={e => handleChange(field.name, e.target.checked)}
            {...commonProps}
          />
        );
      case 'select':
        return (
          <Select
            label={field.label}
            value={values[field.name] || ''}
            onChange={e => handleChange(field.name, e.target.value)}
            options={field.options || []}
            placeholder={field.placeholder}
            {...commonProps}
          />
        );
      case 'textarea':
        return (
          <Textarea
            label={field.label}
            value={values[field.name] || ''}
            onChange={e => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            {...commonProps}
          />
        );
      case 'password':
        return (
          <PasswordInput
            label={field.label}
            value={values[field.name] || ''}
            onChange={e => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            {...commonProps}
          />
        );
      default: // 'text'
        return (
          <Input
            label={field.label}
            value={values[field.name] || ''}
            onChange={e => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            {...commonProps}
          />
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={mode !== 'view' ? handleConfirm : undefined}
      title={title}
      variant={mode === 'view' ? 'alert' : 'confirm'}
      size={size}
      showCloseButton={true}
      confirmText={mode === 'create' ? 'Создать' : mode === 'edit' ? 'Сохранить' : 'Закрыть'}
      cancelText={mode !== 'view' ? 'Отмена' : undefined}
      disableBackdropClick={isLoading}
    >
      <form onSubmit={handleSubmit} className='space-y-4'>
        {fields.map(field => (
          <div key={field.name}>{renderField(field)}</div>
        ))}
      </form>
    </Modal>
  );
};
