import { getApiBaseUrl } from '../../config/apiConfig';

// Утилиты для работы с клиентскими сертификатами
export const certificateUtils = {
  /**
   * Проверяет, установлен ли клиентский сертификат в браузере
   */
  async checkClientCertificateAvailability(): Promise<boolean> {
    try {
      // Эта проверка работает только если сервер запрашивает клиентский сертификат
      const testResponse = await fetch(`${getApiBaseUrl()}/api/auth/health`, {
        method: 'GET',
        credentials: 'include',
        mode: 'cors',
      });

      return testResponse.ok || testResponse.status === 401;
    } catch (error) {
      console.error('Client certificate check failed:', error);
      return false;
    }
  },

  /**
   * Показывает инструкцию по установке клиентского сертификата
   */
  showCertificateInstallInstructions(): void {
    const message = `
Для работы приложения необходимо установить клиентский сертификат:

1. Откройте Панель управления → Свойства браузера → Содержание → Сертификаты
2. Импортируйте файл *.crt в раздел "Личные"
3. Перезагрузите страницу

Или обратитесь к администратору для установки сертификата.
    `;

    alert(message);
  },

  /**
   * Проверяет, является ли ошибка связанной с сертификатом
   */
  isCertificateError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('certificate') ||
      errorMessage.includes('ssl') ||
      errorMessage.includes('tls') ||
      errorMessage.includes('handshake') ||
      errorMessage.includes('security')
    );
  },
};
