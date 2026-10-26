import { useLocation, useNavigate } from 'react-router-dom';
import { useUserContext } from '../../../shared/hooks/useUserContext';
import clsx from 'clsx';

interface NavigationItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  requiredPermissions?: string[];
  page?: string;
}

interface SidebarProps {
  collapsed?: boolean;
}

export const Sidebar = ({ collapsed = false }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems: NavigationItem[] = [
    {
      name: 'Пайплайны',
      path: '/pipelines',
      page: 'pipelines',
      requiredPermissions: ['page.pipelines'],
      icon: <PipelineIcon />,
    },
    {
      name: 'Сессии',
      path: '/sessions',
      page: 'sessions',
      requiredPermissions: ['page.sessions'],
      icon: <SessionIcon />,
    },
    {
      name: 'Права доступа',
      path: '/permissions',
      page: 'permissions',
      requiredPermissions: ['page.permissions'],
      icon: <PermissionsIcon />,
    },
  ];

  const pagesWithPermissions = navigationItems
    .filter(item => item.page)
    .map(item => item.page as string);

  const { isLoading: isLoadingContext, hasAnyPermission } = useUserContext({
    pages: pagesWithPermissions,
    autoLoad: true,
    refreshOnMount: true,
  });

  const hasAccess = (item: NavigationItem) => {
    if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
      return true;
    }
    if (isLoadingContext) {
      return false;
    }
    return hasAnyPermission(item.requiredPermissions);
  };

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const renderNavigationItems = () => {
    if (isLoadingContext) {
      return navigationItems.map(item => (
        <li key={item.path}>
          <button
            disabled
            className={clsx(
              'w-full flex items-center rounded-md text-sm font-medium text-gray-400 dark:text-gray-500 opacity-50 cursor-not-allowed',
              collapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2 space-x-3',
            )}
            title={collapsed ? item.name : undefined}
          >
            <span className='text-gray-400 dark:text-gray-500'>{item.icon}</span>
            {!collapsed && <span>{item.name}</span>}
          </button>
        </li>
      ));
    }

    return navigationItems
      .filter(item => hasAccess(item))
      .map(item => (
        <li key={item.path}>
          <button
            onClick={() => navigate(item.path)}
            className={clsx(
              'w-full flex items-center rounded-md text-sm font-medium transition-colors',
              collapsed
                ? 'justify-center px-2 py-2'
                : 'justify-start px-3 py-2 space-x-3 whitespace-nowrap overflow-hidden text-ellipsis', // Добавлены классы для предотвращения переноса текста
              isActive(item.path)
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border-r-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
            )}
            title={collapsed ? item.name : undefined}
          >
            <span
              className={
                isActive(item.path)
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 dark:text-gray-500'
              }
            >
              {item.icon}
            </span>
            {!collapsed && <span>{item.name}</span>}
          </button>
        </li>
      ));
  };

  return (
    <aside
      className={clsx(
        'bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700 flex-shrink-0 overflow-x-hidden transition-[width] duration-300', // overflow-x-hidden для скрытия горизонтального скролла
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <nav className='p-4'>
        <ul className='space-y-2'>{renderNavigationItems()}</ul>
      </nav>
    </aside>
  );
};

// Иконки (без изменений)
const PipelineIcon = () => (
  <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
    <circle cx='6' cy='12' r='2' stroke='currentColor' strokeWidth={2} fill='none' />
    <circle cx='18' cy='12' r='2' stroke='currentColor' strokeWidth={2} fill='none' />
    <path d='M8 12 L15 12' stroke='currentColor' strokeWidth={2} strokeLinecap='round' />
    <path
      d='M15 12 L16.5 10.5 M15 12 L16.5 13.5'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

const SessionIcon = () => (
  <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    />
  </svg>
);

const PermissionsIcon = () => (
  <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
    />
  </svg>
);
