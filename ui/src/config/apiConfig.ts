// Функция для получения базового URL API
export const getApiBaseUrl = (): string => {
  const { protocol, hostname, port } = window.location;

  // Получаем порт API из переменной окружения
  const apiPort = import.meta.env.VITE_API_BACKEND_PORT;

  // В dev режиме используем текущий хост и порт Vite (запросы проксируются через Vite)
  if (import.meta.env.DEV) {
    return `${protocol}//${hostname}:${port}`;
  }

  // Если порт API указан, используем его вместе с текущим протоколом и хостом
  if (apiPort) {
    return `${protocol}//${hostname}:${apiPort}`;
  }

  // В production добавляем base path (например /fde-api) чтобы запросы шли через Istio VirtualService
  const basePath = import.meta.env.BASE_URL.replace(/\/+$/, ''); // '/fde-api/' → '/fde-api'
  const origin = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`;
  return `${origin}${basePath}`;
};

// Префикс API — все запросы идут через /api/v1
export const API_PREFIX = '/api/v1';

// Полный URL для API запросов
export const getFullApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();

  // Если endpoint уже начинается с /api/v1, используем как есть
  if (endpoint.startsWith('/api/v1')) {
    return `${baseUrl}${endpoint}`;
  }

  // Если endpoint начинается с /api/ (старый формат), заменяем на /api/v1/
  if (endpoint.startsWith('/api/')) {
    const path = endpoint.substring('/api/'.length);
    return `${baseUrl}${API_PREFIX}/${path}`;
  }

  // Если endpoint начинается с /, добавляем префикс
  if (endpoint.startsWith('/')) {
    return `${baseUrl}${API_PREFIX}${endpoint}`;
  }

  // Иначе добавляем / и префикс
  return `${baseUrl}${API_PREFIX}/${endpoint}`;
};
