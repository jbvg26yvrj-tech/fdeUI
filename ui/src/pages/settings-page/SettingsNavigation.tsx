import { NavLink } from 'react-router-dom';
export function SettingsNavigation() {
  return (
    <nav aria-label='Разделы настроек' className='monitor-settings-nav'>
      <NavLink to='/settings/access'>Доступ</NavLink>
      <NavLink to='/settings/ldap'>LDAP</NavLink>
      <NavLink to='/settings/loki'>Loki</NavLink>
      <NavLink to='/settings/information'>Информация о системе</NavLink>
    </nav>
  );
}
