import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { RegistrationForm } from '../components/RegistrationForm';
import type { RegistrationRequestDto } from '../types/types';
import { authApi } from '../api/authApi';

const RegistrationPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [enabled,setEnabled] = useState<boolean | null>(null);
  const [checkError,setCheckError] = useState(false);
  const [retry,setRetry] = useState(0);
  useEffect(()=>{let active=true;setCheckError(false);authApi.providers().then(r=>{if(active)setEnabled(r.registrationEnabled === true);}).catch(()=>{if(active)setCheckError(true);});return()=>{active=false;};},[retry]);

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
      {enabled===true ? <><p className='max-w-md mx-auto mb-5 px-6 text-sm'>После регистрации вы сможете войти и просмотреть информацию о системе. Доступ к потокам назначает администратор.</p><RegistrationForm onSubmit={handleRegistration} isLoading={isLoading} error={error} /></> : <div className='max-w-md mx-auto p-6 text-center'><h1 className='text-2xl font-semibold mb-4'>Регистрация</h1>{checkError ? <div role='alert'>Не удалось проверить доступность регистрации. <button className='underline' onClick={()=>setRetry(v=>v+1)}>Повторить</button></div> : <p role='status'>{enabled===null?'Проверка доступности…':'Регистрация отключена администратором.'}</p>}</div>}

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
