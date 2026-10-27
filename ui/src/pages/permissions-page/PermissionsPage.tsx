import { useState } from 'react';
import { RolesTable } from '../../features/permissions/components/RolesTable';
import { ResourcesTable } from './components/ResourcesTable';
import { RoleResourcesTable } from './components/RoleResourcesTable';
import { RoleUsersTable } from './components/RoleUsersTable';
import { RoleRlsTable } from '../../features/permissions/components/RoleRlsTable';
import UsersTable from '../../features/auth/components/UsersTable';

const PermissionsPage = () => {
  const [activeTab, setActiveTab] = useState<
    'users' | 'roles' | 'resources' | 'role-resources' | 'role-users' | 'role-rls'
  >('users');

  const tabs = [
    { id: 'users', label: 'Пользователи' },
    { id: 'roles', label: 'Роли' },
    { id: 'resources', label: 'Ресурсы' },
    { id: 'role-users', label: 'Роли и пользователи' },
    { id: 'role-resources', label: 'Роли и ресурсы' },
    { id: 'role-rls', label: 'Роли и RLS' },
  ];

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h1 className='fde-page-title'>Управление правами доступа</h1>
      </div>

      {/* Табы для навигации с адаптивными отступами и переносом текста */}
      <div>
        <nav className='fde-permission-nav' aria-label='Разделы управления доступом'>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Контент вкладок */}
      <div className='min-w-0'>
        {activeTab === 'users' && <UsersTable />}
        {activeTab === 'roles' && <RolesTable />}
        {activeTab === 'role-users' && <RoleUsersTable />}
        {activeTab === 'role-resources' && <RoleResourcesTable />}
        {activeTab === 'role-rls' && <RoleRlsTable />}
        {activeTab === 'resources' && <ResourcesTable />}
      </div>
    </div>
  );
};

export default PermissionsPage;
