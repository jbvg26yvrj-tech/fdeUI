import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { RegistrationForm } from '../components/RegistrationForm';
import type { RegistrationRequestDto } from '../types/types';
import { authApi } from '../api/authApi';

const RegistrationPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRegistration = async (data: RegistrationRequestDto) => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.registration(data);
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
      <RegistrationForm onSubmit={handleRegistration} isLoading={isLoading} error={error} />

      <div className='mt-6 text-center'>
        <p className='text-gray-600 dark:text-gray-400'>
          Уже есть аккаунт?{' '}
          <Link
            to='/login'
            className='text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium'
          >
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegistrationPage;
