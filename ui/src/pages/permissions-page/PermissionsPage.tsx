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
        <h1 className='text-2xl font-bold text-gray-800 dark:text-white'>
          Управление правами доступа
        </h1>
      </div>

      {/* Табы для навигации с адаптивными отступами и переносом текста */}
      <div className='border-b border-gray-200 dark:border-gray-700'>
        <nav className='-mb-px flex flex-wrap gap-2 sm:gap-4 md:gap-8'>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors whitespace-normal text-left
                ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Контент вкладок */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow'>
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
