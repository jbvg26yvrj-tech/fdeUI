import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthForm } from '../components/AuthForm';
import type { AuthRequestDto } from '../types/types';
import { authApi } from '../api/authApi';
import { useAuth } from '../../../context/AuthContext';
import { isApiError } from '../../../shared/api/ApiError';

const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const handleLogin = async (data: AuthRequestDto) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.login(data);
      authLogin(response.user, response.accessToken);

      const requiresPasswordChange = response.user.passwordChangeRequired;

      const pendingPipelineId = sessionStorage.getItem('pendingPipelineId');

      if (requiresPasswordChange) {
        sessionStorage.setItem('requiresPasswordChange', 'true');
        navigate('/change-password');
      } else if (pendingPipelineId) {
        navigate(`/pipelines/${pendingPipelineId}`);
        sessionStorage.removeItem('pendingPipelineId');
      } else {
        navigate('/pipelines');
      }
    } catch (err) {
      if (isApiError(err) && (err.status === 401 || err.status === 403)) {
        // Login-specific errors: show server message, do NOT trigger logout
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Не удалось выполнить вход. Попробуйте позже.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
      <AuthForm onSubmit={handleLogin} isLoading={isLoading} isLogin={true} error={error} />

      <div className='mt-6 text-center'>
        <p className='text-gray-600 dark:text-gray-400'>
          Нет аккаунта?{' '}
          <Link
            to='/registration'
            className='text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium'
          >
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
