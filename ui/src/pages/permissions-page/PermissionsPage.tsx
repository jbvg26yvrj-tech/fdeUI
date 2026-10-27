import { useState } from 'react';
import { RolesTable } from '../../features/permissions/components/RolesTable';
import { ResourcesTable } from './components/ResourcesTable';
import { RoleResourcesTable } from './components/RoleResourcesTable';
import { RoleUsersTable } from './components/RoleUsersTable';
import { RoleRlsTable } from '../../features/permissions/components/RoleRlsTable';
import UsersTable from '../../features/auth/components/UsersTable';

type Section = 'users' | 'roles' | 'resources' | 'role-resources' | 'role-users' | 'role-rls';
const sections: { id: Section; label: string; help: string }[] = [
  {
    id: 'users',
    label: 'Пользователи',
    help: 'Создавайте учётные записи и управляйте пользователями системы.',
  },
  {
    id: 'roles',
    label: 'Роли',
    help: 'Укажите в роли коды клиентов. Они определяют, какие данные сможет просматривать пользователь.',
  },
  {
    id: 'role-users',
    label: 'Назначение ролей',
    help: 'Назначайте роли пользователям. Коды клиентов из всех ролей пользователя объединяются.',
  },
  {
    id: 'resources',
    label: 'Ресурсы',
    help: 'Справочник ресурсов для совместимости со старой моделью прав. Разрешения ресурсов не дают права изменения данных.',
  },
  {
    id: 'role-resources',
    label: 'Ресурсы ролей',
    help: 'Связи ролей с ресурсами старой модели прав. Изменения и запуск доступны только ADMIN.',
  },
  {
    id: 'role-rls',
    label: 'Ограничения RLS',
    help: 'RLS — необязательные дополнительные ограничения видимых данных. Они сужают доступ, уже заданный кодами клиентов в ролях, и не открывают доступ к другим клиентам.',
  },
];

const PermissionsPage = () => {
  const [activeTab, setActiveTab] = useState<Section>('users');
  const active = sections.find(section => section.id === activeTab)!;
  const renderNavigation = (items: typeof sections, label: string) => (
    <nav className='fde-permission-nav' aria-label={label}>
      {items.map(section => (
        <button
          key={section.id}
          onClick={() => setActiveTab(section.id)}
          aria-current={activeTab === section.id ? 'page' : undefined}
          aria-controls='permission-content'
        >
          {section.label}
        </button>
      ))}
    </nav>
  );

  return (
    <div className='fde-permissions space-y-5'>
      <h1 className='fde-page-title'>Права доступа</h1>
      <div className='fde-access-overview'>
        <p>Создайте пользователя, настройте роль с кодами клиентов и назначьте её пользователю.</p>
        <details className='fde-access-help'>
          <summary>Как определяется доступ</summary>
          <ul>
            <li>Клиентские роли дают просмотр пайплайнов, сессий, аналитики и расписаний.</li>
            <li>
              Код клиента должен точно совпадать с источником или получателем. Коды всех ролей
              пользователя объединяются.
            </li>
            <li>
              Без кодов доступна только информация о системе. Изменения и запуск доступны только
              ADMIN.
            </li>
            <li>RLS при необходимости дополнительно сужает доступ к данным.</li>
          </ul>
        </details>
      </div>
      {renderNavigation(sections.slice(0, 3), 'Основное управление доступом')}
      <details className='fde-permission-advanced'>
        <summary>Дополнительные настройки</summary>
        <p>Справочники старой модели прав и необязательные ограничения данных.</p>
        {renderNavigation(sections.slice(3), 'Дополнительное управление доступом')}
      </details>
      <section id='permission-content' aria-label={active.label} className='min-w-0'>
        <div className='fde-permission-description'>
          <h2>{active.label}</h2>
          <p>{active.help}</p>
        </div>
        {activeTab === 'users' && <UsersTable />}
        {activeTab === 'roles' && <RolesTable />}
        {activeTab === 'role-users' && <RoleUsersTable />}
        {activeTab === 'role-resources' && <RoleResourcesTable />}
        {activeTab === 'role-rls' && <RoleRlsTable />}
        {activeTab === 'resources' && <ResourcesTable />}
      </section>
    </div>
  );
};

export default PermissionsPage;
