import { useState } from 'react';
import { Input, PasswordInput } from '../../../shared/ui/Input'; // Уточните путь
import type { AuthRequestDto } from '../types/types';

interface AuthFormProps {
  onSubmit: (data: AuthRequestDto) => void;
  isLoading: boolean;
  isLogin?: boolean;
  error?: string | null;
  ldapEnabled?: boolean;
}

export const AuthForm = ({
  onSubmit,
  isLoading,
  isLogin = true,
  error,
  ldapEnabled = false,
}: AuthFormProps) => {
  const [provider, setProvider] = useState<'LOCAL' | 'LDAP'>('LOCAL');
  const [formData, setFormData] = useState<AuthRequestDto>({
    login: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(isLogin ? { ...formData, provider } : formData);
  };

  return (
    <div className='w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8'>
      <h2 className='text-2xl font-bold mb-6 text-gray-800 dark:text-white'>
        {isLogin ? 'Вход в систему' : 'Регистрация'}
      </h2>
      {isLogin && ldapEnabled && (
        <div
          role='group'
          aria-label='Способ входа'
          className='grid grid-cols-2 gap-1 mb-6 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg'
        >
          {(['LOCAL', 'LDAP'] as const).map(value => (
            <button
              key={value}
              type='button'
              aria-pressed={provider === value}
              disabled={isLoading}
              onClick={() => {
                setProvider(value);
                setFormData(previous => ({ ...previous, password: '' }));
              }}
              className={`rounded-md px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-600 ${provider === value ? 'bg-white text-blue-800 shadow-sm dark:bg-slate-700 dark:text-blue-200' : 'text-slate-600 dark:text-slate-300'}`}
            >
              {value === 'LOCAL' ? 'Локальная учётная запись' : 'Доменная учётная запись'}
            </button>
          ))}
        </div>
      )}
      {provider === 'LDAP' && (
        <p className='mb-5 text-sm text-slate-600 dark:text-slate-300'>
          Используйте логин и пароль вашей организации. Доступ к потокам назначает администратор
          FDE.
        </p>
      )}

      {error && (
        <div
          role='alert'
          className='mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded'
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-4'>
        <Input
          label='Логин'
          name='login'
          autoComplete='username'
          disabled={isLoading}
          value={formData.login}
          onChange={handleChange}
          required
          placeholder='Введите ваш логин'
        />

        <PasswordInput
          label='Пароль'
          name='password'
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          disabled={isLoading}
          value={formData.password}
          onChange={handleChange}
          required
          placeholder='Введите ваш пароль'
        />

        <button
          type='submit'
          disabled={isLoading}
          className='w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
        >
          {isLoading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
        </button>
      </form>
    </div>
  );
};
