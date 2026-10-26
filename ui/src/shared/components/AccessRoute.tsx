import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserContext } from '../hooks/useUserContext';
import { canAccessPath, landingPath } from '../lib/access';
import { useAuth } from '../../context/AuthContext';

export function AccessRoute({
  children,
  landing = false,
}: {
  children?: ReactNode;
  landing?: boolean;
}) {
  const { user: authenticatedUser } = useAuth();
  const { user: contextUser, permissions, roles, isLoading, error, refreshContext } = useUserContext();
  const location = useLocation();
  if (isLoading)
    return (
      <p role='status' className='p-8'>
        Проверка доступа…
      </p>
    );
  if (error)
    return (
      <div role='alert' className='p-8 space-y-4'>
        <p>Не удалось загрузить права доступа. Повторите попытку.</p>
        <button className='text-blue-600 underline' onClick={() => void refreshContext()}>
          Повторить
        </button>
      </div>
    );
  if (!authenticatedUser || contextUser?.id !== authenticatedUser.id) {
    return <p role='status' className='p-8'>Проверка доступа…</p>;
  }
  if (landing) {
    const pending = sessionStorage.getItem('pendingPipelineId');
    sessionStorage.removeItem('pendingPipelineId');
    const destination =
      pending && /^[a-f\d-]{36}$/i.test(pending) && canAccessPath('/pipelines', permissions, roles)
        ? `/pipelines/${pending}`
        : landingPath(permissions, roles);
    return <Navigate to={destination} replace />;
  }
  return canAccessPath(location.pathname, permissions, roles) ? (
    <>{children}</>
  ) : (
    <Navigate to='/about' replace />
  );
}
