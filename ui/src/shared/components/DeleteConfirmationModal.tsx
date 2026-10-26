import { ConfirmationModal } from './ConfirmationModal';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userLogin: string;
  isLoading?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  userLogin,
  ...props
}) => {
  return (
    <ConfirmationModal
      {...props}
      title='Подтверждение удаления'
      message={
        <>
          Вы уверены, что хотите удалить{' '}
          <span className='font-medium text-gray-700 dark:text-gray-300'>{userLogin}</span>? Это
          действие нельзя отменить.
        </>
      }
      confirmText='Удалить'
      icon={
        <div className='mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30'>
          <svg
            className='h-5 w-5 text-red-600 dark:text-red-400'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
            />
          </svg>
        </div>
      }
    />
  );
};
