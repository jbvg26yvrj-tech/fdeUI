import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../../features/auth/api/authApi';
import { useTheme } from '../../../context/ThemeContext';
import { ConfirmationModal } from '../../components/ConfirmationModal';

interface TopbarProps {
  onToggleSidebar: () => void;
}

export const Topbar = ({ onToggleSidebar }: TopbarProps) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      navigate('/login');
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <>
      <header className='bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 h-16 flex-shrink-0'>
        <div className='flex justify-between items-center px-6 h-full'>
          {/* Левая часть: кнопка сворачивания + логотип */}
          <div className='flex items-center space-x-3'>
            <button
              onClick={onToggleSidebar}
              className='p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
              aria-label='Toggle sidebar'
            >
              <svg
                className='w-6 h-6 text-gray-600 dark:text-gray-300'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M4 6h16M4 12h16M4 18h16'
                />
              </svg>
            </button>

            <div className='flex items-center space-x-2'>
              <div className='flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg'>
                <span className='text-white font-bold text-lg'>F</span>
              </div>
              <h1 className='text-xl font-bold text-gray-900 dark:text-white'>FDE</h1>
            </div>
          </div>

          {/* Правая часть: переключатель темы + пользователь */}
          <div className='flex items-center space-x-4'>
            <button
              onClick={toggleTheme}
              className='p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
              aria-label='Toggle theme'
            >
              {theme === 'light' ? (
                <svg
                  className='w-5 h-5 text-gray-600 dark:text-gray-300'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path d='M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z' />
                </svg>
              ) : (
                <svg
                  className='w-5 h-5 text-gray-600 dark:text-gray-300'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z'
                    clipRule='evenodd'
                  />
                </svg>
              )}
            </button>

            {isAuthenticated && user ? (
              <>
                <div className='flex items-center space-x-2'>
                  <div className='w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center'>
                    <span className='text-sm font-medium text-gray-700 dark:text-gray-200'>
                      {user.login.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className='text-sm font-medium text-gray-700 dark:text-gray-200'>
                    {user.login}
                  </span>
                </div>
                <button
                  onClick={handleLogoutClick}
                  className='bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors'
                >
                  Выйти
                </button>
              </>
            ) : (
              <button
                onClick={handleLogin}
                className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors'
              >
                Войти
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Модалка подтверждения выхода */}
      <ConfirmationModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title='Подтверждение выхода'
        message='Вы уверены, что хотите выйти из системы?'
        confirmText='Выйти'
        cancelText='Отмена'
        icon={
          <div className='mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30'>
            <svg
              className='h-5 w-5 text-yellow-600 dark:text-yellow-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={2}
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
              />
            </svg>
          </div>
        }
      />
    </>
  );
};
