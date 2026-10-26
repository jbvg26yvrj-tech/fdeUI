import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserDto } from '../features/auth/types/types';
import { userContextApi } from '../shared/api/userContextApi';
import { authApi } from '../features/auth/api/authApi';

interface AuthContextType {
  user: UserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: UserDto, token: string) => void;
  logout: () => void;
  retryApiCall: <T>(apiCall: () => Promise<T>, maxRetries?: number) => Promise<T>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Ключи для безопасного хранения
const TOKEN_KEY = 'accessToken';

// Функции для безопасной работы с хранилищем
const secureStorage = {
  setItem: (key: string, value: string): void => {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      throw new Error('Failed to save authentication data');
    }
  },

  getItem: (key: string): string | null => {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.error('Error reading from secure storage:', error);
      return null;
    }
  },

  removeItem: (key: string): void => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from secure storage:', error);
    }
  },

  clear: (): void => {
    try {
      // Очищаем только токен, userContext оставляем для быстрой загрузки
      sessionStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing secure storage:', error);
    }
  },
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const authVersion = useRef(0);

  // Функция для повторной попытки API вызовов
  const retryApiCall = async <T,>(apiCall: () => Promise<T>, maxRetries = 1): Promise<T> => {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error as Error;

        // Если это 401 и не последняя попытка, ждем немного перед повторной попыткой
        if (
          error instanceof Error &&
          'status' in error &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error as any).status === 401 &&
          attempt < maxRetries
        ) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }

        break;
      }
    }

    throw lastError!;
  };

  // Функция для проверки и установки состояния аутентификации
  const checkAuthState = async () => {
    const version = authVersion.current;
    const token = secureStorage.getItem(TOKEN_KEY);

    if (token) {
      try {
        // Cached permissions cannot establish the current token's identity.
        const context = await userContextApi.getUserContext();
        if (version !== authVersion.current) return;
        setUser(context.user);
        setIsAuthenticated(true);
      } catch (error) {
        if (version !== authVersion.current) return;
        console.error('Error parsing user context:', error);
        // При ошибке парсинга очищаем хранилище
        secureStorage.clear();
        userContextApi.clearCache();
        setUser(null);
        setIsAuthenticated(false);
      }
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  };

  // Обработчик события неудачного обновления токена
  const handleTokenRefreshFailed = () => {
    logout();
  };

  useEffect(() => {
    // Первоначальная проверка
    checkAuthState();

    // Слушаем события storage для синхронизации между вкладками
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY) {
        checkAuthState();
      }
    };

    // Слушаем событие неудачного обновления токена
    const handleTokenRefreshFailedEvent = () => {
      handleTokenRefreshFailed();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authTokenRefreshFailed', handleTokenRefreshFailedEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authTokenRefreshFailed', handleTokenRefreshFailedEvent);
    };
  }, []);

  const login = async (userData: UserDto, token: string) => {
    const version = ++authVersion.current;
    try {
      secureStorage.setItem(TOKEN_KEY, token);

      // Сразу устанавливаем пользователя из полученных данных
      setUser(userData);
      setIsAuthenticated(true);
      setIsLoading(false);

      // Очищаем кэш контекста при новом логине
      userContextApi.clearCache();

      // Загружаем полный контекст пользователя в фоне
      setTimeout(async () => {
        if (version !== authVersion.current) return;
        try {
          const context = await userContextApi.refreshContext();
          // Обновляем данные пользователя из контекста (на случай если есть различия)
          if (version === authVersion.current && context.user && context.user.id === userData.id) {
            setUser(context.user);
          }
        } catch (error) {
          console.error('Error loading user context after login:', error);
        }
      }, 100);

      // Если требуется смена пароля, устанавливаем флаг
      if (userData.authSource !== 'LDAP' && userData.passwordChangeRequired) {
        sessionStorage.setItem('requiresPasswordChange', 'true');
      } else {
        // Если не требуется, убедимся что флаг сброшен
        sessionStorage.removeItem('requiresPasswordChange');
      }

      // Триггерим событие для синхронизации других вкладок
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Failed to save authentication data');
    }
  };

  const logout = async () => {
    const version = ++authVersion.current;
    userContextApi.clearCache();
    // Вызываем серверный логаут для инвалидации httpOnly refresh cookie
    try {
      await authApi.logout();
    } catch {
      // Игнорируем ошибку серверного логаута — всё равно очищаем клиент
    }

    if (version !== authVersion.current) return;
    setIsLoading(false);
    try {
      secureStorage.clear();
      sessionStorage.removeItem('requiresPasswordChange');

      // Очищаем кэш контекста
      userContextApi.clearCache();

      setUser(null);
      setIsAuthenticated(false);

      // Триггерим событие для синхронизации других вкладок
      window.dispatchEvent(new Event('storage'));

      // Перенаправляем на страницу логина
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      setIsAuthenticated(false);
      sessionStorage.removeItem('requiresPasswordChange');
      navigate('/login');
    }
  };

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    retryApiCall,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
