/* eslint-disable no-useless-catch */
import React, { useState } from 'react';
import Modal from '../ui/Modal'; // путь к вашему Modal
import { Button } from '../ui/Button'; // путь к вашему Button

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  icon?: React.ReactNode;
  isLoading?: boolean; // внешнее управление загрузкой (опционально)
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  icon,
  isLoading: externalLoading,
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = externalLoading ?? internalLoading;

  const handleConfirm = async () => {
    setInternalLoading(true);
    try {
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant='custom' // отключаем стандартный футер
      footer={
        <div className='flex justify-end space-x-2'>
          <Button variant='outlined' size='sm' onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button variant='primary' size='sm' onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Загрузка...' : confirmText}
          </Button>
        </div>
      }
    >
      <div className='text-center'>
        {icon && <div className='mx-auto mb-3'>{icon}</div>}
        <div className='text-sm text-gray-500 dark:text-gray-400'>{message}</div>
      </div>
    </Modal>
  );
};
