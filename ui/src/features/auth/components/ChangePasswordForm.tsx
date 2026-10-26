import { useState } from 'react';
import { Input, PasswordInput } from '../../../shared/ui/Input';
import type { ChangePasswordRequest } from '../types/types';
import { toast } from 'sonner';

interface ChangePasswordFormProps {
  onSubmit: (login: string, data: ChangePasswordRequest) => void;
  isLoading: boolean;
  error?: string | null;
  currentUserLogin?: string;
}

export const ChangePasswordForm = ({
  onSubmit,
  isLoading,
  error,
  currentUserLogin,
}: ChangePasswordFormProps) => {
  const [formData, setFormData] = useState<{ login: string } & ChangePasswordRequest>({
    login: currentUserLogin || '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmNewPassword) {
      toast('Новый пароль и подтверждение не совпадают');
      return;
    }

    if (formData.newPassword.length < 6) {
      toast('Пароль должен содержать минимум 6 символов');
      return;
    }

    const { login, ...passwords } = formData;
    onSubmit(login, passwords);
  };

  return (
    <div className='max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden p-6'>
      <h2 className='text-2xl font-bold mb-6 text-gray-800 dark:text-white'>Смена пароля</h2>

      {error && (
        <div className='mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded'>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-4'>
        {!currentUserLogin && (
          <Input
            label='Логин'
            name='login'
            value={formData.login}
            onChange={handleChange}
            required
            placeholder='Введите ваш логин'
          />
        )}

        <PasswordInput
          label='Текущий пароль'
          name='currentPassword'
          value={formData.currentPassword}
          onChange={handleChange}
          required
          placeholder='Введите текущий пароль'
        />

        <PasswordInput
          label='Новый пароль'
          name='newPassword'
          value={formData.newPassword}
          onChange={handleChange}
          required
          placeholder='Введите новый пароль'
        />

        <PasswordInput
          label='Подтверждение пароля'
          name='confirmNewPassword'
          value={formData.confirmNewPassword}
          onChange={handleChange}
          required
          placeholder='Повторите новый пароль'
        />

        {/* Индикаторы (оставляем как есть) */}
        {formData.newPassword && formData.confirmNewPassword && (
          <div
            className={`text-sm p-2 rounded ${
              formData.newPassword === formData.confirmNewPassword
                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}
          >
            {formData.newPassword === formData.confirmNewPassword
              ? 'Подтверждение совпадает'
              : 'Пароли не совпадают'}
          </div>
        )}

        {formData.newPassword && (
          <div
            className={`text-sm p-2 rounded ${
              formData.newPassword.length >= 6
                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}
          >
            {formData.newPassword.length >= 6
              ? `Длина: ${formData.newPassword.length} символов`
              : `Минимум 6 символов (сейчас ${formData.newPassword.length})`}
          </div>
        )}

        {formData.newPassword && (
          <div
            className={`text-sm p-2 rounded ${
              formData.newPassword !== formData.currentPassword
                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}
          >
            {formData.newPassword !== formData.currentPassword
              ? 'Новый пароль отличается от текущего'
              : 'Новый пароль не должен совпадать с текущим'}
          </div>
        )}

        <button
          type='submit'
          disabled={
            isLoading ||
            formData.newPassword !== formData.confirmNewPassword ||
            formData.newPassword.length < 6 ||
            formData.newPassword === formData.currentPassword
          }
          className='w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
        >
          {isLoading ? 'Смена пароля...' : 'Сменить пароль'}
        </button>
      </form>
    </div>
  );
};
