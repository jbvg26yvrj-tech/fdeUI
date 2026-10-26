import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { tokenService } from '../api/tokenService';

export const useAuthInitialization = () => {
  const { login } = useAuth();

  useEffect(() => {
    const initializeAuth = async () => {
      const token = tokenService.getToken();

      if (token) {
        try {
          // Можно добавить запрос к защищенному endpoint для проверки валидности токена
          // Если токен невалиден, он будет автоматически обновлен при следующем запросе
        } catch {
          // Токен невалиден, очищаем
          tokenService.clearTokens();
        }
      }
    };

    initializeAuth();
  }, [login]);
};
