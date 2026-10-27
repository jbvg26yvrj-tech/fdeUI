import { NavLink } from 'react-router-dom';
import { useUserContext } from '../../../shared/hooks/useUserContext';
import clsx from 'clsx';

interface NavigationItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  requiredPermissions?: string[];
  page?: string;
  adminOnly?: boolean;
}

interface SidebarProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export const Sidebar = ({ collapsed = false, onNavigate }: SidebarProps) => {
  const navigationItems: NavigationItem[] = [
    { name: 'О системе', path: '/about', icon: <PipelineIcon /> },
    {
      name: 'Настройки',
      path: '/settings/ldap',
      adminOnly: true,
      icon: <PermissionsIcon />,
    },
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
    { name: 'Аналитика', path: '/analytics', page: 'analytics', requiredPermissions: ['page.analytics'], icon: <PipelineIcon /> },
    { name: 'Логи', adminOnly: true, path: '/logs', page: 'logs', requiredPermissions: ['page.logs'], icon: <SessionIcon /> },
    {
      name: 'Права доступа',
      adminOnly: true,
      path: '/permissions',
      page: 'permissions',
      requiredPermissions: ['page.permissions'],
      icon: <PermissionsIcon />,
    },
  ];

  const pagesWithPermissions = navigationItems
    .filter((item) => item.page)
    .map((item) => item.page as string);

  const {
    isLoading: isLoadingContext,
    hasAnyPermission,
    roles,
  } = useUserContext({
    pages: pagesWithPermissions,
    autoLoad: true,
    refreshOnMount: true,
  });

  const hasAccess = (item: NavigationItem) => {
    if (item.adminOnly) return !isLoadingContext && roles.includes('ADMIN');
    if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
      return true;
    }
    if (isLoadingContext) {
      return false;
    }
    return (
      roles.includes('ADMIN') || hasAnyPermission(item.requiredPermissions)
    );
  };

  const visibleItems = navigationItems.filter(hasAccess);
  const groups = [
    { label: 'Работа', paths: ['/pipelines', '/sessions', '/analytics', '/logs'] },
    { label: 'Администрирование', paths: ['/permissions', '/settings/ldap'] },
    { label: 'Информация', paths: ['/about'] },
  ];

  return (
    <aside
      className={clsx('fde-sidebar', collapsed && 'fde-sidebar-collapsed')}
    >
      <nav aria-label='Основная навигация'>
        {groups.map((group) => {
          const items = group.paths.flatMap((path) =>
            visibleItems.filter((item) => item.path === path),
          );
          if (!items.length) return null;
          return (
            <div className='fde-nav-group' key={group.label}>
              {!collapsed && group.label !== 'Информация' && (
                <p className='fde-nav-label'>{group.label}</p>
              )}
              <ul>
                {items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={onNavigate}
                      aria-label={item.name}
                      title={collapsed ? item.name : undefined}
                      className={({ isActive }) =>
                        clsx('fde-nav-link', isActive && 'fde-nav-active')
                      }
                    >
                      <span className='fde-nav-icon' aria-hidden='true'>
                        {item.icon}
                      </span>
                      {!collapsed && <span>{item.name}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {isLoadingContext && (
          <span className='sr-only' role='status'>
            Загрузка доступных разделов
          </span>
        )}
      </nav>
    </aside>
  );
};

// Иконки (без изменений)
const PipelineIcon = () => (
  <svg
    className='w-5 h-5'
    fill='none'
    viewBox='0 0 24 24'
    stroke='currentColor'
  >
    <circle
      cx='6'
      cy='12'
      r='2'
      stroke='currentColor'
      strokeWidth={2}
      fill='none'
    />
    <circle
      cx='18'
      cy='12'
      r='2'
      stroke='currentColor'
      strokeWidth={2}
      fill='none'
    />
    <path
      d='M8 12 L15 12'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
    />
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
  <svg
    className='w-5 h-5'
    fill='none'
    viewBox='0 0 24 24'
    stroke='currentColor'
  >
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    />
  </svg>
);

const PermissionsIcon = () => (
  <svg
    className='w-5 h-5'
    fill='none'
    viewBox='0 0 24 24'
    stroke='currentColor'
  >
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
    />
  </svg>
);
