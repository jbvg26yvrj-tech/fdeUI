import { useState } from 'react';
import { Input, PasswordInput } from '../../../shared/ui/Input';
import type { RegistrationRequestDto } from '../types/types';

interface RegistrationFormProps {
  onSubmit: (data: RegistrationRequestDto) => void;
  isLoading: boolean;
  error?: string | null;
}

export const RegistrationForm = ({ onSubmit, isLoading, error }: RegistrationFormProps) => {
  const [formData, setFormData] = useState<RegistrationRequestDto>({
    login: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className='max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden p-6'>
      <h2 className='text-2xl font-bold mb-6 text-gray-800 dark:text-white'>Регистрация</h2>

      {error && (
        <div className='mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded'>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-4'>
        <Input
          label='Логин'
          name='login'
          value={formData.login}
          onChange={handleChange}
          required
          placeholder='Введите ваш логин'
        />

        <PasswordInput
          label='Пароль'
          name='password'
          value={formData.password}
          onChange={handleChange}
          required
          placeholder='Введите пароль'
        />

        <PasswordInput
          label='Подтверждение пароля'
          name='confirmPassword'
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          placeholder='Повторите пароль'
        />

        <button
          type='submit'
          disabled={isLoading}
          className='w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
        >
          Зарегистрироваться
        </button>
      </form>
    </div>
  );
};
