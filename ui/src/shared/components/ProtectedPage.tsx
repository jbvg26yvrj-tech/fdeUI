// shared/components/ProtectedPage/ProtectedPage.tsx
import { useMemo, type ReactNode } from 'react';
import { useUserContext } from '../hooks/useUserContext';

interface ProtectedPageProps {
  pages: string[];
  permissions: string[];
  children: ReactNode;
  pageName?: string;
  loadingMessage?: string;
}

const ProtectedPage = ({
  pages,
  permissions,
  children,
  pageName = 'этой странице',
  loadingMessage = 'Проверка прав доступа...',
}: ProtectedPageProps) => {
  const { isLoading: isLoadingContext, hasAnyPermission } = useUserContext({
    pages,
    autoLoad: true,
    refreshOnMount: true,
  });

  const hasAccess = useMemo(() => hasAnyPermission(permissions), [hasAnyPermission, permissions]);

  if (isLoadingContext) {
    return (
      <div className='flex justify-center items-center p-12'>
        <div className='text-lg text-gray-600'>{loadingMessage}</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className='flex flex-col items-center justify-center h-full p-12'>
        <div className='text-4xl font-bold text-gray-800 mb-4'>⛔</div>
        <h1 className='text-2xl font-bold text-gray-800 mb-2'>Доступ запрещен</h1>
        <p className='text-lg text-gray-600 text-center mb-6'>
          У вас нет доступа к {pageName}. Обратитесь к администратору для получения прав.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedPage;
