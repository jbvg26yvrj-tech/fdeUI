import { useState, useEffect } from 'react';
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
  const [ldapEnabled, setLdapEnabled] = useState(false);
  const [providersError, setProvidersError] = useState(false);
  useEffect(() => {
    let active = true;
    authApi
      .providers()
      .then(result => {
        if (active) setLdapEnabled(result.ldapEnabled);
      })
      .catch(() => {
        if (active) setProvidersError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (data: AuthRequestDto) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.login(data);
      authLogin(response.user, response.accessToken);

      const requiresPasswordChange =
        response.user.authSource !== 'LDAP' && response.user.passwordChangeRequired;

      if (requiresPasswordChange) {
        sessionStorage.setItem('requiresPasswordChange', 'true');
        navigate('/change-password');
      } else {
        navigate('/');
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
    <main className='min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-slate-50 dark:bg-slate-900'>
      <section className='bg-[#183654] text-white px-7 py-10 sm:px-14 lg:p-20 flex flex-col justify-center'>
        <div className='font-semibold text-2xl tracking-tight mb-12'>
          FDE <span className='text-sm font-normal text-blue-200 ml-3'>File Delivery Engine</span>
        </div>
        <h1 className='text-4xl sm:text-5xl font-semibold leading-tight tracking-tight max-w-xl'>
          Файлы движутся.
          <br />
          Вы управляете.
        </h1>
        <p className='text-blue-100 mt-6 text-lg leading-relaxed max-w-md'>
          Потоки передачи, расписания и история выполнения — в единой рабочей панели.
        </p>
        <div aria-hidden='true' className='hidden lg:flex mt-16 items-center text-sm text-blue-100'>
          <div className='border border-blue-300/50 p-5 rounded-lg'>Отправитель</div>
          <div className='h-px bg-blue-300 flex-1 max-w-16' />
          <div className='border-2 border-blue-200 p-5 rounded-lg text-white font-semibold'>
            FDE
          </div>
          <div className='h-px bg-blue-300 flex-1 max-w-16' />
          <div className='border border-blue-300/50 p-5 rounded-lg'>Получатель</div>
        </div>
      </section>
      <section className='px-5 py-10 sm:px-10 flex flex-col justify-center'>
        <AuthForm
          onSubmit={handleLogin}
          isLoading={isLoading}
          isLogin={true}
          error={error}
          ldapEnabled={ldapEnabled}
        />
        {providersError && (
          <p
            role='status'
            className='max-w-md mx-auto mt-4 text-sm text-slate-600 dark:text-slate-300'
          >
            Не удалось проверить доступность доменного входа. Локальный вход доступен. Обновите
            страницу, чтобы повторить проверку.
          </p>
        )}
        <div className='mt-6 text-center text-sm'>
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
      </section>
    </main>
  );
};

export default LoginPage;
