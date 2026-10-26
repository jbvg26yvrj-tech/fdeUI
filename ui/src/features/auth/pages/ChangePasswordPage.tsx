import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChangePasswordForm } from '../components/ChangePasswordForm';
import type { ChangePasswordRequest } from '../types/types';
import { authApi } from '../api/authApi';
import { useAuth } from '../../../context/AuthContext';

const ChangePasswordPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const requiresPasswordChange =
      currentUser?.passwordChangeRequired ||
      sessionStorage.getItem('requiresPasswordChange') === 'true';

    if (!requiresPasswordChange) {
      navigate('/pipelines');
    }
  }, [currentUser, navigate]);

  const handleChangePassword = async (_userLogin: string, data: ChangePasswordRequest) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await authApi.changePassword(data);
      sessionStorage.removeItem('requiresPasswordChange');
      setSuccess(true);

      setTimeout(() => {
        const pendingPipelineId = sessionStorage.getItem('pendingPipelineId');
        if (pendingPipelineId) {
          navigate(`/pipelines/${pendingPipelineId}`);
          sessionStorage.removeItem('pendingPipelineId');
        } else {
          navigate('/pipelines');
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed');
    } finally {
      setIsLoading(false);
    }
  };

  const requiresPasswordChange =
    currentUser?.passwordChangeRequired ||
    sessionStorage.getItem('requiresPasswordChange') === 'true';

  if (!requiresPasswordChange) {
    return (
      <div className='flex justify-center items-center p-12'>
        <div className='text-lg text-gray-600 dark:text-gray-400'>Перенаправление...</div>
      </div>
    );
  }

  return (
    <div className='max-w-4xl mx-auto'>
      <h1 className='text-2xl font-bold mb-6 text-gray-900 dark:text-white'>Смена пароля</h1>

      <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6'>
        <div className='flex items-center'>
          <svg
            className='w-5 h-5 text-yellow-600 dark:text-yellow-500 mr-2'
            fill='currentColor'
            viewBox='0 0 20 20'
          >
            <path
              fillRule='evenodd'
              d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
              clipRule='evenodd'
            />
          </svg>
          <span className='text-yellow-800 dark:text-yellow-300 font-medium'>
            Требуется смена пароля
          </span>
        </div>
        <p className='text-yellow-700 dark:text-yellow-400 text-sm mt-1'>
          Для продолжения работы в системе необходимо сменить пароль.
        </p>
      </div>

      {success && (
        <div className='max-w-md mx-auto mb-6 p-4 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 rounded'>
          Пароль успешно изменен! Перенаправляем на страницу пайплайнов...
        </div>
      )}

      <ChangePasswordForm
        onSubmit={handleChangePassword}
        isLoading={isLoading}
        error={error}
        currentUserLogin={currentUser?.login}
      />
    </div>
  );
};

export default ChangePasswordPage;
