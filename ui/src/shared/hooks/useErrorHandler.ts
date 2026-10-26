import { useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isApiError } from '../api/ApiError';
import { certificateUtils } from '../utils/certificateUtils';
import { getApiBaseUrl } from '../../config/apiConfig';

interface UseErrorHandlerOptions {
  showNotification?: (message: string, type?: 'error' | 'warning' | 'info') => void;
}

export const useErrorHandler = (options: UseErrorHandlerOptions = {}) => {
  const { showNotification } = options;
  const { logout } = useAuth();

  const handleError = useCallback(
    (error: unknown, fallbackMessage?: string) => {
      let message = fallbackMessage || 'An unexpected error occurred';
      const shouldLog = true;
      let shouldLogout = false;
      let showCertificateInstructions = false;

      if (isApiError(error)) {
        message = error.message;

        // Специфичная обработка для ошибок сети и сертификатов
        if (error.code === 'NETWORK_ERROR') {
          message = `Ошибка сетевого соединения. Проверьте, запущен ли сервер на ${getApiBaseUrl()}`;
        } else if (error.status === 0) {
          message =
            'Не удалось подключиться к серверу. Возможно, проблема с сертификатами безопасности.';
          showCertificateInstructions = true;
        } else {
          switch (error.status) {
            case 401:
              message = error.message || 'Требуется аутентификация. Пожалуйста, войдите снова.';
              shouldLogout = true;
              break;
            case 403:
              message = error.message || 'У вас недостаточно прав для выполнения этого действия.';
              break;
            case 404:
              message = 'Запрашиваемый ресурс не найден.';
              break;
            case 500:
              message = 'Ошибка сервера. Пожалуйста, попробуйте позже.';
              break;
            default:
              break;
          }
        }
      } else if (error instanceof Error) {
        message = error.message;

        // Обработка специфичных ошибок браузера
        if (
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('ERR_CONNECTION_RESET')
        ) {
          message = `Ошибка сети. Проверьте подключение к серверу ${getApiBaseUrl()}`;
          showCertificateInstructions = true;
        }

        // Проверка ошибок сертификатов
        if (certificateUtils.isCertificateError(error)) {
          message =
            'Проблема с сертификатами безопасности. Убедитесь, что клиентский сертификат установлен правильно.';
          showCertificateInstructions = true;
        }
      } else if (typeof error === 'string') {
        message = error;
      }

      if (showNotification) {
        showNotification(message, 'error');
      }

      if (shouldLog) {
        console.error('Handled error:', error);
      }

      if (showCertificateInstructions) {
        // Показываем инструкции только один раз, чтобы не спамить пользователя
        setTimeout(() => {
          certificateUtils.showCertificateInstallInstructions();
        }, 1000);
      }

      if (shouldLogout) {
        logout();
      }

      return message;
    },
    [showNotification, logout],
  );

  return {
    handleError,
    isApiError,
  };
};
